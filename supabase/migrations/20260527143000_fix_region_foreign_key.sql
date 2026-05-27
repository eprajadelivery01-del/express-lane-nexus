-- ========================================================
-- Migration: 20260527143000_fix_region_foreign_key
-- Description: Changes region_id foreign key on deliveries to ON DELETE SET NULL
-- ========================================================

BEGIN;

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_region_id_fkey;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL;

COMMIT;
