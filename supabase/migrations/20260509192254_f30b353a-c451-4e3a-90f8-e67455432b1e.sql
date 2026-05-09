
-- 1. Fix has_profile_role to use user_id column
CREATE OR REPLACE FUNCTION public.has_profile_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2. Invitations: remove public-readable policy, add server-side token lookup function
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(id uuid, email text, role text, status text, expires_at timestamptz, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, email, role, status, expires_at, created_at
  FROM public.invitations
  WHERE token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- 3. Financial transactions: scope INSERT to caller
DROP POLICY IF EXISTS "System can insert transactions" ON public.financial_transactions;

CREATE POLICY "Users can insert own transactions"
ON public.financial_transactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Deliveries: tighten driver update WITH CHECK
DROP POLICY IF EXISTS "Drivers can claim and update their deliveries" ON public.deliveries;

CREATE POLICY "Drivers can claim and update their deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  ((status = 'broadcasted'::delivery_status) AND public.has_role(auth.uid(), 'driver'::app_role))
  OR (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()))
)
WITH CHECK (
  driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
);

-- 5. Set search_path on remaining functions
ALTER FUNCTION public.handle_delivery_completion() SET search_path = public;
ALTER FUNCTION public.handle_delivery_completion_v3() SET search_path = public;
ALTER FUNCTION public.get_business_orders_v2(uuid) SET search_path = public;

-- 6. Remove broad listing policies on public storage buckets (direct public URL access still works)
DROP POLICY IF EXISTS "Anyone view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public view company media" ON storage.objects;
DROP POLICY IF EXISTS "Public view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access store-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Select Store" ON storage.objects;
