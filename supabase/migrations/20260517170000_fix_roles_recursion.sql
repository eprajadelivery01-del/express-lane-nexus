BEGIN;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
    END LOOP;
END
$$;

CREATE POLICY "user_roles_select_safe" ON public.user_roles
FOR SELECT TO authenticated
USING (true);

COMMIT;
