
-- 1. Companies: remove COALESCE fallback
DROP POLICY IF EXISTS "Public users can view active companies" ON public.companies;
CREATE POLICY "Public users can view active companies"
ON public.companies
FOR SELECT
TO anon, authenticated
USING (active = true AND is_active = true);

-- 2. Customers: replace overly-broad policy with scoped ones
DROP POLICY IF EXISTS "customers_manage_stable" ON public.customers;

CREATE POLICY "Companies update linked customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'company'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.companies co ON co.id = o.company_id
    WHERE o.customer_id = customers.id AND co.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'company'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.companies co ON co.id = o.company_id
    WHERE o.customer_id = customers.id AND co.user_id = auth.uid()
  )
);

CREATE POLICY "Companies delete linked customers"
ON public.customers
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'company'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.companies co ON co.id = o.company_id
    WHERE o.customer_id = customers.id AND co.user_id = auth.uid()
  )
);

-- 3. Deliveries: require driver to be active to view available pending deliveries
CREATE OR REPLACE FUNCTION public.is_delivery_visible_to_user(_user_id uuid, _delivery_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.deliveries d
    WHERE d.id = _delivery_id
      AND (
        public.has_role(_user_id, 'admin'::public.app_role)
        OR public.is_company_owner(_user_id, d.company_id)
        OR (d.driver_id IS NOT NULL AND d.driver_id = public.get_driver_id(_user_id))
        OR (
          d.driver_id IS NULL
          AND d.status IN ('pending'::public.delivery_status, 'broadcasted'::public.delivery_status)
          AND EXISTS (
            SELECT 1 FROM public.delivery_drivers dd
            WHERE dd.user_id = _user_id
              AND dd.status = 'active'::public.driver_status
          )
        )
        OR (
          d.order_id IS NOT NULL
          AND public.is_order_visible_to_user(_user_id, d.order_id)
        )
      )
  );
$function$;
