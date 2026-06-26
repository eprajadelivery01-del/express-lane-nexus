-- EMERGENCY FIX: Restore user_roles select access

BEGIN;

-- 1. Ensure authenticated users have the baseline privilege to SELECT
GRANT SELECT ON public.user_roles TO authenticated;

-- 2. Drop the recursive or broken policies
DROP POLICY IF EXISTS "user_roles_select_stable" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_emergency" ON public.user_roles;

-- 3. Create a non-recursive policy for SELECT
CREATE POLICY "user_roles_select_emergency" ON public.user_roles
FOR SELECT TO authenticated USING (
    -- Allow users to read their own roles without any subqueries
    user_id = auth.uid() 
    OR 
    -- Allow admins to read all roles, checking the JWT safely
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    OR
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin')
);

-- 4. Fix function ownership to ensure SECURITY DEFINER bypasses RLS
ALTER FUNCTION public.has_profile_role(uuid, text) OWNER TO postgres;

COMMIT;
