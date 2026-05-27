-- ========================================================
-- Migration: 20260527140000_allow_multiple_roles
-- Description: Creates RPC to safely query user IDs by email to allow cross-panel registration
-- ========================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- 1. Check if caller is admin or service_role
    -- We allow service_role by checking if auth.uid() is null (since service_role usually lacks a session)
    -- OR we check if the authenticated user is an admin.
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- 2. Query auth.users
    SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    RETURN v_id;
END;
$$;

-- Grant execute to authenticated users (so the edge function can call it using anon key with JWT, or service role)
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated, service_role;

-- 3. Fix missing 'active' status on delivery drivers created via edge function
-- Actually, the edge function code will be updated, but we should make sure existing pending drivers become active if they were created by admin
UPDATE public.delivery_drivers 
SET status = 'active'
WHERE status = 'pending' AND created_by_admin_id IS NOT NULL;

COMMIT;
