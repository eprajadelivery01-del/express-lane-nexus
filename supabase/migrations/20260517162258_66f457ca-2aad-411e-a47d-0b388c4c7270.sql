
-- Remove permissive catch-all SELECT policies
DROP POLICY IF EXISTS "customers_select_stable" ON public.customers;
DROP POLICY IF EXISTS "orders_select_stable" ON public.orders;
DROP POLICY IF EXISTS "deliveries_select_stable" ON public.deliveries;
DROP POLICY IF EXISTS "companies_select_stable" ON public.companies;
DROP POLICY IF EXISTS "user_roles_select_stable" ON public.user_roles;

-- Add scoped SELECT policies for deliveries (replacing the blanket true policy)
CREATE POLICY "Drivers view own deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (driver_id = public.get_driver_id(auth.uid()));

CREATE POLICY "Companies view own deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Customers view own deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (
  order_id IN (
    SELECT o.id FROM public.orders o
    WHERE o.user_id = auth.uid()
       OR o.customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Admins view all deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drivers also need to see broadcasted/pending deliveries available to accept
CREATE POLICY "Drivers view available deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'driver'::app_role)
  AND driver_id IS NULL
  AND status IN ('pending'::delivery_status, 'broadcasted'::delivery_status)
);

-- Fix products: anonymous role should only see active products
DROP POLICY IF EXISTS "Active products visible to all" ON public.products;
CREATE POLICY "Active products visible to all"
ON public.products FOR SELECT TO anon, authenticated
USING (COALESCE(is_active, true) = true AND COALESCE(active, true) = true);
