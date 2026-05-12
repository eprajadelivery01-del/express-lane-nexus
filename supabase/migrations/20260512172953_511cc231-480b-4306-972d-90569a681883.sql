
-- 1) invitations: remove blanket anon lookup; rely on secured RPC
DROP POLICY IF EXISTS "Allow anonymous lookup by token" ON public.invitations;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- 2) deliveries: remove broad available-deliveries SELECT exposing PII
DROP POLICY IF EXISTS "Drivers can view available deliveries" ON public.deliveries;

-- 3) customers: allow user to read own row
DROP POLICY IF EXISTS "Customers can view own record" ON public.customers;
CREATE POLICY "Customers can view own record"
ON public.customers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4) platform_settings: restrict reads to authenticated
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated can read platform settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (true);

-- 5) reviews: remove public reads
DROP POLICY IF EXISTS "Public select reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Authenticated can view reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (true);

-- 6) delivery_drivers: scope company reads to drivers linked to their deliveries
DROP POLICY IF EXISTS "Authenticated read delivery_drivers" ON public.delivery_drivers;

CREATE POLICY "Companies read own assigned drivers"
ON public.delivery_drivers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.companies c ON c.id = d.company_id
    WHERE d.driver_id = delivery_drivers.id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins read all delivery_drivers"
ON public.delivery_drivers FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
