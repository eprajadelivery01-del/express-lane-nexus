
-- Fix privilege escalation & broad profile exposure
DROP POLICY IF EXISTS "Users and Admins can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone authenticated can select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles jwt fallback" ON public.profiles;

-- Replace ALL-policy with scoped INSERT/DELETE (UPDATE handled by Profiles_Final_Update; admin updates via separate policy)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
