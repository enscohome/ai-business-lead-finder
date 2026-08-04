-- LeadPilot AI freelancer profiles, portfolio, reviews, moderation and verification.
-- Prepared for review. Apply through the normal Supabase migration workflow.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'moderator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preserve every existing administrator row. On databases where app_admins was
-- created earlier, only add missing schema metadata; never recreate or seed it.
ALTER TABLE public.app_admins
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'moderator',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.app_admins'::regclass
      AND conname = 'app_admins_role_check'
  ) THEN
    ALTER TABLE public.app_admins
      ADD CONSTRAINT app_admins_role_check
      CHECK (role IN ('owner', 'admin', 'moderator'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_leadpilot_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_leadpilot_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_leadpilot_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.freelancer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_-]{3,30}$'),
  full_name TEXT NOT NULL DEFAULT '', display_name TEXT NOT NULL DEFAULT '',
  professional_title TEXT NOT NULL DEFAULT '', profile_image_url TEXT, cover_image_url TEXT,
  short_bio TEXT NOT NULL DEFAULT '' CHECK (char_length(short_bio) <= 300),
  full_bio TEXT NOT NULL DEFAULT '' CHECK (char_length(full_bio) <= 5000),
  country TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
  languages TEXT[] NOT NULL DEFAULT '{}', skills TEXT[] NOT NULL DEFAULT '{}',
  services TEXT[] NOT NULL DEFAULT '{}', industries TEXT[] NOT NULL DEFAULT '{}',
  years_of_experience INTEGER CHECK (years_of_experience BETWEEN 0 AND 80),
  hourly_rate NUMERIC(12,2) CHECK (hourly_rate >= 0), starting_price NUMERIC(12,2) CHECK (starting_price >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency ~ '^[A-Z]{3}$'),
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available','limited','unavailable')),
  preferred_contact_method TEXT NOT NULL DEFAULT 'email' CHECK (preferred_contact_method IN ('email','phone','whatsapp','website')),
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public','private')),
  visibility_settings JSONB NOT NULL DEFAULT '{"location":true,"hourlyRate":false,"phone":false,"email":false,"socialLinks":true,"workExperience":true,"education":true,"availability":true}',
  work_experience JSONB NOT NULL DEFAULT '[]', education JSONB NOT NULL DEFAULT '[]', certifications JSONB NOT NULL DEFAULT '[]',
  profile_completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (profile_completion_percentage BETWEEN 0 AND 100),
  verification_status TEXT NOT NULL DEFAULT 'not_verified' CHECK (verification_status IN ('not_verified','pending','verified','rejected','suspended')),
  verified_at TIMESTAMPTZ, verified_by UUID REFERENCES auth.users(id), suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelancer_private_details (
  freelancer_id UUID PRIMARY KEY REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL DEFAULT '', contact_phone TEXT NOT NULL DEFAULT '',
  username_changed_at TIMESTAMPTZ, username_change_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelancer_username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  old_username TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelancer_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin','fiverr','upwork','freelancer','github','behance','dribbble','website','instagram','twitter','youtube','whatsapp')),
  profile_url TEXT NOT NULL CHECK (profile_url ~ '^https?://'), is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(freelancer_id, platform)
);

CREATE TABLE IF NOT EXISTS public.freelancer_portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  project_title TEXT NOT NULL CHECK (char_length(project_title) BETWEEN 1 AND 150), description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  cover_image_url TEXT, project_images TEXT[] NOT NULL DEFAULT '{}', skills_used TEXT[] NOT NULL DEFAULT '{}', category TEXT NOT NULL DEFAULT '',
  client_name TEXT, completion_date DATE, project_url TEXT CHECK (project_url IS NULL OR project_url ~ '^https?://'), external_url TEXT CHECK (external_url IS NULL OR external_url ~ '^https?://'),
  display_order INTEGER NOT NULL DEFAULT 0, is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelancer_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL, client_email TEXT, project_title TEXT NOT NULL, unique_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'), completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.freelancer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), review_request_id UUID NOT NULL UNIQUE REFERENCES public.freelancer_review_requests(id) ON DELETE RESTRICT,
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL, client_company TEXT, project_title TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL CHECK (char_length(review_text) BETWEEN 20 AND 3000), verification_status TEXT NOT NULL DEFAULT 'verified_client' CHECK (verification_status = 'verified_client'),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','hidden','removed')),
  moderation_notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), approved_at TIMESTAMPTZ, moderated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.freelancer_review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), review_id UUID NOT NULL REFERENCES public.freelancer_reviews(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('abuse','spam','false_information','offensive_language','not_real_work')),
  details TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ, reviewed_by UUID REFERENCES auth.users(id), UNIQUE(review_id, freelancer_id)
);

