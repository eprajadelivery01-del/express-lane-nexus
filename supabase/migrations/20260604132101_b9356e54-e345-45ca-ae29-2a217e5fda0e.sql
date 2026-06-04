-- Fix exposed driver personal data: drop public read-all policies
DROP POLICY IF EXISTS "Drivers can view all driver profiles" ON public.delivery_drivers;
DROP POLICY IF EXISTS "Anyone authenticated can select drivers" ON public.delivery_drivers;

-- Scoped SELECT policies for delivery_drivers
CREATE POLICY "Drivers view own profile"
ON public.delivery_drivers FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view all drivers"
ON public.delivery_drivers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Companies view drivers on their deliveries"
ON public.delivery_drivers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.companies c ON c.id = d.company_id
    WHERE d.driver_id = delivery_drivers.id AND c.user_id = auth.uid()
  )
);

-- Fix exposed companies email/phone: drop public SELECT-all policy
DROP POLICY IF EXISTS "Permitir leitura publica das empresas" ON public.companies;
DROP POLICY IF EXISTS "companies_select_all_authenticated" ON public.companies;
