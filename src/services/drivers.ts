import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type DriverWithProfile = {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string | null;
  document?: string | null;
  vehicle_type?: string | null;
  vehicle_plate?: string | null;
  is_online?: boolean | null;
  rating: number;
  latitude: number | null;
  longitude: number | null;
  avatar_url?: string | null;
  status?: string | null;
  commission_rate?: number | null;
  created_at?: string;
};

export async function fetchDrivers(): Promise<DriverWithProfile[]> {
  // 1. Fetch from delivery_drivers (main table)
  // Real columns: id, user_id, vehicle, license_plate, is_online, rating, commission_rate, latitude, longitude
  const { data: drivers, error: driversError } = await supabase
    .from("delivery_drivers")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (driversError) throw driversError;

  // 2. Fetch profiles for all driver user_ids to get name, phone, avatar, document
  const userIds = (drivers || []).map(d => d.user_id);
  const { data: profiles } = userIds.length > 0 
    ? await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url, document, status")
        .in("user_id", userIds)
    : { data: [] };

  // 3. Merge: delivery_drivers + profiles
  // DB columns are "vehicle" and "license_plate", NOT "vehicle_type"/"vehicle_plate"
  const merged = (drivers || []).map(driver => {
    const profile = profiles?.find(p => p.user_id === driver.user_id);
    const raw = driver as any;
    return {
      id: driver.id,
      user_id: driver.user_id,
      full_name: profile?.full_name || raw.full_name || "Entregador",
      phone: profile?.phone || raw.phone || null,
      document: profile?.document || raw.document || null,
      avatar_url: profile?.avatar_url || raw.avatar_url || null,
      // Map real DB column names to what the UI expects
      vehicle_type: raw.vehicle_type || raw.vehicle || "motorcycle",
      vehicle_plate: raw.vehicle_plate || raw.license_plate || null,
      is_online: driver.is_online ?? false,
      rating: Number(driver.rating) || 5.0,
      commission_rate: Number(driver.commission_rate) || 15,
      latitude: driver.latitude,
      longitude: driver.longitude,
      status: profile?.status || raw.status || "active",
      created_at: driver.created_at,
    } as DriverWithProfile;
  });

  return merged;
}

export function useDrivers() {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: fetchDrivers,
  });
}

export function useOnlineDrivers() {
  return useQuery({
    queryKey: ["drivers", "online"],
    queryFn: async () => {
      const { data: drivers, error: driversError } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("is_online", true);
      
      if (driversError) throw driversError;
      if (!drivers || drivers.length === 0) return [];

      const userIds = drivers.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url, document, status")
        .in("user_id", userIds);

      return drivers.map(driver => {
        const profile = profiles?.find(p => p.user_id === driver.user_id);
        const raw = driver as any;
        return {
          id: driver.id,
          user_id: driver.user_id,
          full_name: profile?.full_name || raw.full_name || "Entregador",
          phone: profile?.phone || raw.phone || null,
          document: profile?.document || raw.document || null,
          avatar_url: profile?.avatar_url || raw.avatar_url || null,
          vehicle_type: raw.vehicle_type || raw.vehicle || "motorcycle",
          vehicle_plate: raw.vehicle_plate || raw.license_plate || null,
          is_online: driver.is_online ?? false,
          rating: Number(driver.rating) || 5.0,
          commission_rate: Number(driver.commission_rate) || 15,
          latitude: driver.latitude,
          longitude: driver.longitude,
          status: profile?.status || raw.status || "active",
          created_at: driver.created_at,
        } as DriverWithProfile;
      });
    },
  });
}

export function useToggleDriverOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ driverId, isOnline }: { driverId: string; isOnline: boolean }) => {
      const { error } = await supabase
        .from("delivery_drivers")
        .update({ is_online: isOnline } as any)
        .eq("id", driverId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

export function useAvailableDeliveries() {
  return useQuery({
    queryKey: ["deliveries", "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*, companies(name)")
        .eq("status", "pending")
        .is("driver_id", null);

      if (error) throw error;
      return data;
    },
  });
}

export function useAcceptDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ deliveryId, driverId }: { deliveryId: string; driverId: string }) => {
      const { data, error } = await supabase
        .from("deliveries")
        .update({ 
          driver_id: driverId, 
          status: "accepted" as any,
          accepted_at: new Date().toISOString()
        })
        .eq("id", deliveryId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}
