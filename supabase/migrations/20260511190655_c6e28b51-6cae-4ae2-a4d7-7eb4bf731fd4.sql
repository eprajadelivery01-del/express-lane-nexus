BEGIN;

-- Remove driver-wide access to unassigned deliveries containing customer PII.
DROP POLICY IF EXISTS "Drivers can view available deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Drivers view broadcasted deliveries" ON public.deliveries;

CREATE POLICY "Drivers can view assigned deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  driver_id = public.get_driver_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Restrict chat message updates to read-state only.
DROP POLICY IF EXISTS "Users update own messages read status" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users update chat read status" ON public.chat_messages;

CREATE POLICY "Recipients can mark chat messages as read"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.deliveries d
    WHERE d.id = chat_messages.delivery_id
      AND (
        d.driver_id = public.get_driver_id(auth.uid())
        OR d.company_id IN (
          SELECT c.id
          FROM public.companies c
          WHERE c.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
)
WITH CHECK (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.deliveries d
    WHERE d.id = chat_messages.delivery_id
      AND (
        d.driver_id = public.get_driver_id(auth.uid())
        OR d.company_id IN (
          SELECT c.id
          FROM public.companies c
          WHERE c.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

CREATE OR REPLACE FUNCTION public.enforce_chat_message_read_only_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.delivery_id IS DISTINCT FROM OLD.delivery_id
     OR NEW.sender_role IS DISTINCT FROM OLD.sender_role
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the read status may be updated on chat messages';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_chat_message_read_only_update ON public.chat_messages;
CREATE TRIGGER enforce_chat_message_read_only_update
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_chat_message_read_only_update();

-- Remove overly permissive payment inserts.
DROP POLICY IF EXISTS "Authenticated can insert payments" ON public.payments;

-- Remove broken duplicate earnings policy.
DROP POLICY IF EXISTS "Drivers can view own earnings" ON public.driver_earnings;

-- Move chat policies that rely on helper functions off the public role.
DROP POLICY IF EXISTS "Participantes podem visualizar mensagens de chat" ON public.chat_messages;
CREATE POLICY "Participantes podem visualizar mensagens de chat"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.deliveries d
    WHERE d.id = chat_messages.delivery_id
      AND (
        d.driver_id IN (
          SELECT dd.id
          FROM public.delivery_drivers dd
          WHERE dd.user_id = auth.uid()
        )
        OR d.company_id IN (
          SELECT c.id
          FROM public.companies c
          WHERE c.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

DROP POLICY IF EXISTS "Validação de identidade rigorosa para mensagens de chat" ON public.chat_messages;
CREATE POLICY "Validação de identidade rigorosa para mensagens de chat"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (sender_role IS NULL OR public.has_role(auth.uid(), sender_role::public.app_role))
  AND EXISTS (
    SELECT 1
    FROM public.deliveries d
    WHERE d.id = delivery_id
      AND (
        d.driver_id IN (
          SELECT dd.id
          FROM public.delivery_drivers dd
          WHERE dd.user_id = auth.uid()
        )
        OR d.company_id IN (
          SELECT c.id
          FROM public.companies c
          WHERE c.user_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can view all transactions" ON public.financial_transactions;
CREATE POLICY "Admin can view all transactions"
ON public.financial_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can manage all payments" ON public.payments;
CREATE POLICY "Admin can manage all payments"
ON public.payments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can manage settings" ON public.platform_settings;
CREATE POLICY "Admin can manage settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Lower privilege or remove direct execution for definer functions not meant to be called from the client.
ALTER FUNCTION public.find_region_for_point(double precision, double precision) SECURITY INVOKER;
ALTER FUNCTION public.get_delivery_price(double precision, double precision) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.get_business_orders_v2(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_delivery_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_delivery_completion_v3() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.liberate_order_on_delivery_cancel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_delivery_completed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_payment_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_delivery_payment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_payment_split(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_driver_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_driver_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_order_status_v4(uuid, public.order_status) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_chat_message_read_only_update() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_profile_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_driver_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_driver(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_profile_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_driver_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_region_for_point(double precision, double precision) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_price(double precision, double precision) TO anon, authenticated;

COMMIT;