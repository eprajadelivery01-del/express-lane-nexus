-- 1. Fix mutable search_path on remaining functions
ALTER FUNCTION public.notify_driver_trigger() SET search_path = public;
ALTER FUNCTION public.push_title_for_status(text) SET search_path = public;
ALTER FUNCTION public.trigger_send_push_on_delivery() SET search_path = public;

-- 2. Replace fully public SELECT policy on companies
DROP POLICY IF EXISTS "companies_select_all" ON public.companies;

CREATE POLICY "companies_select_marketplace_anon" ON public.companies
  FOR SELECT TO anon
  USING (COALESCE(show_in_marketplace, false) = true AND COALESCE(is_active, true) = true);

CREATE POLICY "companies_select_owner_admin_or_marketplace" ON public.companies
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin_safe()
    OR (COALESCE(show_in_marketplace, false) = true AND COALESCE(is_active, true) = true)
  );

-- anon only gets non-sensitive marketplace columns (no email, phone, document)
GRANT SELECT (
  id, name, logo_url, banner_url, cover_url, description, category, rating,
  city, state, city_id, region_id, latitude, longitude, address,
  opening_hours, business_hours, timezone, delivery_fee, delivery_mode,
  prep_time, prep_time_min, prep_time_max, gallery, is_open, is_active, active,
  show_in_marketplace, created_at
) ON public.companies TO anon;

-- 3. Make marketplace view respect the caller's RLS instead of the view owner's
ALTER VIEW public.companies_public SET (security_invoker = on);