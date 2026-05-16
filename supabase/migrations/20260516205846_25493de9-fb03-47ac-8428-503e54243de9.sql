
-- 1. Drop "Temp bypass" public policies
DROP POLICY IF EXISTS "Temp bypass deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Temp bypass profiles" ON public.profiles;
DROP POLICY IF EXISTS "Temp bypass drivers" ON public.delivery_drivers;
DROP POLICY IF EXISTS "Temp bypass companies" ON public.companies;

-- 2. Restrict public company listing to active companies only
DROP POLICY IF EXISTS "Public users can view companies" ON public.companies;
CREATE POLICY "Public users can view active companies"
ON public.companies
FOR SELECT
TO anon, authenticated
USING (COALESCE(active, true) = true AND COALESCE(is_active, true) = true);

-- 3. Tighten driver self-assign policy on deliveries to require driver role
DROP POLICY IF EXISTS "Drivers can update assigned deliveries" ON public.deliveries;
CREATE POLICY "Drivers can update assigned deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()))
  OR (
    status = ANY (ARRAY['pending'::delivery_status, 'broadcasted'::delivery_status])
    AND driver_id IS NULL
    AND has_role(auth.uid(), 'driver'::app_role)
    AND EXISTS (SELECT 1 FROM public.delivery_drivers WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix function search_path mutable on create_order_v3
ALTER FUNCTION public.create_order_v3(jsonb, uuid, uuid, text, text, text, boolean, numeric, text) SET search_path = public;
