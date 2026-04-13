-- ======================================================================================
-- FIX DRIVER VISIBILITY: ADD SUPPORT FOR 'BROADCASTED' STATUS
-- ======================================================================================

BEGIN;

-- 1. Update SELECT policy for drivers
-- Allows drivers to see deliveries that are either 'pending' or 'broadcasted' 
-- and don't have a driver assigned yet (or are assigned to them)
DROP POLICY IF EXISTS "Drivers can view pending deliveries" ON public.deliveries;
CREATE POLICY "Drivers can view available deliveries" ON public.deliveries
  FOR SELECT USING (
    (status IN ('pending', 'broadcasted') AND driver_id IS NULL AND public.has_role(auth.uid(), 'driver'))
    OR
    (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()))
    OR
    (public.has_role(auth.uid(), 'admin'))
  );

-- 2. Update UPDATE policy for drivers
-- Allows drivers to "accept" a delivery that is 'pending' or 'broadcasted'
DROP POLICY IF EXISTS "Drivers can update assigned deliveries" ON public.deliveries;
CREATE POLICY "Drivers can update deliveries" ON public.deliveries
  FOR UPDATE USING (
    (status IN ('pending', 'broadcasted') AND driver_id IS NULL AND public.has_role(auth.uid(), 'driver'))
    OR
    (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    -- Only allow status transitions to 'accepted' if accepting, or other valid steps if assigned
    (status = 'accepted' AND driver_id IS NOT NULL)
    OR
    (driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()))
  );

COMMIT;