CREATE TABLE IF NOT EXISTS public.freelancer_verification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL, country TEXT NOT NULL, phone_number TEXT NOT NULL, email_address TEXT NOT NULL,
  document_type TEXT NOT NULL, document_storage_path TEXT NOT NULL, selfie_storage_path TEXT NOT NULL,
  linkedin_url TEXT, professional_evidence JSONB NOT NULL DEFAULT '[]', certificate_storage_paths TEXT[] NOT NULL DEFAULT '{}',
  application_status TEXT NOT NULL DEFAULT 'pending' CHECK (application_status IN ('draft','pending','approved','rejected','suspended')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ, reviewed_by UUID REFERENCES auth.users(id), rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.freelancer_security_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, event_key TEXT NOT NULL, subject TEXT NOT NULL,
  ip_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS freelancer_security_events_limit_idx ON public.freelancer_security_events(event_key, subject, ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS freelancer_portfolio_order_idx ON public.freelancer_portfolio_projects(freelancer_id, display_order);
CREATE INDEX IF NOT EXISTS freelancer_reviews_public_idx ON public.freelancer_reviews(freelancer_id, moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS freelancer_review_requests_owner_idx ON public.freelancer_review_requests(freelancer_id, status);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_username_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_verification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read admin allowlist" ON public.app_admins;
DROP POLICY IF EXISTS "Owners read profiles" ON public.freelancer_profiles;
DROP POLICY IF EXISTS "Owners create profiles" ON public.freelancer_profiles;
DROP POLICY IF EXISTS "Owners update non-verification profile data" ON public.freelancer_profiles;
DROP POLICY IF EXISTS "Admins manage profiles" ON public.freelancer_profiles;
DROP POLICY IF EXISTS "Owners manage private details" ON public.freelancer_private_details;
DROP POLICY IF EXISTS "Admins read private details" ON public.freelancer_private_details;
DROP POLICY IF EXISTS "Owners read username history" ON public.freelancer_username_history;
DROP POLICY IF EXISTS "Owners create username history" ON public.freelancer_username_history;
DROP POLICY IF EXISTS "Owners manage social links" ON public.freelancer_social_links;
DROP POLICY IF EXISTS "Owners manage portfolio" ON public.freelancer_portfolio_projects;
DROP POLICY IF EXISTS "Owners read review requests" ON public.freelancer_review_requests;
DROP POLICY IF EXISTS "Owners create review requests" ON public.freelancer_review_requests;
DROP POLICY IF EXISTS "Owners read their reviews" ON public.freelancer_reviews;
DROP POLICY IF EXISTS "Owners create reports" ON public.freelancer_review_reports;
DROP POLICY IF EXISTS "Owners read reports" ON public.freelancer_review_reports;
DROP POLICY IF EXISTS "Owners submit verification" ON public.freelancer_verification_applications;
DROP POLICY IF EXISTS "Owners read verification" ON public.freelancer_verification_applications;
DROP POLICY IF EXISTS "Admins moderate reviews" ON public.freelancer_reviews;
DROP POLICY IF EXISTS "Admins manage reports" ON public.freelancer_review_reports;
DROP POLICY IF EXISTS "Admins manage verification" ON public.freelancer_verification_applications;

CREATE POLICY "Admins read admin allowlist" ON public.app_admins FOR SELECT TO authenticated USING (public.is_leadpilot_admin());
CREATE POLICY "Owners read profiles" ON public.freelancer_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_leadpilot_admin());
CREATE POLICY "Owners create profiles" ON public.freelancer_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND verification_status = 'not_verified' AND verified_by IS NULL);
CREATE POLICY "Owners update non-verification profile data" ON public.freelancer_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.freelancer_profiles FOR ALL TO authenticated USING (public.is_leadpilot_admin()) WITH CHECK (public.is_leadpilot_admin());
CREATE POLICY "Owners manage private details" ON public.freelancer_private_details FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins read private details" ON public.freelancer_private_details FOR SELECT TO authenticated USING (public.is_leadpilot_admin());
CREATE POLICY "Owners read username history" ON public.freelancer_username_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()) OR public.is_leadpilot_admin());
CREATE POLICY "Owners create username history" ON public.freelancer_username_history FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners manage social links" ON public.freelancer_social_links FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners manage portfolio" ON public.freelancer_portfolio_projects FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners read review requests" ON public.freelancer_review_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()) OR public.is_leadpilot_admin());
CREATE POLICY "Owners create review requests" ON public.freelancer_review_requests FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners read their reviews" ON public.freelancer_reviews FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()) OR public.is_leadpilot_admin());
CREATE POLICY "Owners create reports" ON public.freelancer_review_reports FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()));
CREATE POLICY "Owners read reports" ON public.freelancer_review_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()) OR public.is_leadpilot_admin());
CREATE POLICY "Owners submit verification" ON public.freelancer_verification_applications FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()) AND application_status = 'pending');
CREATE POLICY "Owners read verification" ON public.freelancer_verification_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.freelancer_profiles p WHERE p.id = freelancer_id AND p.user_id = auth.uid()) OR public.is_leadpilot_admin());
CREATE POLICY "Admins moderate reviews" ON public.freelancer_reviews FOR ALL TO authenticated USING (public.is_leadpilot_admin()) WITH CHECK (public.is_leadpilot_admin());
CREATE POLICY "Admins manage reports" ON public.freelancer_review_reports FOR ALL TO authenticated USING (public.is_leadpilot_admin()) WITH CHECK (public.is_leadpilot_admin());
CREATE POLICY "Admins manage verification" ON public.freelancer_verification_applications FOR ALL TO authenticated USING (public.is_leadpilot_admin()) WITH CHECK (public.is_leadpilot_admin());

