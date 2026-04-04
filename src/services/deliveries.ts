import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

export type DeliveryWithRelations = Tables<"deliveries"> & {
  companies?: { name: string } | null;
  delivery_drivers?: { id: string; user_id: string } & { profiles?: { full_name: string } | null } | null;
};

interface DeliveryFilters {
  status?: string;
  companyId?: string;
  driverId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchDeliveries(filters: DeliveryFilters = {}) {
  let query = supabase
    .from("deliveries")
    .select(`
      *,
      companies(name),
      delivery_drivers(id, user_id)
    `, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as any);
  }
  if (filters.companyId) {
    query = query.eq("company_id", filters.companyId);
  }
  if (filters.driverId) {
    query = query.eq("driver_id", filters.driverId);
  }
  if (filters.search) {
    query = query.or(`customer_name.ilike.%${filters.search}%,dropoff_address.ilike.%${filters.search}%`);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 20;
  query = query.range(page * pageSize, (page + 1) * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function updateDeliveryStatus(id: string, status: string) {
  const timestampField = {
    accepted: "accepted_at",
    collecting: "collected_at",
    completed: "completed_at",
    cancelled: "cancelled_at",
  }[status];

  const updates: Record<string, any> = { status };
  if (timestampField) updates[timestampField] = new Date().toISOString();

  const { data, error } = await supabase
    .from("deliveries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reassignDelivery(id: string, driverId: string | null) {
  const { data, error } = await supabase
    .from("deliveries")
    .update({ driver_id: driverId })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function useDeliveries(filters: DeliveryFilters = {}) {
  return useQuery({
    queryKey: ["deliveries", filters],
    queryFn: () => fetchDeliveries(filters),
  });
}

export function useDeliveryStats() {
  return useQuery({
    queryKey: ["delivery-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [allRes, todayRes, completedRes] = await Promise.all([
        supabase.from("deliveries").select("id", { count: "exact", head: true }),
        supabase.from("deliveries").select("id", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),
        supabase.from("deliveries").select("price")
          .eq("status", "delivered")
          .gte("created_at", today.toISOString()),
      ]);

      const totalRevenue = (completedRes.data ?? []).reduce((sum, d) => sum + Number(d.price ?? 0), 0);

      return {
        total: allRes.count ?? 0,
        today: todayRes.count ?? 0,
        todayRevenue: totalRevenue,
      };
    },
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateDeliveryStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["delivery-stats"] });
    },
  });
}

export function useReassignDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, driverId }: { id: string; driverId: string | null }) => reassignDelivery(id, driverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}
