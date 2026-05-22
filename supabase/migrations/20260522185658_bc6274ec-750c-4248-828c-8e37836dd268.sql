
-- 1. chat_message_logs: companies can read messages from their sessions
CREATE POLICY "Companies read own chat_message_logs"
ON public.chat_message_logs
FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT cs.id FROM public.chat_sessions cs
    JOIN public.companies c ON c.id = cs.company_id
    WHERE c.user_id = auth.uid()
  )
);

-- 2. coupons: scope to company the user is ordering from (or global coupons)
DROP POLICY IF EXISTS "Authenticated users can view active coupons" ON public.coupons;

CREATE POLICY "Users view coupons for their companies"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (company_id IS NOT NULL AND public.is_company_owner(auth.uid(), company_id))
  )
);

-- 3. storage.objects: store-assets DELETE by company members
DROP POLICY IF EXISTS "Owners delete own store-assets" ON storage.objects;

CREATE POLICY "Company members delete store-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = (auth.uid())::text
    OR (storage.foldername(name))[1] IN (
      SELECT (companies.id)::text FROM public.companies WHERE companies.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 4. withdrawals: remove direct insert; require RPC
DROP POLICY IF EXISTS "User can insert own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "User can request withdrawal" ON public.withdrawals;

-- 5. invitations: remove permissive public read/update policies
DROP POLICY IF EXISTS "invitations_public_read" ON public.invitations;
DROP POLICY IF EXISTS "invitations_public_update" ON public.invitations;
