import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminBadges {
  openRides: number;
  unreadChats: number;
}

export function markConversationAsOpened(conversationId: string) {
  if (!conversationId || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("epj_opened_conversations");
    const openedSet = new Set<string>(raw ? JSON.parse(raw) : []);
    if (!openedSet.has(conversationId)) {
      openedSet.add(conversationId);
      localStorage.setItem("epj_opened_conversations", JSON.stringify(Array.from(openedSet)));
      window.dispatchEvent(new Event("epj-chat-opened"));
    }
  } catch (e) {
    console.error("[AdminBadges] Erro ao marcar conversa como aberta:", e);
  }
}

export function useAdminBadges(_userId?: string) {
  const [badges, setBadges] = useState<AdminBadges>({ openRides: 0, unreadChats: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Count deliveries that haven't been accepted yet (pending or broadcasted)
        const { count: openRides } = await supabase
          .from("deliveries")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "broadcasted"] as any);

        let unreadChatsCount = 0;

        try {
          let openedIds = new Set<string>();
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("epj_opened_conversations");
              if (raw) openedIds = new Set(JSON.parse(raw));
            } catch {}
          }

          // Busca apenas mensagens não lidas enviadas por OUTROS usuários
          let query = supabase
            .from("messages")
            .select("conversation_id, sender_id")
            .is("read_at", null);

          if (_userId) {
            query = query.neq("sender_id", _userId);
          }

          const { data: unreadMessages } = await query;

          if (unreadMessages && unreadMessages.length > 0) {
            // Agrupa por conversa e filtra apenas conversas que NÃO foram abertas
            const unreadConvIds = new Set(
              unreadMessages
                .map((m: any) => m.conversation_id)
                .filter((id: any): id is string => !!id && !openedIds.has(id))
            );
            unreadChatsCount = unreadConvIds.size;
          }
        } catch (e) {
          console.error("[AdminBadges] Erro ao calcular chats não lidos:", e);
        }

        if (!cancelled) {
          setBadges({
            openRides: openRides ?? 0,
            unreadChats: unreadChatsCount,
          });
        }
      } catch (err) {
        console.error("[AdminBadges] Erro geral ao carregar badges:", err);
      }
    }

    load();
    const interval = setInterval(load, 60000);

    const handleOpened = () => load();
    if (typeof window !== "undefined") {
      window.addEventListener("epj-chat-opened", handleOpened);
      window.addEventListener("storage", handleOpened);
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("epj-chat-opened", handleOpened);
        window.removeEventListener("storage", handleOpened);
      }
    };
  }, [_userId]);

  return { badges };
}
