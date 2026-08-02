-- Permanent LeadPilot owner entitlement. The owner is identified only by the
-- authenticated user's app_admins row; no email address is stored here.
CREATE OR REPLACE FUNCTION public.is_leadpilot_owner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL
    AND (auth.role() = 'service_role' OR p_user_id = auth.uid())
    AND EXISTS (
    SELECT 1
    FROM public.app_admins
    WHERE user_id = p_user_id AND role = 'owner'
  );
$$;
REVOKE ALL ON FUNCTION public.is_leadpilot_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_leadpilot_owner(UUID) TO authenticated, service_role;

-- Direct authenticated RPC calls use the same owner rule and never deduct an
-- owner's monthly or daily search allowance.
CREATE OR REPLACE FUNCTION public.increment_search_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE current_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_id THEN RETURN NULL; END IF;

  IF public.is_leadpilot_owner() THEN
    SELECT COALESCE(searches_today, 0)
    INTO current_count
    FROM public.user_profiles
    WHERE id = user_id;
    RETURN COALESCE(current_count, 0);
  END IF;

  UPDATE public.user_profiles
  SET searches_today = searches_today + 1
  WHERE id = user_id AND searches_today < searches_limit
  RETURNING searches_today INTO current_count;
  RETURN current_count;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_search_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_search_count(UUID) TO authenticated;
