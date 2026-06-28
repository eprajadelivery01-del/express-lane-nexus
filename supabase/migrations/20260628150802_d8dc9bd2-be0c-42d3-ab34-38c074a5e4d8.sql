
-- 1) Remove broad anon SELECT policy that exposed PII
DROP POLICY IF EXISTS "companies_select_anon" ON public.companies;

-- Revoke broad SELECT and grant only safe (non-PII) columns to anon
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, name, logo_url, banner_url, cover_url, description, category,
  rating, delivery_fee, is_open, is_active, active, business_hours,
  opening_hours, gallery, show_in_marketplace, city, state, city_id,
  region_id, latitude, longitude, delivery_mode, prep_time,
  prep_time_min, prep_time_max, created_at
) ON public.companies TO anon;

-- 2) Fix mutable search_path on functions
CREATE OR REPLACE FUNCTION public.get_driver_earnings_summary(p_driver_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(total_deliveries integer, gross_earnings numeric, platform_fee numeric, net_earnings numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    v_commission_rate NUMERIC;
BEGIN
    SELECT COALESCE(commission_rate, 0.40) INTO v_commission_rate
    FROM public.delivery_drivers WHERE id = p_driver_id;

    RETURN QUERY
    SELECT 
        COUNT(id)::INT AS total_deliveries,
        COALESCE(SUM(commission), 0) AS gross_earnings,
        (COUNT(id) * v_commission_rate) AS platform_fee,
        COALESCE(SUM(commission), 0) - (COUNT(id) * v_commission_rate) AS net_earnings
    FROM public.deliveries
    WHERE driver_id = p_driver_id
      AND status = 'completed'
      AND created_at >= p_start_date
      AND created_at <= p_end_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_send_push_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  PERFORM net.http_post(
      url := 'https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW),
        'old_record', null
      )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Push notification webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
