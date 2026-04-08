-- ======================================================================================
-- RLS PERFORMANCE OPTIMIZATION - NEXUSPRO
-- Resolves Auth Timeouts by simplifying permission checks
-- ======================================================================================

BEGIN;

-- 1. [SYSTEM_LOGS] OPTIMIZE ADMIN POLICY
-- Original policy used public.has_role() which can be slow for large table scans.
-- Replacing with a direct EXISTS subquery which is easier for the planner to optimize.
DROP POLICY IF EXISTS "Only admins can view logs" ON public.system_logs;

CREATE POLICY "Only admins can view logs" ON public.system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 2. [PROFILES] ENSURE INDEX ON USER_ID
-- Many RLS policies join on profiles.user_id. Ensuring an index exists.
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 3. [USER_ROLES] ENSURE INDEX ON USER_ID & ROLE
-- This is hit on EVERY auth check.
CREATE INDEX IF NOT EXISTS idx_user_roles_composite ON public.user_roles(user_id, role);

COMMIT;
