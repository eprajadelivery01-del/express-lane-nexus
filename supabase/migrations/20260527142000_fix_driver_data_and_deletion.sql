-- ========================================================
-- Migration: 20260527142000_fix_driver_data_and_deletion
-- Description: Adds missing profile columns directly to delivery_drivers and syncs them.
-- ========================================================

BEGIN;

-- 1. Add missing columns to delivery_drivers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_drivers' AND column_name = 'full_name') THEN
        ALTER TABLE public.delivery_drivers ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_drivers' AND column_name = 'phone') THEN
        ALTER TABLE public.delivery_drivers ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_drivers' AND column_name = 'document') THEN
        ALTER TABLE public.delivery_drivers ADD COLUMN document TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_drivers' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.delivery_drivers ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 2. Synchronize data from profiles to delivery_drivers
UPDATE public.delivery_drivers d
SET 
    full_name = COALESCE(d.full_name, p.full_name),
    phone = COALESCE(d.phone, p.phone),
    document = COALESCE(d.document, p.document),
    avatar_url = COALESCE(d.avatar_url, p.avatar_url)
FROM public.profiles p
WHERE d.user_id = p.user_id;

-- 3. Replace safe_delete_driver to be absolutely bulletproof
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
  -- Check permission
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

  -- Collect deliveries to clean up reviews/ratings
  SELECT ARRAY(SELECT id FROM public.deliveries WHERE driver_id = p_driver_id)
  INTO v_delivery_ids;

  DELETE FROM public.reviews WHERE driver_id = p_driver_id;
  DELETE FROM public.occurrences WHERE driver_id = p_driver_id;

  IF v_delivery_ids IS NOT NULL AND array_length(v_delivery_ids, 1) > 0 THEN
    DELETE FROM public.delivery_ratings WHERE delivery_id = ANY(v_delivery_ids);
  END IF;

  DELETE FROM public.driver_earnings WHERE driver_id = p_driver_id;
  DELETE FROM public.driver_location_history WHERE driver_id = p_driver_id;
  
  -- Unlink deliveries
  UPDATE public.deliveries SET driver_id = NULL WHERE driver_id = p_driver_id;
  
  -- Delete chat messages
  DELETE FROM public.chat_messages WHERE sender_id = v_user_id;
  DELETE FROM public.chat_message_logs WHERE sender_id = v_user_id;

  -- Delete the driver record
  DELETE FROM public.delivery_drivers WHERE id = p_driver_id;

  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = v_user_id;

  -- Delete from auth.users securely
  DELETE FROM auth.users WHERE id = v_user_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_delete_driver(UUID) TO authenticated;

COMMIT;
