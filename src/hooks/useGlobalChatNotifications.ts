import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function useGlobalChatNotifications() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const sessionId = Math.random().toString(36).substring(2, 10);
    const channel = supabase
      .channel(`global-chat-notifications-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          if (newMessage.sender_id === user.id) return;

          const isChatPage = location.pathname.includes("/chat");
          
          if (!isChatPage) {
            toast.info("Nova mensagem recebida!", {
              description: newMessage.content,
              duration: 8000,
              action: {
                label: "Abrir Chat",
                onClick: () => navigate("/chat")
              }
            });
          }

          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["admin-conversations"] });
          qc.invalidateQueries({ queryKey: ["messages", newMessage.conversation_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname, navigate, qc]);
}

export function GlobalChatListener() {
  useGlobalChatNotifications();
  return null;
}
