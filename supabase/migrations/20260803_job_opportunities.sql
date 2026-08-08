-- LeadPilot AI Job Opportunities and private messaging.
-- Review before applying. This migration is intentionally not auto-applied.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS deduplication_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_deduplication_idx
  ON public.notifications(user_id,deduplication_key)
  WHERE deduplication_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 30 AND 12000),
  category TEXT NOT NULL CHECK (category IN ('AI Automation','Website Development','App Development','Graphic Design','Social Media','Content Writing','Lead Generation','Virtual Assistance','Data and Research','Other')),
  skills TEXT[] NOT NULL DEFAULT '{}',
  country_code TEXT NOT NULL DEFAULT 'NG' CHECK (country_code ~ '^[A-Z]{2}$'),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 120),
  work_location_type TEXT NOT NULL CHECK (work_location_type IN ('remote','onsite','hybrid')),
  budget_type TEXT NOT NULL CHECK (budget_type IN ('fixed','hourly','negotiable')),
  budget_min NUMERIC(14,2) CHECK (budget_min IS NULL OR budget_min >= 0),
  budget_max NUMERIC(14,2) CHECK (budget_max IS NULL OR budget_max >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency ~ '^[A-Z]{3}$'),
  experience_level TEXT NOT NULL CHECK (experience_level IN ('entry','intermediate','expert')),
  delivery_time TEXT NOT NULL DEFAULT '' CHECK (char_length(delivery_time) <= 160),
  application_deadline TIMESTAMPTZ,
  application_questions TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','open','paused','closed','completed','rejected')),
  moderation_reason TEXT CHECK (moderation_reason IS NULL OR char_length(moderation_reason) <= 2000),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min)
);

CREATE TABLE IF NOT EXISTS public.opportunity_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal TEXT NOT NULL CHECK (char_length(proposal) BETWEEN 30 AND 5000),
  relevant_experience TEXT NOT NULL CHECK (char_length(relevant_experience) BETWEEN 10 AND 3000),
  estimated_delivery TEXT NOT NULL CHECK (char_length(estimated_delivery) BETWEEN 1 AND 160),
  proposed_budget NUMERIC(14,2) CHECK (proposed_budget IS NULL OR proposed_budget >= 0),
  answers TEXT[] NOT NULL DEFAULT '{}',
  portfolio_links TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','accepted','rejected','withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_opportunities (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,opportunity_id)
);

CREATE TABLE IF NOT EXISTS public.opportunity_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  application_id UUID NOT NULL UNIQUE REFERENCES public.opportunity_applications(id) ON DELETE CASCADE,
  job_poster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  poster_archived_at TIMESTAMPTZ,
  freelancer_archived_at TIMESTAMPTZ,
  poster_left_at TIMESTAMPTZ,
  freelancer_left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (job_poster_id <> freelancer_id)
);

CREATE TABLE IF NOT EXISTS public.opportunity_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.opportunity_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opportunity_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.opportunity_conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(blocker_id,blocked_user_id,conversation_id),
  CHECK (blocker_id <> blocked_user_id)
);

CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('opportunity','conversation')),
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('scam_fraud','spam','harassment','inappropriate_content','misleading_opportunity','illegal_work','other')),
  explanation TEXT NOT NULL DEFAULT '' CHECK (char_length(explanation) <= 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  moderator_notes TEXT CHECK (moderator_notes IS NULL OR char_length(moderator_notes) <= 3000),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opportunity_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  report_id UUID REFERENCES public.community_reports(id) ON DELETE SET NULL,
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (char_length(action) BETWEEN 1 AND 80),
  reason TEXT NOT NULL DEFAULT '' CHECK (char_length(reason) <= 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.freelancer_review_requests
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS freelancer_review_requests_opportunity_idx
  ON public.freelancer_review_requests(opportunity_id)
  WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS opportunities_feed_idx ON public.opportunities(status,created_at DESC);
CREATE INDEX IF NOT EXISTS opportunities_category_idx ON public.opportunities(category,status);
CREATE INDEX IF NOT EXISTS opportunities_country_idx ON public.opportunities(country_code,status);
CREATE INDEX IF NOT EXISTS opportunities_owner_idx ON public.opportunities(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_applications_opportunity_idx ON public.opportunity_applications(opportunity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_applications_applicant_idx ON public.opportunity_applications(applicant_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS opportunity_applications_active_unique
  ON public.opportunity_applications(opportunity_id,applicant_id)
  WHERE status IN ('submitted','shortlisted','accepted');
CREATE UNIQUE INDEX IF NOT EXISTS opportunity_one_accepted
  ON public.opportunity_applications(opportunity_id) WHERE status='accepted';
CREATE INDEX IF NOT EXISTS opportunity_conversations_poster_idx ON public.opportunity_conversations(job_poster_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_conversations_freelancer_idx ON public.opportunity_conversations(freelancer_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_messages_conversation_idx ON public.opportunity_messages(conversation_id,created_at);
CREATE INDEX IF NOT EXISTS opportunity_messages_unread_idx ON public.opportunity_messages(conversation_id,read_at,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS community_reports_active_unique
  ON public.community_reports(reporter_id,entity_type,entity_id)
  WHERE status IN ('open','reviewing');
CREATE INDEX IF NOT EXISTS community_reports_status_idx ON public.community_reports(status,created_at DESC);

CREATE OR REPLACE FUNCTION public.is_opportunity_moderator()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.app_admins WHERE user_id=auth.uid() AND role IN ('owner','admin','moderator'));
$$;
REVOKE ALL ON FUNCTION public.is_opportunity_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_opportunity_moderator() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_opportunity_owner(p_opportunity_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.opportunities WHERE id=p_opportunity_id AND owner_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.has_opportunity_application(p_opportunity_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.opportunity_applications WHERE opportunity_id=p_opportunity_id AND applicant_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_opportunity_owner(UUID),public.has_opportunity_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_opportunity_owner(UUID),public.has_opportunity_application(UUID) TO authenticated;

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visible opportunities" ON public.opportunities;
CREATE POLICY "Visible opportunities" ON public.opportunities FOR SELECT TO authenticated USING (
  (status='open' AND approved_at IS NOT NULL) OR owner_id=auth.uid() OR public.is_opportunity_moderator()
  OR public.has_opportunity_application(id)
);
DROP POLICY IF EXISTS "Owners insert opportunities" ON public.opportunities;
CREATE POLICY "Owners insert opportunities" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK(owner_id=auth.uid() AND status='pending_review' AND approved_at IS NULL);
DROP POLICY IF EXISTS "Owners update opportunities" ON public.opportunities;
CREATE POLICY "Owners update opportunities" ON public.opportunities FOR UPDATE TO authenticated
  USING(owner_id=auth.uid() OR public.is_opportunity_moderator())
  WITH CHECK(owner_id=auth.uid() OR public.is_opportunity_moderator());
DROP POLICY IF EXISTS "Owners delete opportunities" ON public.opportunities;
CREATE POLICY "Owners delete opportunities" ON public.opportunities FOR DELETE TO authenticated
  USING(owner_id=auth.uid() OR public.is_opportunity_moderator());

DROP POLICY IF EXISTS "Application participants read" ON public.opportunity_applications;
CREATE POLICY "Application participants read" ON public.opportunity_applications FOR SELECT TO authenticated USING (
  applicant_id=auth.uid() OR public.is_opportunity_moderator()
  OR public.is_opportunity_owner(opportunity_id)
);
DROP POLICY IF EXISTS "Freelancers insert applications" ON public.opportunity_applications;
CREATE POLICY "Freelancers insert applications" ON public.opportunity_applications FOR INSERT TO authenticated WITH CHECK (
  applicant_id=auth.uid()
  AND EXISTS(SELECT 1 FROM public.freelancer_profiles p WHERE p.user_id=auth.uid())
  AND EXISTS(SELECT 1 FROM public.opportunities o WHERE o.id=opportunity_id AND o.owner_id<>auth.uid() AND o.status='open' AND o.approved_at IS NOT NULL AND (o.application_deadline IS NULL OR o.application_deadline>now()))
);
DROP POLICY IF EXISTS "Application status updates" ON public.opportunity_applications;
CREATE POLICY "Application status updates" ON public.opportunity_applications FOR UPDATE TO authenticated USING (
  applicant_id=auth.uid() OR public.is_opportunity_moderator()
  OR public.is_opportunity_owner(opportunity_id)
) WITH CHECK (
  applicant_id=auth.uid() OR public.is_opportunity_moderator()
  OR public.is_opportunity_owner(opportunity_id)
);

DROP POLICY IF EXISTS "Users read own saved opportunities" ON public.saved_opportunities;
CREATE POLICY "Users read own saved opportunities" ON public.saved_opportunities FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS "Users save opportunities" ON public.saved_opportunities;
CREATE POLICY "Users save opportunities" ON public.saved_opportunities FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS "Users remove saved opportunities" ON public.saved_opportunities;
CREATE POLICY "Users remove saved opportunities" ON public.saved_opportunities FOR DELETE TO authenticated USING(user_id=auth.uid());

DROP POLICY IF EXISTS "Conversation participants read" ON public.opportunity_conversations;
CREATE POLICY "Conversation participants read" ON public.opportunity_conversations FOR SELECT TO authenticated USING (
  auth.uid() IN (job_poster_id,freelancer_id) OR public.is_opportunity_moderator()
);
DROP POLICY IF EXISTS "Message participants read" ON public.opportunity_messages;
CREATE POLICY "Message participants read" ON public.opportunity_messages FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.opportunity_conversations c WHERE c.id=conversation_id AND auth.uid() IN (c.job_poster_id,c.freelancer_id))
  OR public.is_opportunity_moderator()
);
DROP POLICY IF EXISTS "Participants insert own messages" ON public.opportunity_messages;
CREATE POLICY "Participants insert own messages" ON public.opportunity_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id=auth.uid() AND EXISTS(
    SELECT 1 FROM public.opportunity_conversations c
    WHERE c.id=conversation_id AND c.status='active' AND auth.uid() IN (c.job_poster_id,c.freelancer_id)
      AND c.poster_left_at IS NULL AND c.freelancer_left_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM public.opportunity_blocks b WHERE b.conversation_id=c.id)
  )
);
DROP POLICY IF EXISTS "Participants read blocks" ON public.opportunity_blocks;
CREATE POLICY "Participants read blocks" ON public.opportunity_blocks FOR SELECT TO authenticated USING (
  blocker_id=auth.uid() OR blocked_user_id=auth.uid() OR public.is_opportunity_moderator()
);
DROP POLICY IF EXISTS "Users create own blocks" ON public.opportunity_blocks;
CREATE POLICY "Users create own blocks" ON public.opportunity_blocks FOR INSERT TO authenticated WITH CHECK (
  blocker_id=auth.uid() AND EXISTS(SELECT 1 FROM public.opportunity_conversations c WHERE c.id=conversation_id AND auth.uid() IN(c.job_poster_id,c.freelancer_id) AND blocked_user_id IN(c.job_poster_id,c.freelancer_id))
);
DROP POLICY IF EXISTS "Users remove own blocks" ON public.opportunity_blocks;
CREATE POLICY "Users remove own blocks" ON public.opportunity_blocks FOR DELETE TO authenticated USING(blocker_id=auth.uid());

DROP POLICY IF EXISTS "Reporters and moderators read reports" ON public.community_reports;
CREATE POLICY "Reporters and moderators read reports" ON public.community_reports FOR SELECT TO authenticated USING(reporter_id=auth.uid() OR public.is_opportunity_moderator());
DROP POLICY IF EXISTS "Users submit own reports" ON public.community_reports;
CREATE POLICY "Users submit own reports" ON public.community_reports FOR INSERT TO authenticated WITH CHECK(reporter_id=auth.uid() AND status='open');
DROP POLICY IF EXISTS "Moderators update reports" ON public.community_reports;
CREATE POLICY "Moderators update reports" ON public.community_reports FOR UPDATE TO authenticated USING(public.is_opportunity_moderator()) WITH CHECK(public.is_opportunity_moderator());
DROP POLICY IF EXISTS "Moderators read audit" ON public.opportunity_moderation_events;
CREATE POLICY "Moderators read audit" ON public.opportunity_moderation_events FOR SELECT TO authenticated USING(public.is_opportunity_moderator());
DROP POLICY IF EXISTS "Moderators add audit" ON public.opportunity_moderation_events;
CREATE POLICY "Moderators add audit" ON public.opportunity_moderation_events FOR INSERT TO authenticated WITH CHECK(public.is_opportunity_moderator() AND moderator_id=auth.uid());

-- Authenticated clients may read through RLS. Mutations go through authenticated
-- server API routes using the service role after ownership, transition and input checks.
REVOKE ALL ON public.opportunities,public.opportunity_applications,
  public.opportunity_conversations,public.opportunity_messages,public.community_reports,
  public.opportunity_moderation_events,public.saved_opportunities,public.opportunity_blocks FROM authenticated;
GRANT SELECT ON public.opportunities,public.opportunity_applications,public.saved_opportunities,
  public.opportunity_conversations,public.opportunity_messages,public.opportunity_blocks,
  public.community_reports,public.opportunity_moderation_events TO authenticated;
GRANT INSERT,DELETE ON public.saved_opportunities,public.opportunity_blocks TO authenticated;

CREATE OR REPLACE FUNCTION public.set_opportunity_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS opportunities_updated_at ON public.opportunities;
CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_updated_at();
DROP TRIGGER IF EXISTS opportunity_applications_updated_at ON public.opportunity_applications;
CREATE TRIGGER opportunity_applications_updated_at BEFORE UPDATE ON public.opportunity_applications FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_updated_at();
DROP TRIGGER IF EXISTS opportunity_conversations_updated_at ON public.opportunity_conversations;
CREATE TRIGGER opportunity_conversations_updated_at BEFORE UPDATE ON public.opportunity_conversations FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_updated_at();
DROP TRIGGER IF EXISTS opportunity_messages_updated_at ON public.opportunity_messages;
CREATE TRIGGER opportunity_messages_updated_at BEFORE UPDATE ON public.opportunity_messages FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_updated_at();
DROP TRIGGER IF EXISTS community_reports_updated_at ON public.community_reports;
CREATE TRIGGER community_reports_updated_at BEFORE UPDATE ON public.community_reports FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_updated_at();

CREATE OR REPLACE FUNCTION public.notify_new_opportunity_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner UUID; v_title TEXT;
BEGIN
  SELECT owner_id,title INTO v_owner,v_title FROM public.opportunities WHERE id=NEW.opportunity_id;
  INSERT INTO public.notifications(user_id,type,title,message,related_entity_type,related_entity_id,deduplication_key)
  VALUES(v_owner,'application_submitted','New application received',format('A freelancer applied to %s.',v_title),'opportunity_applicants',NEW.opportunity_id,'opportunity-application:'||NEW.id)
  ON CONFLICT(user_id,deduplication_key) WHERE deduplication_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_new_opportunity_application ON public.opportunity_applications;
CREATE TRIGGER notify_new_opportunity_application AFTER INSERT ON public.opportunity_applications FOR EACH ROW EXECUTE FUNCTION public.notify_new_opportunity_application();

CREATE OR REPLACE FUNCTION public.notify_new_opportunity_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_recipient UUID; v_title TEXT;
BEGIN
  SELECT CASE WHEN c.job_poster_id=NEW.sender_id THEN c.freelancer_id ELSE c.job_poster_id END,o.title
  INTO v_recipient,v_title FROM public.opportunity_conversations c JOIN public.opportunities o ON o.id=c.opportunity_id WHERE c.id=NEW.conversation_id;
  INSERT INTO public.notifications(user_id,type,title,message,related_entity_type,related_entity_id,deduplication_key)
  VALUES(v_recipient,'opportunity_message','New private message',format('You have a new message about %s.',v_title),'opportunity_conversation',NEW.conversation_id,'opportunity-message:'||NEW.id)
  ON CONFLICT(user_id,deduplication_key) WHERE deduplication_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_new_opportunity_message ON public.opportunity_messages;
CREATE TRIGGER notify_new_opportunity_message AFTER INSERT ON public.opportunity_messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_opportunity_message();

-- Publish messages once for Supabase Realtime. RLS continues to control access.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
     AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='opportunity_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_messages';
  END IF;
END $$;
