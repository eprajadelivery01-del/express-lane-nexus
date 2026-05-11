BEGIN;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;

ALTER FUNCTION public.get_driver_id(uuid) SECURITY INVOKER;
ALTER FUNCTION public.is_driver(uuid) SECURITY INVOKER;

COMMIT;