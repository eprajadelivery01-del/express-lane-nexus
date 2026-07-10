CREATE OR REPLACE FUNCTION public.sync_profile_to_customer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'customer')
     OR EXISTS (SELECT 1 FROM public.customers WHERE user_id = NEW.user_id) THEN

    INSERT INTO public.customers (user_id, name, phone)
    VALUES (NEW.user_id, NEW.full_name, NEW.phone)
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone;
  END IF;

  RETURN NEW;
END;
$function$;