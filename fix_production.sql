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
