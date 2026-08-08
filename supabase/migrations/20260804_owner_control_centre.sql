-- LeadPilot AI Owner Control Centre, project assignment and LeadPilot Verified.
-- Review before applying. This migration preserves existing users, owners,
-- opportunities, freelancer profiles, conversations, plans and subscriptions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS managed_client_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.opportunities
SET client_user_id = owner_id
WHERE client_user_id IS NULL AND managed_client_name IS NULL;
UPDATE public.opportunities
SET created_by = owner_id
WHERE created_by IS NULL;

-- Replace only the opportunity status check. Existing rows are translated to
-- the equivalent managed-workflow state without deleting project data.
DO $$
DECLARE v_constraint RECORD;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.opportunities'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.opportunities DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END $$;

UPDATE public.opportunities SET status = 'awaiting_assignment' WHERE status = 'open';
UPDATE public.opportunities SET status = 'changes_requested' WHERE status = 'paused';
UPDATE public.opportunities SET status = 'completed' WHERE status = 'closed';

ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_status_check CHECK (status IN (
    'pending_review','changes_requested','approved','awaiting_assignment',
    'assigned','in_progress','ready_for_review','revision_requested',
    'completed','rejected','cancelled'
  ));

CREATE TABLE IF NOT EXISTS public.opportunity_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN (
    'offered','accepted','in_progress','ready_for_review','revision_requested',
    'completed','cancelled'
  )),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ready_for_review_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (freelancer_id <> assigned_by)
);

