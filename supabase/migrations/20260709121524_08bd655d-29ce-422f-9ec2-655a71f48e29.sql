
-- 1. Fix mutable function search paths
ALTER FUNCTION public.sync_product_active_status() SET search_path = public;
ALTER FUNCTION public.intercept_and_fix_delivery_fee() SET search_path = public;
ALTER FUNCTION public.update_company_rating() SET search_path = public;

-- 2. Companies PII exposure: restrict anon to non-sensitive columns only
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, name, address, city, state, zip_code, logo_url, is_active,
  created_at, updated_at, banner_url, description, latitude, longitude,
  opening_hours, delivery_mode, city_id, active, category, rating,
  delivery_fee, cover_url, is_open, business_hours, gallery,
  show_in_marketplace, region_id, prep_time, prep_time_min, prep_time_max,
  timezone
) ON public.companies TO anon;

-- 3. messages: remove permissive "RLS for Realtime" policy if it exists
DROP POLICY IF EXISTS "RLS for Realtime" ON public.messages;

-- 4. realtime.messages: remove open USING(true) policy
DROP POLICY IF EXISTS "RLS for Realtime" ON realtime.messages;

-- 5. storage.objects — products bucket: enforce ownership by company folder
DROP POLICY IF EXISTS "Lojistas podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Lojistas podem deletar fotos velhas" ON storage.objects;

CREATE POLICY "Companies upload own product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.companies c WHERE c.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Companies delete own product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'products'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.companies c WHERE c.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Companies update own product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'products'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] IN (
      SELECT c.id::text FROM public.companies c WHERE c.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 6. user_roles: restrict SELECT to self or admin
DROP POLICY IF EXISTS "user_roles_select_safe" ON public.user_roles;

CREATE POLICY "user_roles_select_self_or_admin"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
