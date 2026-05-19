CREATE OR REPLACE FUNCTION public.is_order_visible_to_user(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND (
        public.has_role(_user_id, 'admin'::public.app_role)
        OR public.is_company_owner(_user_id, o.company_id)
        OR o.user_id = _user_id
        OR EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = o.customer_id
            AND c.user_id = _user_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.deliveries d
          WHERE d.order_id = o.id
            AND d.driver_id = public.get_driver_id(_user_id)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_order_visible_to_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_order_visible_to_user(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_delivery_visible_to_user(_user_id uuid, _delivery_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
          AND public.get_driver_id(_user_id) IS NOT NULL
        )
        OR (
          d.order_id IS NOT NULL
          AND public.is_order_visible_to_user(_user_id, d.order_id)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_delivery_visible_to_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_delivery_visible_to_user(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _viewer_id = _profile_user_id
    OR public.has_role(_viewer_id, 'admin'::public.app_role)
    OR (
      public.has_role(_viewer_id, 'company'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.companies c ON c.id = o.company_id
        LEFT JOIN public.customers cu ON cu.id = o.customer_id
        WHERE c.user_id = _viewer_id
          AND (
            o.user_id = _profile_user_id
            OR cu.user_id = _profile_user_id
          )
      )
    )
    OR (
      public.get_driver_id(_viewer_id) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.deliveries d
        JOIN public.orders o ON o.id = d.order_id
        LEFT JOIN public.customers cu ON cu.id = o.customer_id
        WHERE d.driver_id = public.get_driver_id(_viewer_id)
          AND (
            o.user_id = _profile_user_id
            OR cu.user_id = _profile_user_id
          )
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_write_order_items(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND (
        public.has_role(_user_id, 'admin'::public.app_role)
        OR public.is_company_owner(_user_id, o.company_id)
        OR o.user_id = _user_id
        OR EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = o.customer_id
            AND c.user_id = _user_id
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_write_order_items(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_order_items(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "deliveries_admin_select" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_company_select" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_customer_select" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_driver_select_assigned" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_driver_select_available" ON public.deliveries;

CREATE POLICY "deliveries_select_scoped" ON public.deliveries
FOR SELECT TO authenticated
USING (public.is_delivery_visible_to_user(auth.uid(), id));

DROP POLICY IF EXISTS "orders_company_select" ON public.orders;
DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
DROP POLICY IF EXISTS "orders_driver_select" ON public.orders;

CREATE POLICY "orders_select_scoped" ON public.orders
FOR SELECT TO authenticated
USING (public.is_order_visible_to_user(auth.uid(), id));

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_company_select_customers" ON public.profiles;
DROP POLICY IF EXISTS "profiles_driver_select_linked" ON public.profiles;

CREATE POLICY "profiles_select_scoped" ON public.profiles
FOR SELECT TO authenticated
USING (public.can_view_profile(auth.uid(), user_id));

DROP POLICY IF EXISTS "order_items_select_scoped" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_scoped" ON public.order_items;

CREATE POLICY "order_items_select_scoped" ON public.order_items
FOR SELECT TO authenticated
USING (public.is_order_visible_to_user(auth.uid(), order_id));

CREATE POLICY "order_items_insert_scoped" ON public.order_items
FOR INSERT TO authenticated
WITH CHECK (public.can_write_order_items(auth.uid(), order_id));