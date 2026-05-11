
-- 1. Withdrawals: remove public select
DROP POLICY IF EXISTS "Public select withdrawals" ON public.withdrawals;

-- 2. System logs: remove public select
DROP POLICY IF EXISTS "Public select system_logs" ON public.system_logs;

-- 3. Deliveries: remove unauthenticated/broad policies
DROP POLICY IF EXISTS "Drivers can view broadcasted deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Drivers can update deliveries" ON public.deliveries;

-- Recreate driver-broadcast view restricted to authenticated drivers
CREATE POLICY "Drivers view broadcasted deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  status = 'broadcasted'::delivery_status
  AND has_role(auth.uid(), 'driver'::app_role)
);

-- 4. Profiles: fix broken self-read policy
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Storage: remove broad INSERT policies (folder-scoped ALL policies remain)
DROP POLICY IF EXISTS "Auth upload company media" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;

-- 6. Revoke EXECUTE on internal SECURITY DEFINER functions (only triggers/admin should call these)
REVOKE EXECUTE ON FUNCTION public.process_payment_split(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_delivery_payment(uuid) FROM anon, authenticated;
