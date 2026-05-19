
-- ============== DELIVERIES ==============
DROP POLICY IF EXISTS "deliveries_authenticated_select" ON public.deliveries;

CREATE POLICY "deliveries_admin_select" ON public.deliveries
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "deliveries_company_select" ON public.deliveries
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "deliveries_driver_select_assigned" ON public.deliveries
  FOR SELECT TO authenticated
  USING (driver_id = public.get_driver_id(auth.uid()));

CREATE POLICY "deliveries_driver_select_available" ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    driver_id IS NULL
    AND status IN ('pending'::delivery_status, 'broadcasted'::delivery_status)
    AND public.get_driver_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "deliveries_customer_select" ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.user_id = auth.uid()
         OR o.customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  );

-- ============== DELIVERY_DRIVERS ==============
DROP POLICY IF EXISTS "Drivers_Final_Select" ON public.delivery_drivers;

CREATE POLICY "drivers_self_select" ON public.delivery_drivers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "drivers_admin_select" ON public.delivery_drivers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "drivers_company_select_linked" ON public.delivery_drivers
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT d.driver_id FROM public.deliveries d
      JOIN public.companies c ON c.id = d.company_id
      WHERE c.user_id = auth.uid() AND d.driver_id IS NOT NULL
    )
  );

CREATE POLICY "drivers_customer_select_linked" ON public.delivery_drivers
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT d.driver_id FROM public.deliveries d
      JOIN public.orders o ON o.id = d.order_id
      WHERE d.driver_id IS NOT NULL
        AND (o.user_id = auth.uid()
             OR o.customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
    )
  );

-- ============== PROFILES ==============
DROP POLICY IF EXISTS "Profiles_Final_Select" ON public.profiles;

CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_company_select_customers" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT o.user_id FROM public.orders o
      JOIN public.companies c ON c.id = o.company_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "profiles_driver_select_linked" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT o.user_id FROM public.orders o
      JOIN public.deliveries d ON d.order_id = o.id
      WHERE d.driver_id = public.get_driver_id(auth.uid())
    )
  );

-- ============== ORDERS ==============
DROP POLICY IF EXISTS "orders_manage_stable" ON public.orders;
DROP POLICY IF EXISTS "orders_select_stable" ON public.orders;

CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "orders_customer_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "orders_customer_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "orders_company_select" ON public.orders
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "orders_company_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "orders_company_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "orders_driver_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT order_id FROM public.deliveries WHERE driver_id = public.get_driver_id(auth.uid()))
  );

-- ============== ORDER ITEMS ==============
DROP POLICY IF EXISTS "order_items_manage_stable" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_stable" ON public.order_items;

CREATE POLICY "order_items_admin_all" ON public.order_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "order_items_select_scoped" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.user_id = auth.uid()
         OR o.customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
         OR o.company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
         OR o.id IN (SELECT order_id FROM public.deliveries WHERE driver_id = public.get_driver_id(auth.uid()))
    )
  );

CREATE POLICY "order_items_insert_scoped" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.user_id = auth.uid()
         OR o.customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
         OR o.company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "order_items_update_scoped" ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    )
  );

-- ============== PAYMENTS (anon insert) ==============
DROP POLICY IF EXISTS "Users can only insert payments for their own orders" ON public.payments;

CREATE POLICY "Users can only insert payments for their own orders"
  ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = payments.order_id
        AND (
          orders.user_id = auth.uid()
          OR orders.customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
          OR orders.company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
        )
    )
  );

-- ============== USER ROLES ==============
DROP POLICY IF EXISTS "user_roles_read_all" ON public.user_roles;

CREATE POLICY "user_roles_self_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_admin_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
