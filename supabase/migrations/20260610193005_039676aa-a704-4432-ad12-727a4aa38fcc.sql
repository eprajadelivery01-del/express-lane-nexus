
-- 1. blocked_ips_log: enable RLS, admin-only
ALTER TABLE public.blocked_ips_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blocked_ips_log FROM anon, authenticated;
GRANT ALL ON public.blocked_ips_log TO service_role;
DROP POLICY IF EXISTS "Admins read blocked ips" ON public.blocked_ips_log;
CREATE POLICY "Admins read blocked ips" ON public.blocked_ips_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. companies: drop USING(true) policies
DROP POLICY IF EXISTS companies_select_anon ON public.companies;
DROP POLICY IF EXISTS companies_select_authenticated ON public.companies;

-- 3. Replace has_profile_role with has_role in RLS
DROP POLICY IF EXISTS "Admins manage earnings" ON public.driver_earnings;
CREATE POLICY "Admins manage earnings" ON public.driver_earnings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage occurrences" ON public.delivery_occurrences;
CREATE POLICY "Admins manage occurrences" ON public.delivery_occurrences
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage ratings" ON public.delivery_ratings;
CREATE POLICY "Admins manage ratings" ON public.delivery_ratings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage regions" ON public.regions;
CREATE POLICY "Admins manage regions" ON public.regions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read all locations" ON public.driver_location_history;
CREATE POLICY "Admins read all locations" ON public.driver_location_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Chat participants read messages" ON public.chat_messages;
CREATE POLICY "Chat participants read messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = chat_messages.delivery_id
        AND (d.driver_id = public.get_driver_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- 4. Pin search_path on functions
CREATE OR REPLACE FUNCTION public.check_order_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  recent_orders_count INT;
BEGIN
  SELECT COUNT(id) INTO recent_orders_count
  FROM public.orders
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_orders_count >= 2 THEN
    RAISE EXCEPTION 'Rate limit excedido: Você está fazendo pedidos muito rápido.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.shield_bot_by_ip()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_client_ip TEXT;
  v_spam_count INT;
  v_email TEXT;
BEGIN
  BEGIN
    v_client_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
    v_client_ip := split_part(v_client_ip, ',', 1);
  EXCEPTION WHEN OTHERS THEN
    v_client_ip := 'unknown';
  END;

  NEW.client_ip := v_client_ip;

  IF v_client_ip IS NOT NULL AND v_client_ip != 'unknown' AND v_client_ip != '' THEN
    SELECT COUNT(id) INTO v_spam_count
    FROM public.orders
    WHERE client_ip = v_client_ip
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_spam_count >= 3 THEN
      SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
      INSERT INTO public.blocked_ips_log (ip_address, email_tentativa)
      VALUES (v_client_ip, v_email);
      RETURN NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
