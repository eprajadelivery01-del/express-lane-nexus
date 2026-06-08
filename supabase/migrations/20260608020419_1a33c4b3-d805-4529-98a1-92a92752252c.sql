
-- 1. Simplify has_role: only user_roles table is trusted
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

-- 2. Drop hardcoded-email fallback policies
DROP POLICY IF EXISTS "Admins can manage orders jwt fallback" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage regions jwt fallback" ON public.regions;
DROP POLICY IF EXISTS "Admins can view all roles jwt fallback" ON public.user_roles;

-- 3. driver_earnings: restrict to authenticated only
DROP POLICY IF EXISTS "Drivers can view own earnings" ON public.driver_earnings;

-- 4. companies: revoke sensitive columns from anon (column-level grant)
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, name, category, description, logo_url, cover_url, banner_url, gallery,
  rating, delivery_fee, is_open, is_active, show_in_marketplace, active,
  business_hours, opening_hours, city_id, region_id, city, state, zip_code,
  address, latitude, longitude, delivery_mode, commission_percentage,
  user_id, created_at, updated_at, created_by_admin_id
) ON public.companies TO anon;
