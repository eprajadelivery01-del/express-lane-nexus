
-- 1. chat_message_logs: ensure session ownership on insert
DROP POLICY IF EXISTS "Inserir mensagens" ON public.chat_message_logs;
CREATE POLICY "Inserir mensagens em sessões próprias"
ON public.chat_message_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND session_id IN (
    SELECT id FROM public.chat_sessions WHERE customer_id = auth.uid()
  )
);

-- 2. deliveries insert: require driver to be active if driver_id is set
DROP POLICY IF EXISTS "deliveries_admin_company_insert" ON public.deliveries;
CREATE POLICY "deliveries_admin_company_insert"
ON public.deliveries
FOR INSERT
TO authenticated
WITH CHECK (
  (
    has_role(auth.uid(), 'admin'::app_role)
    OR company_id IN (SELECT c.id FROM public.companies c WHERE c.user_id = auth.uid())
  )
  AND (
    driver_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.delivery_drivers dd
      WHERE dd.id = deliveries.driver_id
        AND dd.status = 'active'::public.driver_status
    )
  )
);

-- 3. delivery_drivers: scope company access to drivers on their deliveries only
DROP POLICY IF EXISTS "drivers_company_select_all" ON public.delivery_drivers;
CREATE POLICY "drivers_company_select_linked"
ON public.delivery_drivers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'company'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.companies c ON c.id = d.company_id
    WHERE d.driver_id = delivery_drivers.id
      AND c.user_id = auth.uid()
  )
);
