import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * useAdminRealtime
 * Centralized hook for Admin Panel to monitor everything.
 * Ensures one single channel per table with proper cleanup.
 */
export function useAdminRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    console.log("[Realtime] Iniciando canais administrativos...");

    // Unique ID for this session to identify channels in Supabase logs
    // Fallback for non-secure contexts (no crypto.randomUUID)
    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID().substring(0, 8) 
      : Math.random().toString(36).substring(2, 10);

    const deliverablesChannel = supabase
      .channel(`admin-deliveries-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        (payload) => {
          console.log("[Realtime] Mudança em deliveries:", payload.eventType);
          qc.invalidateQueries({ queryKey: ["deliveries"] });
          qc.invalidateQueries({ queryKey: ["delivery-stats"] });
          // Also invalidate orders as they are often linked
          qc.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel(`admin-orders-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("[Realtime] Mudança em orders:", payload.eventType);
          qc.invalidateQueries({ queryKey: ["orders"] });
          qc.invalidateQueries({ queryKey: ["deliveries"] });
        }
      )
      .subscribe();

    const driversChannel = supabase
      .channel(`admin-drivers-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_drivers" },
        () => {
          console.log("[Realtime] Mudança em motoristas detectada.");
          qc.invalidateQueries({ queryKey: ["drivers"] });
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel(`admin-notifications-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        () => {
          qc.invalidateQueries({ queryKey: ["system-stats"] });
        }
      )
      .subscribe();

    return () => {
      console.log("[Realtime] Encerrando canais administrativos...");
      supabase.removeChannel(deliverablesChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [qc]);
}

// Keep old hooks as empty shells or point to the new one to prevent import breaks
export function useDeliveriesRealtime() { /* Deprecated */ }
export function useDriversRealtime() { /* Deprecated */ }
export function useOrdersRealtime() { /* Deprecated */ }
export function useAllRealtime() { 
  useAdminRealtime();
}
