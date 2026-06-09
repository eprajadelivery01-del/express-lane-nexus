
-- 1) Junction: cupons restritos a um conjunto de lojas
CREATE TABLE IF NOT EXISTS public.coupon_companies (
  coupon_id  uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, company_id)
);

GRANT SELECT ON public.coupon_companies TO authenticated;
GRANT ALL ON public.coupon_companies TO service_role;

ALTER TABLE public.coupon_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_companies_select_authenticated"
  ON public.coupon_companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "coupon_companies_admin_all"
  ON public.coupon_companies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_coupon_companies_company ON public.coupon_companies(company_id);

-- 2) Permitir que clientes autenticados validem cupons globais ativos
DROP POLICY IF EXISTS "Users view coupons for their companies" ON public.coupons;

CREATE POLICY "Read active coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (
    active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Admins read all coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) RPC para o marketplace pré-validar cupom com escopo de loja
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_company_id uuid,
  p_subtotal numeric
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_discount numeric := 0;
  v_has_scope boolean;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Código vazio');
  END IF;

  SELECT * INTO v_coupon FROM public.coupons
   WHERE code = upper(trim(p_code)) AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupom inválido');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupom expirado');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL
     AND COALESCE(v_coupon.used_count, 0) >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Limite de uso atingido');
  END IF;

  IF v_coupon.min_order_value IS NOT NULL AND p_subtotal < v_coupon.min_order_value THEN
    RETURN jsonb_build_object('valid', false,
      'reason', 'Pedido mínimo de R$ ' || v_coupon.min_order_value::text);
  END IF;

  -- Escopo
  IF v_coupon.company_id IS NOT NULL AND v_coupon.company_id <> p_company_id THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupom não vale nesta loja');
  END IF;

  IF v_coupon.company_id IS NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.coupon_companies WHERE coupon_id = v_coupon.id)
      INTO v_has_scope;
    IF v_has_scope AND NOT EXISTS (
      SELECT 1 FROM public.coupon_companies
       WHERE coupon_id = v_coupon.id AND company_id = p_company_id
    ) THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Cupom não vale nesta loja');
    END IF;
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := p_subtotal * v_coupon.discount_value / 100;
    IF v_coupon.max_discount_value IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_coupon.max_discount_value);
    END IF;
  ELSE
    v_discount := LEAST(p_subtotal, v_coupon.discount_value);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'discount', round(v_discount, 2),
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'description', v_coupon.description
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid, numeric) TO authenticated, anon;

-- 4) Atualizar create_order_v3 para respeitar escopo + limite/expiração
CREATE OR REPLACE FUNCTION public.create_order_v3(
  p_items jsonb,
  p_company_id uuid,
  p_address_id uuid,
  p_payment_method text,
  p_coupon_code text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_needs_change boolean DEFAULT false,
  p_change_for numeric DEFAULT NULL::numeric,
  p_idempotency_key text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_order_id uuid;
  v_user_id uuid;
  v_customer_id uuid;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_item record;
  v_product record;
  v_company record;
  v_address record;
  v_coupon record;
  v_final_notes text;
  v_delivery_address text;
  v_region_id uuid;
  v_coupon_ok boolean;
  v_has_scope boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  SELECT * INTO v_address FROM public.addresses WHERE id = p_address_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Address not found');
  END IF;

  SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Company not found');
  END IF;

  SELECT id INTO v_customer_id FROM public.customers WHERE user_id = v_user_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (user_id, name)
    VALUES (v_user_id, COALESCE((SELECT full_name FROM public.profiles WHERE id = v_user_id), 'Cliente'))
    RETURNING id INTO v_customer_id;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('order_id', v_order_id, 'idempotent', true);
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity int, notes text, options jsonb)
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Product ' || v_item.product_id || ' not found');
    END IF;
    IF v_product.company_id != p_company_id THEN
      RETURN jsonb_build_object('error', 'Product ' || v_item.product_id || ' does not belong to company');
    END IF;
    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
  END LOOP;

  IF p_coupon_code IS NOT NULL AND p_coupon_code != '' THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE code = UPPER(p_coupon_code) AND active = true;
    IF FOUND THEN
      v_coupon_ok := true;

      IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now() THEN
        v_coupon_ok := false;
      END IF;

      IF v_coupon.usage_limit IS NOT NULL
         AND COALESCE(v_coupon.used_count, 0) >= v_coupon.usage_limit THEN
        v_coupon_ok := false;
      END IF;

      IF v_coupon.min_order_value IS NOT NULL AND v_subtotal < v_coupon.min_order_value THEN
        v_coupon_ok := false;
      END IF;

      -- Escopo por loja
      IF v_coupon.company_id IS NOT NULL AND v_coupon.company_id <> p_company_id THEN
        v_coupon_ok := false;
      END IF;

      IF v_coupon_ok AND v_coupon.company_id IS NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.coupon_companies WHERE coupon_id = v_coupon.id)
          INTO v_has_scope;
        IF v_has_scope AND NOT EXISTS (
          SELECT 1 FROM public.coupon_companies
           WHERE coupon_id = v_coupon.id AND company_id = p_company_id
        ) THEN
          v_coupon_ok := false;
        END IF;
      END IF;

      IF v_coupon_ok THEN
        IF v_coupon.discount_type = 'percentage' THEN
          v_discount := (v_subtotal * v_coupon.discount_value / 100);
          IF v_coupon.max_discount_value IS NOT NULL THEN
            v_discount := LEAST(v_discount, v_coupon.max_discount_value);
          END IF;
        ELSE
          v_discount := LEAST(v_subtotal, v_coupon.discount_value);
        END IF;

        UPDATE public.coupons
           SET used_count = COALESCE(used_count, 0) + 1
         WHERE id = v_coupon.id;
      END IF;
    END IF;
  END IF;

  IF v_company.delivery_fee IS NOT NULL THEN
    v_delivery_fee := v_company.delivery_fee;
  ELSE
    SELECT id, COALESCE(price, delivery_fee, 0) INTO v_region_id, v_delivery_fee
    FROM public.regions
    WHERE active = true
    ORDER BY price ASC LIMIT 1;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_delivery_fee;

  v_final_notes := p_notes;
  IF p_payment_method = 'money' AND p_needs_change AND p_change_for IS NOT NULL THEN
    v_final_notes := COALESCE(v_final_notes || ' • ', '') || 'Troco para R$ ' || p_change_for::text;
  END IF;

  v_delivery_address := v_address.street || ', ' || v_address.number || ' - ' || v_address.neighborhood || ', ' || v_address.city;

  INSERT INTO public.orders (
    customer_id, user_id, company_id, status, total, delivery_fee,
    delivery_address, payment_method, notes, idempotency_key, region_id,
    delivery_latitude, delivery_longitude
  ) VALUES (
    v_customer_id, v_user_id, p_company_id, 'pending', v_total, v_delivery_fee,
    v_delivery_address, p_payment_method, v_final_notes, p_idempotency_key, v_region_id,
    v_address.latitude, v_address.longitude
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, quantity, price, unit_price, product_name, notes, options)
  SELECT v_order_id, x.product_id, x.quantity, p.price, p.price, p.name, x.notes, x.options
  FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity int, notes text, options jsonb)
  JOIN public.products p ON p.id = x.product_id;

  INSERT INTO public.deliveries (
    order_id, company_id, pickup_address, delivery_address,
    pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude,
    status, value, price, region_id
  ) VALUES (
    v_order_id, p_company_id, v_company.address, v_delivery_address,
    v_company.latitude, v_company.longitude, v_address.latitude, v_address.longitude,
    'pending', v_total, v_delivery_fee, v_region_id
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;
