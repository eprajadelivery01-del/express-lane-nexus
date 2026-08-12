-- 1. Remove overly permissive full-row public policy on companies
DROP POLICY IF EXISTS companies_select_public ON public.companies;

-- Column-level access for anonymous marketplace browsing (safe columns only)
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, name, description, category, logo_url, banner_url, cover_url, rating,
  delivery_fee, opening_hours, business_hours, is_open, is_active, active,
  show_in_marketplace, city_id, latitude, longitude, delivery_mode, created_at,
  city, state, prep_time, prep_time_min, prep_time_max, region_id
) ON public.companies TO anon;

CREATE POLICY companies_select_marketplace_anon
ON public.companies
FOR SELECT
TO anon
USING (show_in_marketplace = true AND COALESCE(is_active, true) = true);

-- 2. Make the public view respect the querying user's permissions
ALTER VIEW public.companies_public SET (security_invoker = on);
GRANT SELECT ON public.companies_public TO anon, authenticated;

-- 3. Fix mutable search_path on push notification trigger functions
ALTER FUNCTION public.trigger_send_push_on_order() SET search_path = public;
ALTER FUNCTION public.trigger_send_push_on_order_update() SET search_path = public;
ALTER FUNCTION public.trigger_send_push_on_marketing_notification() SET search_path = public;