CREATE TABLE IF NOT EXISTS public.opportunity_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL DEFAULT '' CHECK (char_length(reason) <= 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opportunity_owner_notes (
  opportunity_id UUID PRIMARY KEY REFERENCES public.opportunities(id) ON DELETE CASCADE,
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 5000),
  updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunity_conversations
  ALTER COLUMN application_id DROP NOT NULL;
ALTER TABLE public.opportunity_conversations
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.opportunity_assignments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.opportunity_conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.opportunity_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_role TEXT NOT NULL CHECK (participant_role IN ('client','freelancer','owner')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(conversation_id,user_id)
);

INSERT INTO public.opportunity_conversation_participants(conversation_id,user_id,participant_role)
SELECT id,job_poster_id,'client' FROM public.opportunity_conversations
ON CONFLICT(conversation_id,user_id) DO NOTHING;
INSERT INTO public.opportunity_conversation_participants(conversation_id,user_id,participant_role)
SELECT id,freelancer_id,'freelancer' FROM public.opportunity_conversations
ON CONFLICT(conversation_id,user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.verification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_name TEXT NOT NULL CHECK (char_length(professional_name) BETWEEN 2 AND 160),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 20 AND 3000),
  professional_category TEXT NOT NULL CHECK (char_length(professional_category) BETWEEN 2 AND 120),
  years_experience INTEGER NOT NULL CHECK (years_experience BETWEEN 0 AND 80),
  main_skills TEXT[] NOT NULL DEFAULT '{}',
  portfolio_links TEXT[] NOT NULL DEFAULT '{}',
  professional_links TEXT[] NOT NULL DEFAULT '{}',
  document_references TEXT[] NOT NULL DEFAULT '{}',
  additional_information TEXT NOT NULL DEFAULT '' CHECK (char_length(additional_information) <= 5000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','under_review','changes_requested','approved','rejected','revoked'
  )),
  change_request_reason TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  moderator_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_verifications (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL DEFAULT 'leadpilot_verified' CHECK (verification_type = 'leadpilot_verified'),
  status TEXT NOT NULL CHECK (status IN ('approved','revoked')),
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preserve manually reviewed legacy badges without trusting a client-visible
-- profile field for future decisions.
INSERT INTO public.user_verifications(user_id,verification_type,status,verified_by,verified_at)
SELECT user_id,'leadpilot_verified','approved',verified_by,COALESCE(verified_at,now())
FROM public.freelancer_profiles
WHERE verification_status='verified'
ON CONFLICT(user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.verification_applications(id) ON DELETE SET NULL,
  -- Applicant-created submission events intentionally have no moderator.
  -- Decision events always receive the authenticated moderator in the API.
  moderator_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN (
    'submitted','under_review','changes_requested','approved','rejected',
    'revoked','restored','resubmitted'
  )),
  reason TEXT NOT NULL DEFAULT '' CHECK (char_length(reason) <= 3000),
  private_notes TEXT NOT NULL DEFAULT '' CHECK (char_length(private_notes) <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS opportunity_assignments_one_active_idx
  ON public.opportunity_assignments(opportunity_id)
  WHERE status IN ('offered','accepted','in_progress','ready_for_review','revision_requested');
CREATE INDEX IF NOT EXISTS opportunity_assignments_status_idx ON public.opportunity_assignments(status,created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_assignments_freelancer_idx ON public.opportunity_assignments(freelancer_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_status_events_job_idx ON public.opportunity_status_events(opportunity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_participants_user_idx ON public.opportunity_conversation_participants(user_id,left_at,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS opportunity_conversations_assignment_idx ON public.opportunity_conversations(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS verification_applications_one_active_idx
  ON public.verification_applications(user_id)
  WHERE status IN ('pending','under_review','changes_requested');
CREATE INDEX IF NOT EXISTS verification_applications_status_idx ON public.verification_applications(status,created_at DESC);
CREATE INDEX IF NOT EXISTS verification_applications_user_idx ON public.verification_applications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS user_verifications_status_idx ON public.user_verifications(status,updated_at DESC);
CREATE INDEX IF NOT EXISTS verification_events_user_idx ON public.verification_events(user_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.is_control_centre_member(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.app_admins
    WHERE user_id=p_user_id AND role IN ('owner','admin','moderator')
  );
$$;
CREATE OR REPLACE FUNCTION public.is_owner_or_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.app_admins
    WHERE user_id=p_user_id AND role IN ('owner','admin')
  );
$$;
CREATE OR REPLACE FUNCTION public.is_leadpilot_verified(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p_user_id IS NOT NULL AND (
    EXISTS(SELECT 1 FROM public.app_admins WHERE user_id=p_user_id AND role='owner')
    OR (
      NOT EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_user_id AND COALESCE(is_suspended,false))
      AND EXISTS(SELECT 1 FROM public.user_verifications WHERE user_id=p_user_id AND status='approved')
    )
  );
$$;
CREATE OR REPLACE FUNCTION public.is_opportunity_conversation_participant(p_conversation_id UUID,p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.opportunity_conversation_participants
    WHERE conversation_id=p_conversation_id AND user_id=p_user_id AND left_at IS NULL
  );
$$;
CREATE OR REPLACE FUNCTION public.is_managed_opportunity_client(p_opportunity_id UUID,p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.opportunities
    WHERE id=p_opportunity_id AND p_user_id IN (owner_id,client_user_id)
  );
$$;
CREATE OR REPLACE FUNCTION public.is_assigned_opportunity_freelancer(p_opportunity_id UUID,p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.opportunity_assignments
    WHERE opportunity_id=p_opportunity_id AND freelancer_id=p_user_id
      AND status<>'cancelled'
  );
$$;
REVOKE ALL ON FUNCTION public.is_control_centre_member(UUID),public.is_owner_or_admin(UUID),public.is_leadpilot_verified(UUID),public.is_opportunity_conversation_participant(UUID,UUID),public.is_managed_opportunity_client(UUID,UUID),public.is_assigned_opportunity_freelancer(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_control_centre_member(UUID),public.is_owner_or_admin(UUID),public.is_leadpilot_verified(UUID),public.is_opportunity_conversation_participant(UUID,UUID),public.is_managed_opportunity_client(UUID,UUID),public.is_assigned_opportunity_freelancer(UUID,UUID) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.validate_managed_opportunity_transition()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status='pending_review' AND NEW.status IN ('changes_requested','approved','rejected','cancelled')) OR
    (OLD.status='changes_requested' AND NEW.status IN ('pending_review','rejected','cancelled')) OR
    (OLD.status='approved' AND NEW.status IN ('awaiting_assignment','assigned','rejected','cancelled')) OR
    (OLD.status='awaiting_assignment' AND NEW.status IN ('assigned','cancelled')) OR
    (OLD.status='assigned' AND NEW.status IN ('in_progress','awaiting_assignment','cancelled')) OR
    (OLD.status='in_progress' AND NEW.status IN ('ready_for_review','revision_requested','awaiting_assignment','cancelled')) OR
    (OLD.status='ready_for_review' AND NEW.status IN ('revision_requested','completed','awaiting_assignment','cancelled')) OR
    (OLD.status='revision_requested' AND NEW.status IN ('in_progress','ready_for_review','awaiting_assignment','cancelled'))
  ) THEN RAISE EXCEPTION 'INVALID_OPPORTUNITY_STATUS_TRANSITION'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_managed_opportunity_transition ON public.opportunities;
CREATE TRIGGER validate_managed_opportunity_transition BEFORE UPDATE OF status ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.validate_managed_opportunity_transition();

CREATE OR REPLACE FUNCTION public.set_owner_control_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS opportunity_assignments_updated_at ON public.opportunity_assignments;
CREATE TRIGGER opportunity_assignments_updated_at BEFORE UPDATE ON public.opportunity_assignments FOR EACH ROW EXECUTE FUNCTION public.set_owner_control_updated_at();
DROP TRIGGER IF EXISTS opportunity_owner_notes_updated_at ON public.opportunity_owner_notes;
CREATE TRIGGER opportunity_owner_notes_updated_at BEFORE UPDATE ON public.opportunity_owner_notes FOR EACH ROW EXECUTE FUNCTION public.set_owner_control_updated_at();
DROP TRIGGER IF EXISTS verification_applications_updated_at ON public.verification_applications;
CREATE TRIGGER verification_applications_updated_at BEFORE UPDATE ON public.verification_applications FOR EACH ROW EXECUTE FUNCTION public.set_owner_control_updated_at();
DROP TRIGGER IF EXISTS user_verifications_updated_at ON public.user_verifications;
CREATE TRIGGER user_verifications_updated_at BEFORE UPDATE ON public.user_verifications FOR EACH ROW EXECUTE FUNCTION public.set_owner_control_updated_at();

CREATE OR REPLACE FUNCTION public.assign_opportunity_worker(p_opportunity_id UUID,p_freelancer_id UUID,p_actor_id UUID)
RETURNS TABLE(assignment_id UUID,conversation_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_opportunity public.opportunities%ROWTYPE; v_assignment UUID; v_conversation UUID; v_client UUID; v_previous TEXT;
BEGIN
  IF auth.role()<>'service_role' OR NOT public.is_owner_or_admin(p_actor_id) THEN RAISE EXCEPTION 'UNAUTHORIZED_ASSIGNMENT'; END IF;
  SELECT * INTO v_opportunity FROM public.opportunities WHERE id=p_opportunity_id FOR UPDATE;
  IF v_opportunity.id IS NULL OR v_opportunity.status NOT IN ('approved','awaiting_assignment') THEN RAISE EXCEPTION 'OPPORTUNITY_NOT_ASSIGNABLE'; END IF;
  v_client := COALESCE(v_opportunity.client_user_id,v_opportunity.owner_id);
  IF p_freelancer_id IN (p_actor_id,v_client) THEN RAISE EXCEPTION 'INVALID_FREELANCER'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.freelancer_profiles WHERE user_id=p_freelancer_id) THEN RAISE EXCEPTION 'FREELANCER_PROFILE_REQUIRED'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_profiles WHERE id=p_freelancer_id AND COALESCE(is_suspended,false)) THEN RAISE EXCEPTION 'FREELANCER_SUSPENDED'; END IF;
  INSERT INTO public.opportunity_assignments(opportunity_id,freelancer_id,assigned_by)
  VALUES(p_opportunity_id,p_freelancer_id,p_actor_id) RETURNING id INTO v_assignment;
  INSERT INTO public.opportunity_conversations(opportunity_id,application_id,assignment_id,job_poster_id,freelancer_id,status)
  VALUES(p_opportunity_id,NULL,v_assignment,v_client,p_freelancer_id,'active') RETURNING id INTO v_conversation;
  INSERT INTO public.opportunity_conversation_participants(conversation_id,user_id,participant_role)
  VALUES(v_conversation,v_client,CASE WHEN v_client=p_actor_id THEN 'owner' ELSE 'client' END),
        (v_conversation,p_freelancer_id,'freelancer')
  ON CONFLICT(conversation_id,user_id) DO UPDATE SET left_at=NULL,participant_role=EXCLUDED.participant_role;
  IF p_actor_id<>v_client THEN
    INSERT INTO public.opportunity_conversation_participants(conversation_id,user_id,participant_role)
    VALUES(v_conversation,p_actor_id,'owner')
    ON CONFLICT(conversation_id,user_id) DO UPDATE SET left_at=NULL,participant_role='owner';
  END IF;
  v_previous := v_opportunity.status;
  UPDATE public.opportunities SET status='assigned' WHERE id=p_opportunity_id;
  INSERT INTO public.opportunity_status_events(opportunity_id,previous_status,new_status,changed_by,reason)
  VALUES(p_opportunity_id,v_previous,'assigned',p_actor_id,'Freelancer assigned');
  RETURN QUERY SELECT v_assignment,v_conversation;
END $$;
REVOKE ALL ON FUNCTION public.assign_opportunity_worker(UUID,UUID,UUID) FROM PUBLIC,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_opportunity_worker(UUID,UUID,UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_freelancer_verification_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.freelancer_profiles
  SET verification_status=CASE WHEN NEW.status='approved' THEN 'verified' ELSE 'not_verified' END,
      verified_at=CASE WHEN NEW.status='approved' THEN NEW.verified_at ELSE NULL END,
      verified_by=CASE WHEN NEW.status='approved' THEN NEW.verified_by ELSE NULL END
  WHERE user_id=NEW.user_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_freelancer_verification_status ON public.user_verifications;
CREATE TRIGGER sync_freelancer_verification_status AFTER INSERT OR UPDATE OF status ON public.user_verifications FOR EACH ROW EXECUTE FUNCTION public.sync_freelancer_verification_status();

ALTER TABLE public.opportunity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_owner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managed opportunities visibility" ON public.opportunities;
DROP POLICY IF EXISTS "Visible opportunities" ON public.opportunities;
CREATE POLICY "Managed opportunities visibility" ON public.opportunities FOR SELECT TO authenticated USING(
  status IN ('approved','awaiting_assignment') OR owner_id=auth.uid() OR client_user_id=auth.uid()
  OR public.is_control_centre_member()
  OR public.is_assigned_opportunity_freelancer(id)
  OR public.has_opportunity_application(id)
);
DROP POLICY IF EXISTS "Freelancers insert applications" ON public.opportunity_applications;
CREATE POLICY "Freelancers insert applications" ON public.opportunity_applications FOR INSERT TO authenticated WITH CHECK(
  applicant_id=auth.uid()
  AND EXISTS(SELECT 1 FROM public.freelancer_profiles p WHERE p.user_id=auth.uid())
  AND EXISTS(SELECT 1 FROM public.opportunities o WHERE o.id=opportunity_id AND o.owner_id<>auth.uid() AND o.status IN ('approved','awaiting_assignment') AND (o.application_deadline IS NULL OR o.application_deadline>now()))
);

DROP POLICY IF EXISTS "Participants only conversations" ON public.opportunity_conversations;
DROP POLICY IF EXISTS "Conversation participants read" ON public.opportunity_conversations;
CREATE POLICY "Participants only conversations" ON public.opportunity_conversations FOR SELECT TO authenticated USING(public.is_opportunity_conversation_participant(id));
DROP POLICY IF EXISTS "Participants only messages" ON public.opportunity_messages;
DROP POLICY IF EXISTS "Message participants read" ON public.opportunity_messages;
CREATE POLICY "Participants only messages" ON public.opportunity_messages FOR SELECT TO authenticated USING(public.is_opportunity_conversation_participant(conversation_id));
DROP POLICY IF EXISTS "Participants send own project messages" ON public.opportunity_messages;
DROP POLICY IF EXISTS "Participants insert own messages" ON public.opportunity_messages;
CREATE POLICY "Participants send own project messages" ON public.opportunity_messages FOR INSERT TO authenticated WITH CHECK(
  sender_id=auth.uid() AND public.is_opportunity_conversation_participant(conversation_id)
  AND NOT EXISTS(SELECT 1 FROM public.opportunity_blocks b WHERE b.conversation_id=opportunity_messages.conversation_id)
);
DROP POLICY IF EXISTS "Participants read blocks" ON public.opportunity_blocks;
DROP POLICY IF EXISTS "Participants read project blocks" ON public.opportunity_blocks;
CREATE POLICY "Participants read project blocks" ON public.opportunity_blocks FOR SELECT TO authenticated USING(
  public.is_opportunity_conversation_participant(conversation_id)
);
DROP POLICY IF EXISTS "Users create own blocks" ON public.opportunity_blocks;
DROP POLICY IF EXISTS "Participants create own project blocks" ON public.opportunity_blocks;
CREATE POLICY "Participants create own project blocks" ON public.opportunity_blocks FOR INSERT TO authenticated WITH CHECK(
  blocker_id=auth.uid()
  AND public.is_opportunity_conversation_participant(conversation_id)
  AND public.is_opportunity_conversation_participant(conversation_id,blocked_user_id)
);

DROP POLICY IF EXISTS "Project users read assignments" ON public.opportunity_assignments;
CREATE POLICY "Project users read assignments" ON public.opportunity_assignments FOR SELECT TO authenticated USING(
  freelancer_id=auth.uid() OR public.is_control_centre_member()
  OR public.is_managed_opportunity_client(opportunity_id)
);
DROP POLICY IF EXISTS "Project users read status history" ON public.opportunity_status_events;
CREATE POLICY "Project users read status history" ON public.opportunity_status_events FOR SELECT TO authenticated USING(
  public.is_control_centre_member()
  OR public.is_managed_opportunity_client(opportunity_id)
  OR public.is_assigned_opportunity_freelancer(opportunity_id)
);
DROP POLICY IF EXISTS "Control Centre reads private opportunity notes" ON public.opportunity_owner_notes;
CREATE POLICY "Control Centre reads private opportunity notes" ON public.opportunity_owner_notes FOR SELECT TO authenticated USING(public.is_owner_or_admin());
DROP POLICY IF EXISTS "Conversation members read participants" ON public.opportunity_conversation_participants;
CREATE POLICY "Conversation members read participants" ON public.opportunity_conversation_participants FOR SELECT TO authenticated USING(public.is_opportunity_conversation_participant(conversation_id));
DROP POLICY IF EXISTS "Applicants read own verification" ON public.verification_applications;
CREATE POLICY "Applicants read own verification" ON public.verification_applications FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_control_centre_member());
DROP POLICY IF EXISTS "Approved verification is visible" ON public.user_verifications;
CREATE POLICY "Approved verification is visible" ON public.user_verifications FOR SELECT TO authenticated USING(status='approved' OR user_id=auth.uid() OR public.is_control_centre_member());
DROP POLICY IF EXISTS "Moderators read verification audit" ON public.verification_events;
CREATE POLICY "Moderators read verification audit" ON public.verification_events FOR SELECT TO authenticated USING(public.is_control_centre_member());

REVOKE ALL ON public.opportunity_assignments,public.opportunity_status_events,public.opportunity_owner_notes,public.opportunity_conversation_participants,
  public.verification_applications,public.user_verifications,public.verification_events FROM authenticated;
GRANT SELECT ON public.opportunity_assignments,public.opportunity_status_events,public.opportunity_owner_notes,public.opportunity_conversation_participants,
  public.verification_applications,public.user_verifications,public.verification_events TO authenticated;

-- Notify every active project-room participant except the authenticated sender.
-- This replaces the two-person trigger without exposing message contents.
CREATE OR REPLACE FUNCTION public.notify_new_opportunity_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_title TEXT; v_recipient RECORD;
BEGIN
  SELECT o.title INTO v_title
  FROM public.opportunity_conversations c
  JOIN public.opportunities o ON o.id=c.opportunity_id
  WHERE c.id=NEW.conversation_id;
  FOR v_recipient IN
    SELECT user_id FROM public.opportunity_conversation_participants
    WHERE conversation_id=NEW.conversation_id AND user_id<>NEW.sender_id AND left_at IS NULL
  LOOP
    INSERT INTO public.notifications(user_id,type,title,message,related_entity_type,related_entity_id,deduplication_key)
    VALUES(v_recipient.user_id,'opportunity_message','New private message',format('You have a new message about %s.',v_title),'opportunity_conversation',NEW.conversation_id,'opportunity-message:'||NEW.id||':'||v_recipient.user_id)
    ON CONFLICT(user_id,deduplication_key) WHERE deduplication_key IS NOT NULL DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;
