-- ========================================================
-- Migration: 20260527130000_fix_duplicate_deliveries_trigger
-- Description: Fixes handle_order_ready_automation to prevent duplicate deliveries and cleans up existing duplicates.
-- ========================================================

BEGIN;

-- 1. Fix the trigger function to prevent creating a second delivery
CREATE OR REPLACE FUNCTION public.handle_order_ready_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_customer_name TEXT;
    v_address TEXT;
    v_delivery_id UUID;
    v_motoboy_id UUID;
BEGIN
    IF (NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready')) THEN
        -- Check if a delivery is already linked to this order
        IF NEW.delivery_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        -- Also check if a delivery exists with this order_id just in case
        SELECT id INTO v_delivery_id FROM public.deliveries WHERE order_id = NEW.id LIMIT 1;
        IF v_delivery_id IS NOT NULL THEN
            UPDATE public.orders SET delivery_id = v_delivery_id WHERE id = NEW.id;
            RETURN NEW;
        END IF;

        BEGIN
            IF (NEW.user_id IS NOT NULL) THEN
                SELECT full_name INTO v_customer_name FROM public.profiles WHERE user_id = NEW.user_id;
            ELSE
                SELECT c.name INTO v_customer_name FROM public.customers c WHERE c.id = NEW.customer_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_customer_name := 'Cliente';
        END;

        BEGIN
            IF (NEW.address_id IS NOT NULL) THEN
                SELECT (street || ', ' || COALESCE(number, 'S/N') || ' - ' || neighborhood || ' - ' || city)
                INTO v_address FROM public.addresses WHERE id = NEW.address_id;
            ELSE
                v_address := NEW.delivery_address;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_address := 'Endereço não informado';
        END;

        -- Safe check for motoboys table existence to avoid errors if it was removed
        BEGIN
            SELECT id INTO v_motoboy_id FROM public.motoboys WHERE is_online = true LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_motoboy_id := NULL;
        END;

        INSERT INTO public.deliveries (
            company_id,
            order_id,
            customer_name,
            address,
            value,
            status,
            motoboy_id,
            created_at,
            updated_at
        ) VALUES (
            NEW.company_id,
            NEW.id,
            COALESCE(v_customer_name, 'Cliente'),
            COALESCE(v_address, 'Endereço não informado'),
            NEW.total,
            'pending',
            v_motoboy_id,
            now(),
            now()
        ) RETURNING id INTO v_delivery_id;

        UPDATE public.orders SET delivery_id = v_delivery_id WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

-- 2. Clean up existing duplicated deliveries
DO $$
DECLARE
    v_order RECORD;
    v_original_delivery_id UUID;
BEGIN
    FOR v_order IN SELECT id, delivery_id FROM public.orders WHERE delivery_id IS NOT NULL
    LOOP
        -- Find the delivery that was originally created for this order (has order_id = v_order.id)
        SELECT id INTO v_original_delivery_id FROM public.deliveries WHERE order_id = v_order.id LIMIT 1;
        
        IF v_original_delivery_id IS NOT NULL AND v_original_delivery_id != v_order.delivery_id THEN
            -- Fix the order to point to the original delivery
            UPDATE public.orders SET delivery_id = v_original_delivery_id WHERE id = v_order.id;
            
            -- Delete the duplicated delivery created by the trigger (which had order_id IS NULL)
            DELETE FROM public.deliveries WHERE id = v_order.delivery_id AND order_id IS NULL;
        END IF;
    END LOOP;
END;
$$;

COMMIT;
