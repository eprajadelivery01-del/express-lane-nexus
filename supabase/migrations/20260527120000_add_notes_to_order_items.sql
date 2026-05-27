-- Adiciona colunas para suportar as observações e opções enviadas pelo Checkout do marketplace
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

-- Atualiza a função de fallback (get_business_orders_v2) para retornar as notas e opções
CREATE OR REPLACE FUNCTION public.get_business_orders_v2(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'status', o.status,
      'total', o.total,
      'created_at', o.created_at,
      'customer_id', o.customer_id,
      'delivery_id', o.delivery_id,
      'delivery_address', o.delivery_address,
      'payment_method', o.payment_method,
      'notes', o.notes,
      'order_items', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'quantity', oi.quantity,
            'price', oi.price,
            'notes', oi.notes,
            'options', oi.options,
            'products', jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'image_url', p.image_url,
              'description', p.description
            )
          )
        ), '[]'::jsonb)
        FROM public.order_items oi
        LEFT JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
      )
    )
    ORDER BY o.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.orders o
  WHERE o.company_id = p_company_id;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_business_orders_v2(UUID) TO authenticated;

-- Adiciona políticas de DELETE explícitas para garantir que os dados possam ser deletados via RPC ou UI se houver alguma falha
DROP POLICY IF EXISTS "Admins can delete drivers" ON public.delivery_drivers;
CREATE POLICY "Admins can delete drivers" ON public.delivery_drivers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Atualiza o safe_delete_driver para garantir que ele levante exceção se falhar
CREATE OR REPLACE FUNCTION public.safe_delete_driver(p_driver_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_delivery_ids UUID[];
  v_deleted_count INT;
BEGIN
  -- Only admins may call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get the linked auth user
  SELECT user_id INTO v_user_id
  FROM public.delivery_drivers
  WHERE id = p_driver_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  -- Collect delivery IDs assigned to this driver
  SELECT ARRAY(SELECT id FROM public.deliveries WHERE driver_id = p_driver_id)
  INTO v_delivery_ids;

  DELETE FROM public.reviews WHERE driver_id = p_driver_id;
  DELETE FROM public.occurrences WHERE driver_id = p_driver_id;

  IF v_delivery_ids IS NOT NULL AND array_length(v_delivery_ids, 1) > 0 THEN
    DELETE FROM public.delivery_ratings WHERE delivery_id = ANY(v_delivery_ids);
  END IF;

  DELETE FROM public.driver_earnings WHERE driver_id = p_driver_id;
  DELETE FROM public.driver_location_history WHERE driver_id = p_driver_id;
  UPDATE public.deliveries SET driver_id = NULL WHERE driver_id = p_driver_id;
  DELETE FROM public.chat_messages WHERE sender_id = v_user_id;
  DELETE FROM public.chat_message_logs WHERE sender_id = v_user_id;

  -- 9. Delete the delivery_drivers record
  DELETE FROM public.delivery_drivers WHERE id = p_driver_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'Falha ao excluir o motorista (Possível bloqueio de RLS no backend)';
  END IF;

  -- 10. Delete user_roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- 11. Delete profile
  DELETE FROM public.profiles WHERE user_id = v_user_id;

  -- 12. Delete auth user (cascades anything remaining)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.safe_delete_driver(UUID) TO authenticated;
