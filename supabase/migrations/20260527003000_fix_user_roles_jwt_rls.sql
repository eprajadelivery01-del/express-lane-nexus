-- Migration: 20260527003000_fix_user_roles_jwt_rls
-- Description: Overwrites recursive and unsafe RLS policies on public.user_roles 
-- to use the local auth.jwt() function, preventing database schema query errors.
-- Also ensures manual admin user accounts have all required non-null fields populated.

BEGIN;

-- 1. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop all conflicting policies on public.user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_read_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_read_authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_self_select" ON public.user_roles;

-- 3. Create high-performance, non-recursive RLS policies using auth.jwt()
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 4. Fix Scan Errors on existing manually provisioned users by ensuring
-- GoTrue required string fields are empty strings ('') instead of NULL
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  recovery_token = COALESCE(recovery_token, '')
WHERE email IN ('davinynsilva@gmail.com', 'testedelivery@gmail.com');

COMMIT;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
