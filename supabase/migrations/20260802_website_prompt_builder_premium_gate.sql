-- Website Prompt Builder entitlement for existing eligible LeadPilot paid plans.
-- Review before applying. No plan names or prices are created or changed here.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS website_prompt_generations_used INTEGER NOT NULL DEFAULT 0 CHECK (website_prompt_generations_used >= 0),
  ADD COLUMN IF NOT EXISTS previous_paid_plan TEXT CHECK (previous_paid_plan IS NULL OR previous_paid_plan IN ('starter','pro','agency'));

CREATE OR REPLACE FUNCTION public.has_website_prompt_access(p_write BOOLEAN DEFAULT false)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_leadpilot_admin() OR EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id=auth.uid() AND COALESCE(p.is_suspended,false)=false AND COALESCE(p.country_code,'NG')='NG'
      AND (
        (p.plan IN ('starter','pro','agency')
          AND (p.subscription_status IN ('active','trialing') OR (p.subscription_status='cancelled' AND p.subscription_current_period_end>now()))
          AND p.subscription_current_period_end>now())
        OR (p_write=false AND (p.plan IN ('starter','pro','agency') OR p.previous_paid_plan IN ('starter','pro','agency')))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.has_website_prompt_access(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_website_prompt_access(BOOLEAN) TO authenticated;

DROP POLICY IF EXISTS "Users read own website prompt projects" ON public.website_prompt_projects;
DROP POLICY IF EXISTS "Users create own website prompt projects" ON public.website_prompt_projects;
DROP POLICY IF EXISTS "Users update own website prompt projects" ON public.website_prompt_projects;
DROP POLICY IF EXISTS "Users delete own website prompt projects" ON public.website_prompt_projects;
CREATE POLICY "Entitled users read own website prompt projects" ON public.website_prompt_projects FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.has_website_prompt_access(false));
CREATE POLICY "Entitled users create own website prompt projects" ON public.website_prompt_projects FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND public.has_website_prompt_access(true));
CREATE POLICY "Entitled users update own website prompt projects" ON public.website_prompt_projects FOR UPDATE TO authenticated USING(user_id=auth.uid() AND public.has_website_prompt_access(true)) WITH CHECK(user_id=auth.uid() AND public.has_website_prompt_access(true));
CREATE POLICY "Entitled users delete own website prompt projects" ON public.website_prompt_projects FOR DELETE TO authenticated USING(user_id=auth.uid() AND public.has_website_prompt_access(true));

CREATE TABLE IF NOT EXISTS public.website_prompt_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  threshold TEXT NOT NULL CHECK (threshold IN ('80','100','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id,period_start,threshold)
);
ALTER TABLE public.website_prompt_notification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prompt notification events" ON public.website_prompt_notification_events FOR SELECT TO authenticated USING(user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.consume_website_prompt_generation(p_user_id UUID,p_limit INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE next_count INTEGER; period_start TIMESTAMPTZ; threshold_value TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()<>p_user_id OR p_limit<1 THEN RETURN NULL; END IF;
  UPDATE public.user_profiles SET website_prompt_generations_used=0,usage_period_start=date_trunc('month',now()),usage_period_end=date_trunc('month',now())+interval '1 month'
  WHERE id=p_user_id AND (usage_period_end IS NULL OR usage_period_end<=now());
  UPDATE public.user_profiles SET website_prompt_generations_used=website_prompt_generations_used+1
  WHERE id=p_user_id AND website_prompt_generations_used<p_limit
  RETURNING website_prompt_generations_used,COALESCE(usage_period_start,date_trunc('month',now())) INTO next_count,period_start;
  IF next_count IS NULL THEN RETURN NULL; END IF;
  IF next_count>=p_limit THEN threshold_value:='100';
  ELSIF next_count>=CEIL(p_limit*0.8) THEN threshold_value:='80'; END IF;
  IF threshold_value IS NOT NULL THEN
    INSERT INTO public.website_prompt_notification_events(user_id,period_start,threshold) VALUES(p_user_id,period_start,threshold_value) ON CONFLICT DO NOTHING;
    IF FOUND THEN INSERT INTO public.notifications(user_id,type,title,message,related_entity_type)
      VALUES(p_user_id,'website_prompt_builder_usage',CASE threshold_value WHEN '100' THEN 'Monthly prompt limit reached' ELSE 'Website prompt usage update' END,
      CASE threshold_value WHEN '100' THEN format('You have used all %s Website Prompt Builder generations this month.',p_limit) ELSE format('You have used %s of %s Website Prompt Builder generations this month.',next_count,p_limit) END,'website_prompt_builder'); END IF;
  END IF;
  RETURN next_count;
END $$;
REVOKE ALL ON FUNCTION public.consume_website_prompt_generation(UUID,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_website_prompt_generation(UUID,INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_website_prompt_expiry_notification(p_user_id UUID,p_period_start TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid()<>p_user_id THEN RETURN; END IF;
  INSERT INTO public.website_prompt_notification_events(user_id,period_start,threshold) VALUES(p_user_id,p_period_start,'expired') ON CONFLICT DO NOTHING;
  IF FOUND THEN INSERT INTO public.notifications(user_id,type,title,message,related_entity_type)
    VALUES(p_user_id,'website_prompt_builder_expired','Website Prompt Builder access ended','Your paid Website Prompt Builder access has expired. Renew to continue creating and editing prompts.','website_prompt_builder'); END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_website_prompt_expiry_notification(UUID,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_website_prompt_expiry_notification(UUID,TIMESTAMPTZ) TO authenticated;
