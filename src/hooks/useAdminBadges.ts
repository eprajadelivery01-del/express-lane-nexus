import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminBadges {
  openRides: number;
  unreadChats: number;
}

export function useAdminBadges(_userId?: string) {
  const [badges, setBadges] = useState<AdminBadges>({ openRides: 0, unreadChats: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ count: openRides }, { count: unreadChats }] = await Promise.all([
          supabase
            .from("deliveries")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending", "broadcasted", "accepted", "collecting", "in_transit"] as any),
          supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("read", false),
        ]);
        if (!cancelled) {
          setBadges({
            openRides: openRides ?? 0,
            unreadChats: unreadChats ?? 0,
          });
        }
      } catch {
        // silent
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { badges };
}
