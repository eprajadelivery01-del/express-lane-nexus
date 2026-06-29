
ALTER FUNCTION public.get_davinyn_admin_id() SET search_path = public, auth;
ALTER FUNCTION public.sync_order_status_from_delivery() SET search_path = public;
ALTER FUNCTION public.update_delivery_status_safe(uuid, text, uuid) SET search_path = public;
