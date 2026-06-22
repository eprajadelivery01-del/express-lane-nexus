-- Create pricing_tables
CREATE TABLE IF NOT EXISTS public.pricing_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pricing_rules
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_table_id UUID REFERENCES public.pricing_tables(id) ON DELETE CASCADE NOT NULL,
  origin_region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE NOT NULL,
  destination_region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE NOT NULL,
  base_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  return_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pricing_table_id, origin_region_id, destination_region_id)
);

-- Update companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS pricing_table_id UUID REFERENCES public.pricing_tables(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.pricing_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies

-- Admins can do anything
DROP POLICY IF EXISTS "Admins can manage pricing tables" ON public.pricing_tables;
CREATE POLICY "Admins can manage pricing tables" ON public.pricing_tables
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage pricing rules" ON public.pricing_rules;
CREATE POLICY "Admins can manage pricing rules" ON public.pricing_rules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Companies can view ONLY their assigned pricing table (or the default one if they have none)
DROP POLICY IF EXISTS "Companies can view their pricing tables" ON public.pricing_tables;
CREATE POLICY "Companies can view their pricing tables" ON public.pricing_tables
  FOR SELECT USING (
    id = (SELECT pricing_table_id FROM public.companies WHERE user_id = auth.uid() LIMIT 1)
    OR (is_default = true AND (SELECT pricing_table_id FROM public.companies WHERE user_id = auth.uid() LIMIT 1) IS NULL)
  );

DROP POLICY IF EXISTS "Companies can view their pricing rules" ON public.pricing_rules;
CREATE POLICY "Companies can view their pricing rules" ON public.pricing_rules
  FOR SELECT USING (
    pricing_table_id = (SELECT pricing_table_id FROM public.companies WHERE user_id = auth.uid() LIMIT 1)
    OR (
        pricing_table_id IN (SELECT id FROM public.pricing_tables WHERE is_default = true) 
        AND (SELECT pricing_table_id FROM public.companies WHERE user_id = auth.uid() LIMIT 1) IS NULL
    )
  );

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_pricing_tables_updated_at ON public.pricing_tables;
CREATE TRIGGER update_pricing_tables_updated_at
  BEFORE UPDATE ON public.pricing_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON public.pricing_rules;
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Adiciona city_id na tabela delivery_drivers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_drivers' AND column_name='city_id') THEN
    ALTER TABLE public.delivery_drivers ADD COLUMN city_id UUID REFERENCES public.cities(id);
  END IF;
END
$$;

-- Adiciona city_id na view de deliveries (se existir e precisar)
-- E garantir o trigger de preenchimento automático para novas entregas
CREATE OR REPLACE FUNCTION set_delivery_city_id_from_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.city_id IS NULL AND NEW.company_id IS NOT NULL THEN
    SELECT city_id INTO NEW.city_id FROM public.companies WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_delivery_city_id ON public.deliveries;
CREATE TRIGGER trg_set_delivery_city_id
  BEFORE INSERT ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION set_delivery_city_id_from_company();
-- ============================================================
-- Migration: 20260621160000_fix_marketplace_checkout_bugs
-- BUG FIX: 
-- 1. Adds p_delivery_fee to create_order_v3 so frontend calculations are respected.
-- 2. Fixes handle_order_ready_automation so deliveries.value is NEW.delivery_fee (driver pay).
-- 3. Improves customer phone fetch in handle_order_ready_automation from addresses.
-- ============================================================

-- =========================================================
-- 1. Rebuild create_order_v3 with p_delivery_fee
-- =========================================================
DROP FUNCTION IF EXISTS public.create_order_v3(jsonb, uuid, uuid, text, text, text, boolean, numeric, text);

CREATE OR REPLACE FUNCTION public.create_order_v3(
  p_items jsonb,
  p_company_id uuid,
  p_address_id uuid,
  p_payment_method text,
  p_coupon_code text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_needs_change boolean DEFAULT false,
  p_change_for numeric DEFAULT NULL::numeric,
  p_idempotency_key text DEFAULT NULL::text,
  p_delivery_fee numeric DEFAULT NULL::numeric
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
    INSERT INTO public.customers (user_id, name, phone)
    VALUES (v_user_id, COALESCE((SELECT full_name FROM public.profiles WHERE id = v_user_id), 'Cliente'), COALESCE(v_address.phone, (SELECT phone FROM public.profiles WHERE id = v_user_id)))
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

  -- ── RESOLVER A TAXA DE ENTREGA ─────────────────────────────────
  -- Se o frontend passou explicitamente a taxa, usamos ela.
  IF p_delivery_fee IS NOT NULL THEN
    v_delivery_fee := p_delivery_fee;
    v_region_id := v_address.region_id; -- Pega do endereco, se houver
  ELSE
    -- Caso contrario (fallback antigo)
    IF v_company.delivery_fee IS NOT NULL THEN
      v_delivery_fee := v_company.delivery_fee;
    ELSE
      SELECT id, COALESCE(price, delivery_fee, 0) INTO v_region_id, v_delivery_fee
      FROM public.regions
      WHERE active = true
      ORDER BY price ASC LIMIT 1;
    END IF;
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

  RETURN jsonb_build_object('order_id', v_order_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

-- Allow calls
GRANT EXECUTE ON FUNCTION public.create_order_v3 TO authenticated;


-- =========================================================
-- 2. Fix handle_order_ready_automation — populate ALL customer
--    and address fields so drivers see proper data. 
--    FIX BUG: value = NEW.delivery_fee instead of NEW.total
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_order_ready_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_customer_name  TEXT;
    v_customer_phone TEXT;
    v_address        TEXT;
    v_delivery_id    UUID;
    v_company        RECORD;
BEGIN
    -- Only fire when transitioning INTO 'ready' status
    IF NOT (NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready')) THEN
        RETURN NEW;
    END IF;

    -- Skip if a delivery is already linked to this order
    IF NEW.delivery_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Also check by order_id in case delivery_id column wasn't updated yet
    SELECT id INTO v_delivery_id
      FROM public.deliveries
     WHERE order_id = NEW.id AND status != 'cancelled'
     LIMIT 1;

    IF v_delivery_id IS NOT NULL THEN
        -- Link it back in case it wasn't set
        UPDATE public.orders SET delivery_id = v_delivery_id WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    -- ── Resolve customer name and PHONE ────────────────────────────
    BEGIN
        IF NEW.user_id IS NOT NULL THEN
            SELECT full_name, phone
              INTO v_customer_name, v_customer_phone
              FROM public.profiles
             WHERE id = NEW.user_id; -- FIXED: profiles PK is id, not user_id!
        END IF;

        IF (v_customer_name IS NULL OR v_customer_phone IS NULL OR v_customer_phone = '') AND NEW.customer_id IS NOT NULL THEN
            SELECT c.name, COALESCE(c.phone, v_customer_phone)
              INTO v_customer_name, v_customer_phone
              FROM public.customers c
             WHERE c.id = NEW.customer_id;
        END IF;

        -- NOVO: Se o telefone ainda estiver nulo, tentar puxar do address do pedido (caso salvamos)
        IF (v_customer_phone IS NULL OR v_customer_phone = '') AND NEW.address_id IS NOT NULL THEN
            SELECT phone INTO v_customer_phone
              FROM public.addresses
             WHERE id = NEW.address_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- keep defaults
    END;

    v_customer_name  := COALESCE(v_customer_name, 'Cliente');
    v_customer_phone := COALESCE(v_customer_phone, '');

    -- ── Resolve delivery address ───────────────────────────────────
    BEGIN
        IF NEW.address_id IS NOT NULL THEN
            SELECT (street || ', ' || COALESCE(number, 'S/N') || ' - ' || neighborhood || ' - ' || city)
              INTO v_address
              FROM public.addresses
             WHERE id = NEW.address_id;
        END IF;

        IF v_address IS NULL THEN
            v_address := NEW.delivery_address;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_address := NEW.delivery_address;
    END;

    v_address := COALESCE(v_address, 'Endereço não informado');

    -- ── Resolve company (pickup) data ─────────────────────────────
    BEGIN
        SELECT * INTO v_company FROM public.companies WHERE id = NEW.company_id;
    EXCEPTION WHEN OTHERS THEN
        -- leave v_company null; pickup fields will be null
    END;

    -- ── Create the delivery with full customer & address data ──────
    INSERT INTO public.deliveries (
        company_id,
        order_id,
        customer_name,
        customer_phone,
        address,
        dropoff_address,
        delivery_address,
        delivery_latitude,
        delivery_longitude,
        pickup_address,
        pickup_latitude,
        pickup_longitude,
        value,
        price,
        region_id,
        status,
        created_at,
        updated_at
    ) VALUES (
        NEW.company_id,
        NEW.id,
        v_customer_name,
        v_customer_phone,
        v_address,
        v_address,
        v_address,
        NEW.delivery_latitude,
        NEW.delivery_longitude,
        COALESCE(v_company.address, ''),
        v_company.latitude,
        v_company.longitude,
        NEW.delivery_fee,   -- BUG FIX #2: Era NEW.total, agora é apenas a taxa de entrega (p/ motoboy)
        NEW.delivery_fee,   -- price tb como taxa
        NEW.region_id,
        'pending',
        now(),
        now()
    ) RETURNING id INTO v_delivery_id;

    -- Link the order to its new delivery
    UPDATE public.orders SET delivery_id = v_delivery_id WHERE id = NEW.id;

    RETURN NEW;
END;
$function$;
BEGIN;

-- 1. Restore access to all columns on companies for anon to fix SELECT * failures
GRANT SELECT ON public.companies TO anon;

-- 2. Optimize companies RLS to remove expensive EXISTS queries for unauthenticated visitors
DROP POLICY IF EXISTS "Anyone can view active and visible companies" ON public.companies;
DROP POLICY IF EXISTS "companies_select_public" ON public.companies;
DROP POLICY IF EXISTS "companies_select_stable" ON public.companies;

CREATE POLICY "Anyone can view active and visible companies" ON public.companies
  FOR SELECT TO public
  USING (
    (is_active = true AND show_in_marketplace = true)
    OR (auth.uid() = user_id)
    OR (
      CASE 
        WHEN auth.role() = 'authenticated' THEN public.has_role(auth.uid(), 'admin'::public.app_role)
        ELSE false
      END
    )
  );

-- 3. Optimize products RLS to ensure it doesn't do expensive checks for anon
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_select_public" ON public.products;

CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT TO public
  USING (
    is_active = true
    OR (auth.role() = 'authenticated')
  );

-- 4. Restore fast orders policy just in case the marketplace fetches orders
DROP POLICY IF EXISTS orders_select_stable ON public.orders;
CREATE POLICY "orders_select_stable" ON public.orders
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    OR (
      CASE 
        WHEN auth.role() = 'authenticated' THEN public.has_role(auth.uid(), 'admin'::public.app_role)
        ELSE false
      END
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
BEGIN;

-- Força TODAS as lojas a estarem ativas e visíveis.
-- O único controle de Fechada/Aberta passa a ser estritamente o is_open.
UPDATE public.companies
SET 
  active = true,
  is_active = true,
  show_in_marketplace = true;

COMMIT;

NOTIFY pgrst, 'reload schema';
CREATE OR REPLACE FUNCTION public.set_delivery_city_id_from_company()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.city_id IS NULL AND NEW.company_id IS NOT NULL THEN
    SELECT city_id INTO NEW.city_id FROM public.companies WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$function$;
BEGIN;

-- Assegurar que a tabela cities tem RLS ativo
ALTER TABLE IF EXISTS public.cities ENABLE ROW LEVEL SECURITY;

-- Política de SELECT para todos (anon ou authenticated)
DROP POLICY IF EXISTS "cities_select_all" ON public.cities;
CREATE POLICY "cities_select_all" ON public.cities
  FOR SELECT TO public
  USING (true);

-- Política de INSERT para todos (temporário/admin)
DROP POLICY IF EXISTS "cities_insert_all" ON public.cities;
CREATE POLICY "cities_insert_all" ON public.cities
  FOR INSERT TO public
  WITH CHECK (true);

-- Política de UPDATE para todos
DROP POLICY IF EXISTS "cities_update_all" ON public.cities;
CREATE POLICY "cities_update_all" ON public.cities
  FOR UPDATE TO public
  USING (true);

-- Política de DELETE para todos
DROP POLICY IF EXISTS "cities_delete_all" ON public.cities;
CREATE POLICY "cities_delete_all" ON public.cities
  FOR DELETE TO public
  USING (true);

COMMIT;

NOTIFY pgrst, 'reload schema';
BEGIN;

-- Allow anon and authenticated users to read active coupons
DROP POLICY IF EXISTS "coupons_select_public" ON public.coupons;
CREATE POLICY "coupons_select_public" ON public.coupons
  FOR SELECT TO public
  USING (active = true);

-- Allow anon and authenticated users to read coupon_products
DROP POLICY IF EXISTS "coupon_products_select_public" ON public.coupon_products;
CREATE POLICY "coupon_products_select_public" ON public.coupon_products
  FOR SELECT TO public
  USING (true);

COMMIT;

NOTIFY pgrst, 'reload schema';
-- Migration para adicionar fcm_token nas tabelas de usuários

ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Atualizar metadados para garantir sync
NOTIFY pgrst, 'reload schema';
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_driver_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Somente dispara se status for pending ou broadcasted
  IF NEW.status IN ('pending', 'broadcasted') THEN
    PERFORM net.http_post(
      url:='https://nptkxlrhrlssdsevpgqe.supabase.co/functions/v1/notify-driver',
      body:=jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
      ),
      headers:=jsonb_build_object('Content-Type', 'application/json')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS "Notificar_Entregador" ON "public"."deliveries";

CREATE TRIGGER "Notificar_Entregador"
AFTER INSERT OR UPDATE ON "public"."deliveries"
FOR EACH ROW
EXECUTE FUNCTION notify_driver_trigger();
CREATE OR REPLACE FUNCTION public.update_delivery_status_safe(
  p_delivery_id UUID,
  p_status TEXT,
  p_driver_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_status public.delivery_status;
  v_now TIMESTAMPTZ := now();
  v_order_status TEXT;
  v_order_id UUID;
BEGIN
  -- 1. Validate authentication
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- 2. Convert text to enum status
  BEGIN
    v_db_status := p_status::public.delivery_status;
  EXCEPTION WHEN OTHERS THEN
    -- Try mapping delivered to completed or in_transit to in_route
    IF p_status = 'delivered' THEN
      v_db_status := 'completed'::public.delivery_status;
    ELSIF p_status = 'in_transit' THEN
      v_db_status := 'in_route'::public.delivery_status;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Status inválido: ' || p_status);
    END IF;
  END;

  -- 3. Update the delivery record (bypassing RLS because of SECURITY DEFINER)
  UPDATE public.deliveries
  SET 
    status = v_db_status,
    updated_at = v_now,
    driver_id = CASE WHEN p_driver_id IS NOT NULL THEN p_driver_id ELSE driver_id END,
    delivered_at = CASE WHEN v_db_status = 'completed' THEN v_now ELSE delivered_at END,
    accepted_at = CASE WHEN v_db_status = 'accepted' THEN v_now ELSE accepted_at END,
    collected_at = CASE WHEN v_db_status = 'collecting' THEN v_now ELSE collected_at END,
    cancelled_at = CASE WHEN v_db_status = 'cancelled' THEN v_now ELSE cancelled_at END
  WHERE id = p_delivery_id
  RETURNING order_id INTO v_order_id;

  -- 4. Also update any associated order status safely
  BEGIN
    IF v_db_status = 'accepted' THEN 
      v_order_status := 'confirmed';
    ELSIF v_db_status = 'collecting' THEN 
      v_order_status := 'preparing';
    ELSIF v_db_status = 'in_route' THEN 
      v_order_status := 'in_route';
    ELSIF v_db_status = 'completed' THEN 
      v_order_status := 'delivered';
    ELSIF v_db_status = 'cancelled' THEN 
      v_order_status := 'cancelled';
    END IF;

    IF v_order_status IS NOT NULL AND v_order_id IS NOT NULL THEN
      UPDATE public.orders
      SET 
        status = v_order_status::public.order_status,
        updated_at = v_now
      WHERE id = v_order_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to standard status or just ignore if enum values don't match
    BEGIN
      IF v_order_status = 'confirmed' AND v_order_id IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'preparing'::public.order_status WHERE id = v_order_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore silently
    END;
  END;

  RETURN jsonb_build_object('success', true, 'message', 'Entrega atualizada com sucesso');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_delivery_status_safe(UUID, TEXT, UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
