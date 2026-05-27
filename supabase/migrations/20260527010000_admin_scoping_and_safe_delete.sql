-- Migration: 20260527010000_admin_scoping_and_safe_delete
-- Description:
--   1. Add `created_by_admin_id` column to delivery_drivers and companies
--      so each admin manages only their own subordinates.
--   2. Create safe RPC functions for deleting drivers and users (clients)
--      that handle all FK dependencies in the correct order.

BEGIN;

-- ============================================================
-- 1. Admin Scoping columns
-- ============================================================

-- Add created_by_admin_id to delivery_drivers
ALTER TABLE public.delivery_drivers
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add created_by_admin_id to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: assign all existing drivers/companies to the first admin found
-- (fallback so nothing is left orphaned)
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT ur.user_id INTO v_admin_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ORDER BY ur.id
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    UPDATE public.delivery_drivers
    SET created_by_admin_id = v_admin_id
    WHERE created_by_admin_id IS NULL;

    UPDATE public.companies
    SET created_by_admin_id = v_admin_id
    WHERE created_by_admin_id IS NULL;
  END IF;
END $$;


-- ============================================================
-- 2. RPC: safe_delete_driver(p_driver_id UUID)
--    Deletes a delivery_driver record + auth user safely,
--    removing all FK-dependent rows first.
-- ============================================================

CREATE OR REPLACE FUNCTION public.safe_delete_driver(p_driver_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_delivery_ids UUID[];
BEGIN
  -- Only admins may call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get the linked auth user
  SELECT user_id INTO v_user_id
  FROM public.delivery_drivers
  WHERE id = p_driver_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  -- Collect delivery IDs assigned to this driver
  SELECT ARRAY(SELECT id FROM public.deliveries WHERE driver_id = p_driver_id)
  INTO v_delivery_ids;

  -- 1. Delete reviews written about this driver
  DELETE FROM public.reviews WHERE driver_id = p_driver_id;

  -- 2. Delete occurrences for this driver
  DELETE FROM public.occurrences WHERE driver_id = p_driver_id;

  -- 3. Delete delivery_ratings for deliveries assigned to this driver (linked by delivery_id)
  IF v_delivery_ids IS NOT NULL AND array_length(v_delivery_ids, 1) > 0 THEN
    DELETE FROM public.delivery_ratings WHERE delivery_id = ANY(v_delivery_ids);
  END IF;

  -- 4. Delete driver earnings (references driver_id directly)
  DELETE FROM public.driver_earnings WHERE driver_id = p_driver_id;

  -- 5. Delete location history (references driver_id directly)
  DELETE FROM public.driver_location_history WHERE driver_id = p_driver_id;

  -- 6. Nullify driver_id on deliveries (preserve history, don't delete the delivery record)
  UPDATE public.deliveries SET driver_id = NULL WHERE driver_id = p_driver_id;

  -- 7. Delete chat messages sent by this user
  DELETE FROM public.chat_messages WHERE sender_id = v_user_id;

  -- 8. Delete chat message logs sent by this user
  DELETE FROM public.chat_message_logs WHERE sender_id = v_user_id;

  -- 9. Delete the delivery_drivers record
  DELETE FROM public.delivery_drivers WHERE id = p_driver_id;

  -- 10. Delete user_roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- 11. Delete profile
  DELETE FROM public.profiles WHERE user_id = v_user_id;

  -- 12. Delete auth user (cascades anything remaining)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Grant execute to authenticated users (RLS inside function ensures only admins succeed)
GRANT EXECUTE ON FUNCTION public.safe_delete_driver(UUID) TO authenticated;


-- ============================================================
-- 3. RPC: safe_delete_customer(p_user_id UUID)
--    Deletes a customer / client user account safely.
-- ============================================================

CREATE OR REPLACE FUNCTION public.safe_delete_customer(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only admins may call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get customer record id
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE user_id = p_user_id;

  IF v_customer_id IS NOT NULL THEN
    -- Nullify customer references on orders (preserve order history)
    UPDATE public.orders SET customer_id = NULL WHERE customer_id = v_customer_id;
    -- Delete addresses
    DELETE FROM public.addresses WHERE customer_id = v_customer_id;
    -- Delete user coupons
    DELETE FROM public.user_coupons WHERE user_id = p_user_id;
    -- Delete the customer record
    DELETE FROM public.customers WHERE id = v_customer_id;
  END IF;

  -- Delete chat messages sent by this user
  DELETE FROM public.chat_messages WHERE sender_id = p_user_id;
  DELETE FROM public.chat_message_logs WHERE sender_id = p_user_id;

  -- Delete user_roles
  DELETE FROM public.user_roles WHERE user_id = p_user_id;

  -- Delete profile (ON DELETE CASCADE from auth.users will also do this, but be explicit)
  DELETE FROM public.profiles WHERE user_id = p_user_id;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_delete_customer(UUID) TO authenticated;


-- ============================================================
-- 4. Reload PostgREST schema cache
-- ============================================================

COMMIT;

NOTIFY pgrst, 'reload schema';
