-- Migration: 20260517005000_ultimate_rls_nuke
-- Description: Dynamic cleanup of all legacy policies on major tables.
-- Establishes clean, high-performance, non-recursive RLS rules.

BEGIN;

-- ==========================================
-- 1. CLEANUP public.user_roles
-- ==========================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY %I ON public.user_roles', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT TO authenticated USING (true);


-- ==========================================
-- 2. CLEANUP public.profiles
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Profiles_Final_Select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles_Final_Update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);


-- ==========================================
-- 3. CLEANUP public.delivery_drivers
-- ==========================================
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'delivery_drivers' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY %I ON public.delivery_drivers', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Drivers_Final_Select" ON public.delivery_drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Drivers_Final_Update" ON public.delivery_drivers FOR UPDATE TO authenticated USING (auth.uid() = user_id);


-- ==========================================
-- 4. CLEANUP public.deliveries
-- ==========================================
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'deliveries' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY %I ON public.deliveries', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "deliveries_select_stable" ON public.deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "deliveries_manage_stable" ON public.deliveries FOR UPDATE TO authenticated 
  USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()) OR
    auth.uid() = driver_id
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
