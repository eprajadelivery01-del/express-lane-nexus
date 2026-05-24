
-- Restrict delivery_drivers SELECT to: self, admin, or company with an assigned delivery.
DROP POLICY IF EXISTS "Drivers_Select_Stable" ON public.delivery_drivers;

CREATE POLICY "delivery_drivers_select_scoped"
ON public.delivery_drivers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.deliveries d
    JOIN public.companies c ON c.id = d.company_id
    WHERE d.driver_id = delivery_drivers.id
      AND c.user_id = auth.uid()
  )
);
