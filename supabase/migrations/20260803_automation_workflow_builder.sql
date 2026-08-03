-- LeadPilot AI Automation Builder. Review before applying to Supabase.
-- This migration reuses existing paid-plan and owner entitlements. It does not
-- create a plan, price, payment provider, or new monthly allowance.

ALTER TABLE public.country_features
  ADD COLUMN IF NOT EXISTS automation_builder_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE public.country_features
SET automation_builder_enabled = true, updated_at = now()
WHERE country_code = 'NG';

CREATE TABLE IF NOT EXISTS public.automation_workflow_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL CHECK (char_length(project_name) BETWEEN 1 AND 120),
  client_name TEXT NOT NULL DEFAULT '' CHECK (char_length(client_name) <= 120),
  business_type TEXT NOT NULL DEFAULT '' CHECK (char_length(business_type) <= 120),
  automation_category TEXT NOT NULL DEFAULT 'Business process automation'
    CHECK (char_length(automation_category) BETWEEN 1 AND 120),
  customer_problem TEXT NOT NULL DEFAULT '' CHECK (char_length(customer_problem) <= 3000),
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_workflow JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_summary TEXT NOT NULL DEFAULT '' CHECK (char_length(workflow_summary) <= 12000),
  required_credentials JSONB NOT NULL DEFAULT '[]'::jsonb,
  supported_nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_status TEXT NOT NULL DEFAULT 'not_validated'
    CHECK (validation_status IN ('not_validated','valid','invalid')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_platform TEXT NOT NULL DEFAULT 'n8n' CHECK (target_platform = 'n8n'),
  target_n8n_version TEXT,
  generation_count INTEGER NOT NULL DEFAULT 0 CHECK (generation_count >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','planned','generated','validation_failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_workflow_projects
  ADD COLUMN IF NOT EXISTS automation_category TEXT NOT NULL
  DEFAULT 'Business process automation';

CREATE INDEX IF NOT EXISTS automation_workflow_projects_user_updated_idx
  ON public.automation_workflow_projects(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_workflow_generation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.automation_workflow_projects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'plan_requested','request_started','generated','regenerated','validation_failed',
      'json_downloaded','pdf_downloaded'
    )
  ),
  validation_status TEXT NOT NULL DEFAULT 'not_validated'
    CHECK (validation_status IN ('not_validated','valid','invalid')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_workflow_events_user_created_idx
  ON public.automation_workflow_generation_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS automation_workflow_events_project_created_idx
  ON public.automation_workflow_generation_events(project_id, created_at DESC);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS deduplication_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_deduplication_idx
  ON public.notifications(user_id, deduplication_key)
  WHERE deduplication_key IS NOT NULL;

ALTER TABLE public.automation_workflow_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_workflow_generation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entitled users read own automation projects"
  ON public.automation_workflow_projects;
DROP POLICY IF EXISTS "Entitled users create own automation projects"
  ON public.automation_workflow_projects;
DROP POLICY IF EXISTS "Entitled users update own automation projects"
  ON public.automation_workflow_projects;
DROP POLICY IF EXISTS "Entitled users delete own automation projects"
  ON public.automation_workflow_projects;

CREATE POLICY "Entitled users read own automation projects"
  ON public.automation_workflow_projects FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.has_website_prompt_access(false));
CREATE POLICY "Entitled users create own automation projects"
  ON public.automation_workflow_projects FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_website_prompt_access(true));
CREATE POLICY "Entitled users update own automation projects"
  ON public.automation_workflow_projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_website_prompt_access(true))
  WITH CHECK (user_id = auth.uid() AND public.has_website_prompt_access(true));
CREATE POLICY "Entitled users delete own automation projects"
  ON public.automation_workflow_projects FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.has_website_prompt_access(true));

DROP POLICY IF EXISTS "Users read own automation audit events"
  ON public.automation_workflow_generation_events;
DROP POLICY IF EXISTS "Users create own automation audit events"
  ON public.automation_workflow_generation_events;
CREATE POLICY "Users read own automation audit events"
  ON public.automation_workflow_generation_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users create own automation audit events"
  ON public.automation_workflow_generation_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_automation_workflow_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS automation_workflow_projects_updated_at
  ON public.automation_workflow_projects;
CREATE TRIGGER automation_workflow_projects_updated_at
  BEFORE UPDATE ON public.automation_workflow_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_automation_workflow_updated_at();

