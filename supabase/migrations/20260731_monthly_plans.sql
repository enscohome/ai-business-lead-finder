-- Prepared for review only. Do not enable paid checkout until this migration is applied.
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_plan_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_plan_check CHECK (plan IN ('free', 'starter', 'pro', 'agency'));

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS usage_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS usage_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_messages_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS csv_exports_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_email_token TEXT,
  ADD COLUMN IF NOT EXISTS paystack_transaction_reference TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_paystack_customer_idx ON public.user_profiles(paystack_customer_code) WHERE paystack_customer_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_paystack_subscription_idx ON public.user_profiles(paystack_subscription_code) WHERE paystack_subscription_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_paystack_reference_idx ON public.user_profiles(paystack_transaction_reference) WHERE paystack_transaction_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.processed_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('paystack')),
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.processed_payment_events ENABLE ROW LEVEL SECURITY;

UPDATE public.user_profiles
SET searches_limit = CASE plan WHEN 'agency' THEN 1500 WHEN 'pro' THEN 500 WHEN 'starter' THEN 150 ELSE 20 END,
    leads_limit = CASE plan WHEN 'agency' THEN NULL WHEN 'pro' THEN NULL WHEN 'starter' THEN 100 ELSE 5 END,
    usage_period_start = COALESCE(usage_period_start, date_trunc('month', now())),
    usage_period_end = COALESCE(usage_period_end, date_trunc('month', now()) + interval '1 month');

CREATE OR REPLACE FUNCTION public.increment_search_count(user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_count INTEGER;
BEGIN
  UPDATE public.user_profiles SET searches_today = searches_today + 1
  WHERE id = user_id AND id = auth.uid() AND searches_today < searches_limit
  RETURNING searches_today INTO current_count;
  RETURN current_count;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_search_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_search_count(UUID) TO authenticated;