-- Prevent owners from changing protected verification fields even through the REST API.
CREATE OR REPLACE FUNCTION public.protect_freelancer_verification_fields() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_leadpilot_admin() THEN NEW.verification_status := OLD.verification_status; NEW.verified_at := OLD.verified_at; NEW.verified_by := OLD.verified_by; NEW.suspended_at := OLD.suspended_at; END IF;
  NEW.updated_at := now(); RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_freelancer_verification ON public.freelancer_profiles;
CREATE TRIGGER protect_freelancer_verification BEFORE UPDATE ON public.freelancer_profiles FOR EACH ROW EXECUTE FUNCTION public.protect_freelancer_verification_fields();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('freelancer-media','freelancer-media',true,5242880,ARRAY['image/jpeg','image/png','image/webp']),
  ('verification-private','verification-private',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public reads freelancer media" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own freelancer media" ON storage.objects;
DROP POLICY IF EXISTS "Users update own freelancer media" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own freelancer media" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users read own verification documents" ON storage.objects;

CREATE POLICY "Public reads freelancer media" ON storage.objects FOR SELECT USING (bucket_id = 'freelancer-media');
CREATE POLICY "Users upload own freelancer media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'freelancer-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own freelancer media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'freelancer-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own freelancer media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'freelancer-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own verification documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verification-private' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own verification documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'verification-private' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_leadpilot_admin()));
