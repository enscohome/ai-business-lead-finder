-- Phase 0 country launch controls and provider-data safeguards. Review before applying.
CREATE TABLE public.countries (
  iso_code TEXT PRIMARY KEY CHECK (iso_code ~ '^[A-Z]{2}$'), name TEXT NOT NULL UNIQUE, region TEXT NOT NULL,
  default_currency TEXT NOT NULL CHECK (default_currency ~ '^[A-Z]{3}$'),
  launch_status TEXT NOT NULL CHECK (launch_status IN ('draft','technical_review','legal_review','approved','paused')),
  enabled BOOLEAN NOT NULL DEFAULT false, approved_at TIMESTAMPTZ, approved_by UUID REFERENCES auth.users(id),
  review_notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.country_features (
  country_code TEXT PRIMARY KEY REFERENCES public.countries(iso_code) ON DELETE CASCADE,
  business_search_enabled BOOLEAN NOT NULL DEFAULT false, saved_leads_enabled BOOLEAN NOT NULL DEFAULT false,
  contact_export_enabled BOOLEAN NOT NULL DEFAULT false, ai_outreach_enabled BOOLEAN NOT NULL DEFAULT false,
  email_outreach_enabled BOOLEAN NOT NULL DEFAULT false, whatsapp_outreach_enabled BOOLEAN NOT NULL DEFAULT false,
  phone_outreach_enabled BOOLEAN NOT NULL DEFAULT false, freelancer_marketplace_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_matching_enabled BOOLEAN NOT NULL DEFAULT false, verification_enabled BOOLEAN NOT NULL DEFAULT false,
  subscriptions_enabled BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.country_configuration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), country_code TEXT NOT NULL, admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, before_state JSONB, after_state JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.data_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, field_name TEXT NOT NULL,
  provider TEXT NOT NULL, provider_record_id TEXT NOT NULL, retrieved_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ, permitted_use TEXT NOT NULL DEFAULT 'requires_review', attribution_required BOOLEAN NOT NULL DEFAULT true,
  deletion_status TEXT NOT NULL DEFAULT 'active' CHECK (deletion_status IN ('active','expired','deleted','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type,entity_id,field_name,provider)
);
CREATE TABLE public.provider_deletion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  fields TEXT[] NOT NULL DEFAULT '{}', status TEXT NOT NULL CHECK(status IN ('deleted','failed')), error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'NG', ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;
INSERT INTO public.countries(iso_code,name,region,default_currency,launch_status,enabled,approved_at,review_notes)
VALUES('NG','Nigeria','Africa','NGN','approved',true,now(),'Initial supported launch country. Legal and provider terms still require ongoing review.') ON CONFLICT(iso_code) DO NOTHING;
INSERT INTO public.country_features(country_code,business_search_enabled,saved_leads_enabled,contact_export_enabled,ai_outreach_enabled,email_outreach_enabled,whatsapp_outreach_enabled,phone_outreach_enabled,freelancer_marketplace_enabled,ai_matching_enabled,verification_enabled,subscriptions_enabled)
VALUES('NG',true,true,false,true,false,false,false,true,true,true,true) ON CONFLICT(country_code) DO NOTHING;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY; ALTER TABLE public.country_features ENABLE ROW LEVEL SECURITY; ALTER TABLE public.country_configuration_logs ENABLE ROW LEVEL SECURITY; ALTER TABLE public.data_provenance ENABLE ROW LEVEL SECURITY; ALTER TABLE public.provider_deletion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read launch countries" ON public.countries FOR SELECT TO authenticated USING(true);
CREATE POLICY "Authenticated users read country features" ON public.country_features FOR SELECT TO authenticated USING(true);
CREATE POLICY "Admins manage launch countries" ON public.countries FOR ALL TO authenticated USING(public.is_leadpilot_admin()) WITH CHECK(public.is_leadpilot_admin());
CREATE POLICY "Admins manage country features" ON public.country_features FOR ALL TO authenticated USING(public.is_leadpilot_admin()) WITH CHECK(public.is_leadpilot_admin());
CREATE POLICY "Admins read country logs" ON public.country_configuration_logs FOR SELECT TO authenticated USING(public.is_leadpilot_admin());
CREATE POLICY "Admins read provenance" ON public.data_provenance FOR SELECT TO authenticated USING(public.is_leadpilot_admin());
CREATE POLICY "Admins read deletion events" ON public.provider_deletion_events FOR SELECT TO authenticated USING(public.is_leadpilot_admin());
CREATE OR REPLACE FUNCTION public.expire_google_provider_data() RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item RECORD; removed INTEGER:=0;
BEGIN
  FOR item IN SELECT entity_type,entity_id,array_agg(field_name) fields FROM data_provenance WHERE provider='google_places' AND deletion_status='active' AND expires_at IS NOT NULL AND expires_at<=now() GROUP BY entity_type,entity_id LOOP
    -- Provider fields are not deleted from unrelated domain tables here. Phase 0 stores only Place IDs persistently.
    UPDATE data_provenance SET deletion_status='deleted',updated_at=now() WHERE provider='google_places' AND entity_type=item.entity_type AND entity_id=item.entity_id AND deletion_status='active';
    INSERT INTO provider_deletion_events(provider,entity_type,entity_id,fields,status) VALUES('google_places',item.entity_type,item.entity_id,item.fields,'deleted'); removed:=removed+1;
  END LOOP; RETURN removed;
END $$;
REVOKE ALL ON FUNCTION public.expire_google_provider_data() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.expire_google_provider_data() TO service_role;
