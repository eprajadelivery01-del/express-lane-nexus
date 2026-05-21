
-- 1. Fix privilege escalation via profiles.role
DROP POLICY IF EXISTS "Profiles_Final_Update" ON public.profiles;
CREATE POLICY "Profiles_Final_Update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role IS NOT DISTINCT FROM (SELECT p2.role FROM public.profiles p2 WHERE p2.user_id = auth.uid())
    AND status IS NOT DISTINCT FROM (SELECT p2.status FROM public.profiles p2 WHERE p2.user_id = auth.uid())
  );

-- 2. Allow companies to read their own chat_sessions
CREATE POLICY "Companies read own chat sessions"
  ON public.chat_sessions
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

-- 3. Remove duplicate admin policy on delivery_occurrences (the one without WITH CHECK)
DROP POLICY IF EXISTS "Admins manage all occurrences" ON public.delivery_occurrences;

-- 4. Remove duplicate driver earnings SELECT policy using legacy is_driver()
DROP POLICY IF EXISTS "Drivers see own earnings" ON public.driver_earnings;

-- 5. Remove duplicate driver location SELECT policies using legacy is_driver()
DROP POLICY IF EXISTS "Drivers read own location" ON public.driver_location_history;
DROP POLICY IF EXISTS "Admins read locations" ON public.driver_location_history;

-- 6. Restrict payments policies from {public} to {authenticated}
DROP POLICY IF EXISTS "Company can view their payments" ON public.payments;
CREATE POLICY "Company can view their payments"
  ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.companies c ON o.company_id = c.id
      WHERE o.id = payments.order_id AND c.user_id = auth.uid()
    )
  );

-- 7. Atomic wallet withdrawal RPC to prevent race condition
CREATE OR REPLACE FUNCTION public.request_wallet_withdrawal(_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  UPDATE public.wallets
    SET balance = balance - _amount,
        updated_at = now()
    WHERE user_id = v_user_id AND balance >= _amount
    RETURNING id INTO v_wallet_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  INSERT INTO public.financial_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -_amount, 'withdrawal', 'Saque solicitado');

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.request_wallet_withdrawal(numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(numeric) TO authenticated;

-- 8. Restrict get_invitation_by_token to non-sensitive fields (omit email)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'id', i.id,
    'role', i.role,
    'status', i.status,
    'expires_at', i.expires_at,
    'created_at', i.created_at
  )
  FROM public.invitations i
  WHERE i.token = _token AND i.status = 'pending'
  LIMIT 1;
$$;
