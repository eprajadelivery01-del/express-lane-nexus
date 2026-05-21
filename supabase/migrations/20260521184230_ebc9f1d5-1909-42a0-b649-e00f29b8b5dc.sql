
-- 1. Invitations: remove public SELECT, keep admin ALL. Lookups continue via get_invitation_by_token RPC.
DROP POLICY IF EXISTS "invitations_public_read" ON public.invitations;

-- 2. Driver self-update cannot change status (admin approval flow protection)
DROP POLICY IF EXISTS "Drivers_Final_Update" ON public.delivery_drivers;
CREATE POLICY "Drivers_Final_Update" ON public.delivery_drivers
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status IS NOT DISTINCT FROM (
      SELECT dd2.status FROM public.delivery_drivers dd2 WHERE dd2.user_id = auth.uid()
    )
  );

-- 3. Companies: restrict sensitive PII (document, email) from anonymous viewers.
--    Public storefront keeps name/phone/address etc. Authenticated users still see all.
DROP POLICY IF EXISTS "Public users can view active companies" ON public.companies;
CREATE POLICY "Anonymous storefront view of active companies"
  ON public.companies
  FOR SELECT TO anon
  USING (active = true AND is_active = true);
CREATE POLICY "Authenticated view of active companies"
  ON public.companies
  FOR SELECT TO authenticated
  USING (active = true AND is_active = true);
-- Revoke column-level SELECT on sensitive PII columns for anon role
REVOKE SELECT (document, email) ON public.companies FROM anon;

-- 4. Coupons: require authentication to read coupon codes
DROP POLICY IF EXISTS "Clientes podem ver cupons ativos" ON public.coupons;
CREATE POLICY "Authenticated users can view active coupons"
  ON public.coupons
  FOR SELECT TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- 5. Realtime: tighten topic format to exactly "<table>:<uuid>" (two segments, second = auth.uid())
DROP POLICY IF EXISTS "Users can only subscribe to their own topics" ON realtime.messages;
CREATE POLICY "Users can only subscribe to their own topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    array_length(regexp_split_to_array(topic, ':'), 1) = 2
    AND split_part(topic, ':', 2) = auth.uid()::text
  );

-- 6. Storage store-assets: restrict listing to own company folder.
--    Public URLs remain available since the bucket is public.
DROP POLICY IF EXISTS "Secure Select Store" ON storage.objects;
CREATE POLICY "Companies can list own store-assets"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR (storage.foldername(name))[1] IN (
        SELECT (id)::text FROM public.companies WHERE user_id = auth.uid()
      )
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );
