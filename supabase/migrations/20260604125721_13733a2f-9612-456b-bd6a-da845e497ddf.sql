
-- Fix profiles privilege escalation: drop overly broad FOR ALL policy + permissive SELECT,
-- and add a scoped self-insert that forces role='customer'.
DROP POLICY IF EXISTS "Users and Admins can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone authenticated can select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile (customer only)"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (role IS NULL OR role = 'customer'));
