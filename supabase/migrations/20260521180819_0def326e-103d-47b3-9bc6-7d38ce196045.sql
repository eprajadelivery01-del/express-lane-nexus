
DROP POLICY IF EXISTS "Active products visible to all" ON public.products;
CREATE POLICY "Active products visible to all"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true AND active = true);
