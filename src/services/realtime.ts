import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAudioAlert } from "@/hooks/useAudioAlert";

/**
 * Remove um canal de forma segura, evitando erros de
 * "WebSocket is closed before the connection is established".
 */
export function safeRemoveChannel(channel: any) {
  if (!channel) return;
  try {
    const state = channel.state;
    if (state === "joining") {
      setTimeout(() => {
        try { supabase.removeChannel(channel); } catch { /* noop */ }
      }, 300);
      return;
    }
    supabase.removeChannel(channel);
  } catch {
    /* noop */
  }
}

/**
 * useAdminRealtime
 * Centralized hook for Admin Panel to monitor everything.
 * Ensures one single channel per table with proper cleanup.
 */
export function useAdminRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const deliverablesChannel = supabase
      .channel("admin-deliveries")

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["deliveries"] });
          qc.invalidateQueries({ queryKey: ["delivery-stats"] });
        }
      )
      .subscribe();

    const driversChannel = supabase
      .channel("admin-drivers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_drivers" },
        () => {
          qc.invalidateQueries({ queryKey: ["drivers"] });
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        () => {
          qc.invalidateQueries({ queryKey: ["system-stats"] });
        }
      )
      .subscribe();

    return () => {
      safeRemoveChannel(deliverablesChannel);
      safeRemoveChannel(driversChannel);
      safeRemoveChannel(notificationsChannel);
    };
  }, []); // Run only once on mount

}

/**
 * useDriverRealtime
 * Notification system for the Driver App.
 */
export function useDriverRealtime() {
  const qc = useQueryClient();
  const { playAlert } = useAudioAlert();

  useEffect(() => {
    const channel = supabase
      .channel("driver-deliveries")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deliveries" },
        (payload) => {
          const newDel = payload.new as any;
          if (newDel.status === "pending" || newDel.status === "broadcasted") {
            // Play sound if enabled
            if (sessionStorage.getItem("sound_enabled") === "true") {
              playAlert();
            }
          }
          qc.invalidateQueries({ queryKey: ["deliveries"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deliveries" },
        () => qc.invalidateQueries({ queryKey: ["deliveries"] })
      )
      .subscribe();

    return () => { safeRemoveChannel(channel); };
  }, [qc]);
}

// Deprecated individual hooks
export function useDeliveriesRealtime() {
  useAdminRealtime();
}
export function useDriversRealtime() {}
export function useOrdersRealtime() {}
export function useAllRealtime() { 
  useAdminRealtime();
}
