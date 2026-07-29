DROP POLICY IF EXISTS "Anyone can view active and visible companies" ON public.companies;
DROP POLICY IF EXISTS companies_select_public ON public.companies;

REVOKE ALL ON public.companies FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

DROP VIEW IF EXISTS public.companies_public;
CREATE VIEW public.companies_public AS
SELECT id, name, description, category, logo_url, banner_url, cover_url,
       rating, delivery_fee, opening_hours, business_hours, is_open,
       is_active, active, show_in_marketplace, city_id, latitude, longitude,
       delivery_mode, created_at
FROM public.companies
WHERE show_in_marketplace = true AND coalesce(is_active, true) = true;

GRANT SELECT ON public.companies_public TO anon, authenticated;

DROP POLICY IF EXISTS drivers_select_for_companies ON public.delivery_drivers;
CREATE POLICY drivers_select_for_companies ON public.delivery_drivers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.deliveries d
    JOIN public.companies c ON c.id = d.company_id
    WHERE d.driver_id = delivery_drivers.id
      AND c.user_id = auth.uid()
  )
  OR delivery_drivers.company_id IN (
    SELECT c2.id FROM public.companies c2 WHERE c2.user_id = auth.uid()
  )
);