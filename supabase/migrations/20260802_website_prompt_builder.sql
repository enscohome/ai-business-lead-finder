-- LeadPilot AI Website Prompt Builder. Review before applying.
ALTER TABLE public.country_features
  ADD COLUMN IF NOT EXISTS website_prompt_builder_enabled BOOLEAN NOT NULL DEFAULT false;

-- Nigeria is the only launch country enabled for this feature. No other country is changed.
UPDATE public.country_features
SET website_prompt_builder_enabled = true, updated_at = now()
WHERE country_code = 'NG';

CREATE TABLE IF NOT EXISTS public.website_prompt_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL CHECK (char_length(project_name) BETWEEN 1 AND 120),
  business_name TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 120),
  industry TEXT NOT NULL DEFAULT '',
  business_description TEXT NOT NULL DEFAULT '',
  products_services TEXT NOT NULL DEFAULT '',
  target_customers TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT 'NG' CHECK (country_code = 'NG'),
  city TEXT,
  website_purpose JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  design_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  technical_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_information JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_ai TEXT NOT NULL DEFAULT 'codex' CHECK (target_ai IN ('codex','claude','kimi','general')),
  generated_prompt TEXT NOT NULL DEFAULT '',
  general_brief TEXT NOT NULL DEFAULT '',
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt_outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS website_prompt_projects_user_updated_idx
  ON public.website_prompt_projects(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.website_prompt_generation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS website_prompt_generation_events_user_created_idx
  ON public.website_prompt_generation_events(user_id, created_at DESC);

ALTER TABLE public.website_prompt_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_prompt_generation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own website prompt projects"
  ON public.website_prompt_projects FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users create own website prompt projects"
  ON public.website_prompt_projects FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own website prompt projects"
  ON public.website_prompt_projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own website prompt projects"
  ON public.website_prompt_projects FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users read own website prompt generation events"
  ON public.website_prompt_generation_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users create own website prompt generation events"
  ON public.website_prompt_generation_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_website_prompt_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS website_prompt_projects_updated_at ON public.website_prompt_projects;
CREATE TRIGGER website_prompt_projects_updated_at
  BEFORE UPDATE ON public.website_prompt_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_website_prompt_updated_at();

-- Atomically consume one existing monthly AI-message allowance. The caller may only
-- update its own row, and the supplied ceiling comes from the server-side plan table.
CREATE OR REPLACE FUNCTION public.consume_website_prompt_allowance(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id OR p_limit < 1 THEN RETURN false; END IF;
  UPDATE public.user_profiles
  SET ai_messages_used = COALESCE(ai_messages_used, 0) + 1
  WHERE id = p_user_id AND COALESCE(ai_messages_used, 0) < p_limit;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END $$;

REVOKE ALL ON FUNCTION public.consume_website_prompt_allowance(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_website_prompt_allowance(UUID, INTEGER) TO authenticated;
