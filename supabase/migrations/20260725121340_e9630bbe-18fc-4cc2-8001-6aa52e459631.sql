
-- 1. companies: revoke sensitive PII columns from anon
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, name, logo_url, banner_url, cover_url, description, category,
  city_id, city, state, zip_code, region_id, latitude, longitude,
  is_active, active, show_in_marketplace, opening_hours, business_hours,
  delivery_fee, delivery_mode, rating, is_open, gallery,
  prep_time, prep_time_min, prep_time_max, timezone, user_id,
  created_at, updated_at
) ON public.companies TO anon;

-- 2. coupon_companies: restrict SELECT to admins & members of the linkage
DROP POLICY IF EXISTS "coupon_companies_select_public" ON public.coupon_companies;
DROP POLICY IF EXISTS "coupon_companies_select_authenticated" ON public.coupon_companies;
CREATE POLICY "coupon_companies_select_scoped" ON public.coupon_companies
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

-- 3. has_role: remove profiles fallback
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- 4. reviews: add WITH CHECK on update
DROP POLICY IF EXISTS "Users can update reviews" ON public.reviews;
CREATE POLICY "Users can update reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