CREATE OR REPLACE FUNCTION public.save_automation_workflow_generation(
  p_user_id UUID,
  p_project_id UUID,
  p_limit INTEGER,
  p_project_name TEXT,
  p_client_name TEXT,
  p_business_type TEXT,
  p_automation_category TEXT,
  p_customer_problem TEXT,
  p_requirements JSONB,
  p_workflow_plan JSONB,
  p_generated_workflow JSONB,
  p_workflow_summary TEXT,
  p_required_credentials JSONB,
  p_supported_nodes JSONB,
  p_target_n8n_version TEXT
)
RETURNS TABLE(project_id UUID, generation_count INTEGER, usage_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_project_id UUID;
  v_generation_count INTEGER;
  v_usage_count INTEGER;
  v_event_type TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF NOT public.has_website_prompt_access(true) THEN
    RAISE EXCEPTION 'PREMIUM_ACCESS_REQUIRED';
  END IF;

  SELECT public.consume_website_prompt_generation(p_user_id, p_limit)
    INTO v_usage_count;
  IF v_usage_count IS NULL THEN
    RAISE EXCEPTION 'USAGE_LIMIT_REACHED';
  END IF;

  IF p_project_id IS NULL THEN
    INSERT INTO public.automation_workflow_projects(
      user_id,project_name,client_name,business_type,automation_category,customer_problem,
      requirements,workflow_plan,generated_workflow,workflow_summary,
      required_credentials,supported_nodes,validation_status,validation_errors,
      target_platform,target_n8n_version,generation_count,status
    ) VALUES (
      p_user_id,p_project_name,p_client_name,p_business_type,p_automation_category,p_customer_problem,
      p_requirements,p_workflow_plan,p_generated_workflow,p_workflow_summary,
      p_required_credentials,p_supported_nodes,'valid','[]'::jsonb,
      'n8n',NULLIF(p_target_n8n_version,''),1,'generated'
    )
    RETURNING id,automation_workflow_projects.generation_count
      INTO v_project_id,v_generation_count;
    v_event_type := 'generated';
  ELSE
    UPDATE public.automation_workflow_projects
    SET project_name=p_project_name,
        client_name=p_client_name,
        business_type=p_business_type,
        automation_category=p_automation_category,
        customer_problem=p_customer_problem,
        requirements=p_requirements,
        workflow_plan=p_workflow_plan,
        generated_workflow=p_generated_workflow,
        workflow_summary=p_workflow_summary,
        required_credentials=p_required_credentials,
        supported_nodes=p_supported_nodes,
        validation_status='valid',
        validation_errors='[]'::jsonb,
        target_n8n_version=NULLIF(p_target_n8n_version,''),
        generation_count=automation_workflow_projects.generation_count+1,
        status='generated'
    WHERE id=p_project_id AND user_id=p_user_id
    RETURNING id,automation_workflow_projects.generation_count
      INTO v_project_id,v_generation_count;
    IF v_project_id IS NULL THEN RAISE EXCEPTION 'PROJECT_NOT_FOUND'; END IF;
    v_event_type := 'regenerated';
  END IF;

  INSERT INTO public.automation_workflow_generation_events(
    user_id,project_id,event_type,validation_status,details
  ) VALUES (
    p_user_id,v_project_id,v_event_type,'valid',
    jsonb_build_object('generation_count',v_generation_count,'node_count',jsonb_array_length(p_generated_workflow->'nodes'))
  );

  INSERT INTO public.notifications(
    user_id,type,title,message,related_entity_type,related_entity_id,deduplication_key
  ) VALUES (
    p_user_id,
    CASE WHEN v_event_type='generated' THEN 'automation_workflow_generated' ELSE 'automation_workflow_regenerated' END,
    CASE WHEN v_event_type='generated' THEN 'Automation workflow ready' ELSE 'Automation workflow regenerated' END,
    format('%s is ready to review and download.',p_project_name),
    'automation_workflow_project',v_project_id,
    format('automation:%s:generation:%s',v_project_id,v_generation_count)
  ) ON CONFLICT (user_id,deduplication_key) WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN QUERY SELECT v_project_id,v_generation_count,v_usage_count;
END $$;

REVOKE ALL ON FUNCTION public.save_automation_workflow_generation(
  UUID,UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,JSONB,JSONB,TEXT,JSONB,JSONB,TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_automation_workflow_generation(
  UUID,UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,JSONB,JSONB,TEXT,JSONB,JSONB,TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_automation_validation_failure(
  p_user_id UUID,
  p_project_id UUID,
  p_failure_key TEXT,
  p_message TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.automation_workflow_projects
    WHERE id=p_project_id AND user_id=p_user_id
  ) THEN RETURN; END IF;
  INSERT INTO public.notifications(
    user_id,type,title,message,related_entity_type,related_entity_id,deduplication_key
  ) VALUES (
    p_user_id,'automation_workflow_validation_failed',
    'Automation workflow needs attention',left(p_message,2000),
    'automation_workflow_project',p_project_id,
    format('automation:%s:validation:%s',p_project_id,left(p_failure_key,120))
  ) ON CONFLICT (user_id,deduplication_key) WHERE deduplication_key IS NOT NULL DO NOTHING;
END $$;

REVOKE ALL ON FUNCTION public.record_automation_validation_failure(UUID,UUID,TEXT,TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_automation_validation_failure(UUID,UUID,TEXT,TEXT)
  TO authenticated;
