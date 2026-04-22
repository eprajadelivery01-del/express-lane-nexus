
-- =========================================================
-- 1. financial_transactions: remove public select
-- =========================================================
DROP POLICY IF EXISTS "Public select financial_transactions" ON public.financial_transactions;

-- =========================================================
-- 2. addresses: remove public select
-- =========================================================
DROP POLICY IF EXISTS "Public select addresses" ON public.addresses;

-- =========================================================
-- 3. wallets: remove permissive policies, keep owner + admin reads
-- =========================================================
DROP POLICY IF EXISTS "System can manage wallets" ON public.wallets;
DROP POLICY IF EXISTS "Public select wallets" ON public.wallets;
DROP POLICY IF EXISTS "Service role can manage wallets" ON public.wallets;

-- =========================================================
-- 4. user_roles: remove the "Permissions_Unlock_Roles" backdoor and public select.
--    Only admins can manage roles; users may only see their own.
-- =========================================================
DROP POLICY IF EXISTS "Permissions_Unlock_Roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public select user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "User can insert own role" ON public.user_roles;

-- Admin manage all roles
DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles;
CREATE POLICY "Admins manage user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 5. profiles: prevent self-role escalation, remove public reads
-- =========================================================
DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profile" ON public.profiles;
DROP POLICY IF EXISTS "Names are public" ON public.profiles;
DROP POLICY IF EXISTS "Permissions_Unlock_Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- Re-create safe self-update that prevents changing role / status
CREATE POLICY "Users update own profile (no role change)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IS NOT DISTINCT FROM (SELECT p2.role FROM public.profiles p2 WHERE p2.user_id = auth.uid())
  AND status IS NOT DISTINCT FROM (SELECT p2.status FROM public.profiles p2 WHERE p2.user_id = auth.uid())
);

CREATE POLICY "Users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND (role IS NULL OR role = 'customer'));

-- =========================================================
-- 6. occurrences and motoboys: enable RLS and add policies
-- =========================================================
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage occurrences" ON public.occurrences;
CREATE POLICY "Admins manage occurrences"
ON public.occurrences
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Drivers manage own occurrences" ON public.occurrences;
CREATE POLICY "Drivers manage own occurrences"
ON public.occurrences
FOR ALL
TO authenticated
USING (driver_id = public.get_driver_id(auth.uid()))
WITH CHECK (driver_id = public.get_driver_id(auth.uid()));

DROP POLICY IF EXISTS "Companies view occurrences for own deliveries" ON public.occurrences;
CREATE POLICY "Companies view occurrences for own deliveries"
ON public.occurrences
FOR SELECT
TO authenticated
USING (
  delivery_id IN (
    SELECT d.id FROM public.deliveries d
    JOIN public.companies c ON c.id = d.company_id
    WHERE c.user_id = auth.uid()
  )
);

ALTER TABLE public.motoboys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage motoboys" ON public.motoboys;
CREATE POLICY "Admins manage motoboys"
ON public.motoboys
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated read motoboys" ON public.motoboys;
CREATE POLICY "Authenticated read motoboys"
ON public.motoboys
FOR SELECT
TO authenticated
USING (true);

-- =========================================================
-- 7. realtime.messages: remove blanket policy
-- =========================================================
DROP POLICY IF EXISTS "RLS for Realtime" ON realtime.messages;

-- =========================================================
-- 8. Other tables with overly permissive "Public select" leftovers
-- =========================================================
DROP POLICY IF EXISTS "Public select chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public select customers" ON public.customers;
DROP POLICY IF EXISTS "Public select payments" ON public.payments;
DROP POLICY IF EXISTS "Public select products" ON public.products;
DROP POLICY IF EXISTS "Public select conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public select messages" ON public.messages;
DROP POLICY IF EXISTS "Public select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public select delivery_drivers" ON public.delivery_drivers;
DROP POLICY IF EXISTS "Public select delivery_occurrences" ON public.delivery_occurrences;
DROP POLICY IF EXISTS "Public select delivery_ratings" ON public.delivery_ratings;
DROP POLICY IF EXISTS "Public select driver_earnings" ON public.driver_earnings;
DROP POLICY IF EXISTS "Public select driver_location_history" ON public.driver_location_history;
DROP POLICY IF EXISTS "Public select invitations" ON public.invitations;
DROP POLICY IF EXISTS "Public select notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public select platform_settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Drivers can view all driver profiles" ON public.delivery_drivers;

-- Replace with safe authenticated reads where needed
DROP POLICY IF EXISTS "Authenticated read driver_drivers" ON public.delivery_drivers;
CREATE POLICY "Authenticated read delivery_drivers"
ON public.delivery_drivers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'company'::app_role)
);

-- Customers: order owners can re-create items
CREATE POLICY "Customers insert own order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.customer_id = auth.uid() OR o.user_id = auth.uid())
  )
);

-- =========================================================
-- 9. Storage: remove emergency / unauthenticated upload policies
-- =========================================================
DROP POLICY IF EXISTS "Emergency Upload store-assets" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Owner Delete" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Insert Store" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Update Store" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Delete Store" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Insert Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Update Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Emergency Delete Avatar" ON storage.objects;

-- Authenticated upload to avatars (owner-scoped folder)
CREATE POLICY "Authenticated upload to avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners update own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid())
WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Owners delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

-- store-assets: only company users can write into their own folder
CREATE POLICY "Companies upload own store-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners update own store-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'store-assets' AND owner = auth.uid())
WITH CHECK (bucket_id = 'store-assets' AND owner = auth.uid());

CREATE POLICY "Owners delete own store-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'store-assets' AND owner = auth.uid());
