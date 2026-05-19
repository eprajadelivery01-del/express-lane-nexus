
-- 1) Restaurar funções auxiliares como SECURITY DEFINER (quebram o loop de RLS)
CREATE OR REPLACE FUNCTION public.get_driver_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.delivery_drivers WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_driver(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.delivery_drivers WHERE user_id = _user_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_driver_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_driver(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver(uuid) TO authenticated;

-- 2) Helper: is_company_owner para deliveries
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies WHERE id = _company_id AND user_id = _user_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_company_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_company_owner(uuid, uuid) TO authenticated;

-- 3) Recriar policies de delivery_drivers sem JOIN circular com deliveries
DROP POLICY IF EXISTS "drivers_self_select" ON public.delivery_drivers;
DROP POLICY IF EXISTS "drivers_admin_select" ON public.delivery_drivers;
DROP POLICY IF EXISTS "drivers_company_select_linked" ON public.delivery_drivers;
DROP POLICY IF EXISTS "drivers_customer_select_linked" ON public.delivery_drivers;

CREATE POLICY "drivers_self_select" ON public.delivery_drivers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "drivers_admin_select" ON public.delivery_drivers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Empresa pode listar motoristas (necessário para o painel mostrar entregadores)
CREATE POLICY "drivers_company_select_all" ON public.delivery_drivers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'company'::app_role));

-- 4) Recriar policies de profiles sem JOIN com deliveries
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_company_select_customers" ON public.profiles;
DROP POLICY IF EXISTS "profiles_driver_select_linked" ON public.profiles;

CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Empresa enxerga perfis de clientes que fizeram pedidos para sua loja
CREATE POLICY "profiles_company_select_customers" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'company'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.companies c ON c.id = o.company_id
      WHERE o.user_id = profiles.user_id AND c.user_id = auth.uid()
    )
  );

-- Motorista enxerga perfis dos clientes das entregas atribuídas a ele
CREATE POLICY "profiles_driver_select_linked" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.get_driver_id(auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.deliveries d ON d.order_id = o.id
      WHERE o.user_id = profiles.user_id
        AND d.driver_id = public.get_driver_id(auth.uid())
    )
  );

-- 5) Recriar policies de deliveries usando helpers SECURITY DEFINER
DROP POLICY IF EXISTS "deliveries_admin_select" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_company_select" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_driver_select_assigned" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_driver_select_available" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_customer_select" ON public.deliveries;

CREATE POLICY "deliveries_admin_select" ON public.deliveries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "deliveries_company_select" ON public.deliveries
  FOR SELECT TO authenticated
  USING (public.is_company_owner(auth.uid(), company_id));

CREATE POLICY "deliveries_driver_select_assigned" ON public.deliveries
  FOR SELECT TO authenticated
  USING (driver_id IS NOT NULL AND driver_id = public.get_driver_id(auth.uid()));

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
