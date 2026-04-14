import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DeliveryStatus } from "@/types/models";

export interface DeliveryWithRelations {
  id: string;
  company_id: string | null;
  driver_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  address: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  delivery_address: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  value: number;
  price: number | null;
  commission: number;
  distance_km: number | null;
  estimated_time_minutes: number | null;
  status: DeliveryStatus;
  notes: string | null;
  proof_photo_url: string | null;
  signature_url: string | null;
  accepted_at: string | null;
  collected_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  picked_up_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string | null;
  companies?: { name: string; phone: string | null } | null;
}

interface UseDeliveriesParams {
  status?: string;
  search?: string;
  companyId?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
  pageSize?: number;
  page?: number;
}

export function useDeliveries(params?: UseDeliveriesParams) {
  const { status, search, companyId, driverId, dateFrom, dateTo, pageSize = 50, page = 0 } = params || {};

  return useQuery({
    queryKey: ["deliveries", status, search, companyId, driverId, dateFrom, dateTo, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("deliveries")
        .select("*, companies(name, phone)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (status && status !== "all") query = query.eq("status", status as any);
      if (search) query = query.ilike("customer_name", `%${search}%`);
      if (companyId) query = query.eq("company_id", companyId);
      if (driverId) query = query.eq("driver_id", driverId);
      if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as unknown as DeliveryWithRelations[], count: count || 0 };
    },
  });
}

export function useDeliveryStats() {
  return useQuery({
    queryKey: ["delivery-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayRes, totalRes] = await Promise.all([
        supabase.from("deliveries").select("status, price").gte("created_at", today.toISOString()),
        supabase.from("deliveries").select("id", { count: "exact", head: true }),
      ]);

      if (todayRes.error) throw todayRes.error;
      const data = todayRes.data;

      return {
        today: data.length,
        total: totalRes.count ?? 0,
        pending: data.filter((d) => d.status === "pending").length,
        inTransit: data.filter((d) => d.status === "in_transit").length,
        delivered: data.filter((d) => d.status === "delivered").length,
        cancelled: data.filter((d) => d.status === "cancelled").length,
        todayRevenue: data.filter((d) => d.status === "delivered").reduce((sum, d) => sum + Number(d.price ?? 0), 0),
      };
    },
    refetchInterval: 30000,
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DeliveryStatus }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "accepted") updates.accepted_at = new Date().toISOString();
      if (status === "collecting") updates.collected_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
      const { error } = await supabase.from("deliveries").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
  });
}

export function useReassignDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, driverId }: { id: string; driverId: string | null }) => {
      const { error } = await supabase.from("deliveries").update({ driver_id: driverId, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveries"] }),
  });
}

/**
 * INTEGRAÇÕES COM PAINEL LOJISTA
 */
export async function createDeliveryRequest(orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (orderError) throw orderError;
  if (!order) throw new Error("Pedido não encontrado");

  const { data: address } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", order.customer_id)
    .limit(1)
    .maybeSingle();

  const dropoff = address ? `${address.street}, ${address.number} - ${address.neighborhood}` : "Endereço não cadastrado";

  const { data: delivery, error: deliveryError } = await supabase
    .from("deliveries")
    .insert({
      company_id: order.company_id,
      customer_name: "Cliente",
      address: dropoff,
      value: order.total || 0,
      status: "pending",
    })
    .select()
    .single();

  if (deliveryError) throw deliveryError;

  return delivery;
}

export function useCreateDeliveryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDeliveryRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

import { useEffect } from "react";
export function useDeliveryTracking(orderId?: string | null) {
  const qc = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data } = await supabase.from("orders").select("*, deliveries(*)").eq("id", orderId).single();
      return data;
    },
    enabled: !!orderId,
  });

  const deliveryId = (order as any)?.delivery_id;

  useEffect(() => {
    if (!deliveryId) return;
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 11);

    const channel = supabase
      .channel(`delivery-tracker-${deliveryId}-${uuid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `id=eq.${deliveryId}` },
        () => qc.invalidateQueries({ queryKey: ["order", orderId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deliveryId, orderId, qc]);

  return { order, delivery: (order as any)?.deliveries };
}
