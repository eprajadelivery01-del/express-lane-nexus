import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * FUNÇÕES
 */
export async function getConversation(orderId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data?.[0] || null;
}

export async function getMessages(conversationId: string | string[]) {
  const ids = (Array.isArray(conversationId) ? conversationId : [conversationId]).filter(Boolean);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Deduplicar mensagens por ID ou por conteúdo e horário para evitar duplicações visuais
  const seen = new Set<string>();
  const unique = (data || []).filter((m) => {
    if (!m) return false;
    if (m.id && seen.has(m.id)) return false;
    const clean = (m.content || "").replace(/\u200B/g, "").trim();
    const timeBucket = Math.floor(new Date(m.created_at).getTime() / (120 * 1000));
    const contentKey = `${m.sender_id}_${clean}_${timeBucket}`;
    if (seen.has(contentKey)) return false;
    if (m.id) seen.add(m.id);
    seen.add(contentKey);
    return true;
  });

  return unique;
}

export async function sendMessage(conversationIds: string | string[], senderId: string, content: string) {
  const ids = (Array.isArray(conversationIds) ? conversationIds : [conversationIds]).filter(Boolean);
  if (ids.length === 0) throw new Error("ID da conversa não informado");

  // Insere em todas as conversas vinculadas para que o cliente e o lojista
  // sincronizem instantaneamente em tempo real independentemente de qual sala o app abriu
  const promises = ids.map((id) =>
    supabase
      .from("messages")
      .insert({
        conversation_id: id,
        sender_id: senderId,
        content: content,
      })
      .select()
      .single()
  );

  const results = await Promise.all(promises);
  const success = results.find((r) => !r.error && r.data);
  if (!success) {
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) throw firstErr;
  }
  return success?.data;
}

/**
 * HOOKS
 */
export function useChat(orderId: string) {
  return useQuery({
    queryKey: ["conversation", orderId],
    queryFn: () => getConversation(orderId),
    enabled: !!orderId,
  });
}

export function useMessages(conversationId?: string | string[]) {
  const qc = useQueryClient();
  const ids = useMemo(() => {
    if (!conversationId) return [];
    return (Array.isArray(conversationId) ? conversationId : [conversationId]).filter(Boolean);
  }, [conversationId]);

  const idsKey = ids.slice().sort().join(",");

  // Escuta Realtime para novas mensagens em todas as salas vinculadas
  useEffect(() => {
    if (ids.length === 0) return;

    const channelId = `admin-chat-${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && ids.includes(newMsg.conversation_id)) {
            qc.invalidateQueries({ queryKey: ["messages", idsKey] });
            ids.forEach((id) => {
              qc.invalidateQueries({ queryKey: ["messages", id] });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idsKey, qc]);

  return useQuery({
    queryKey: ["messages", idsKey],
    queryFn: () => (ids.length > 0 ? getMessages(ids) : null),
    enabled: ids.length > 0,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string | string[]; content: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      // Adiciona um zero-width space invisível no final da mensagem para identificar que foi enviada pelo admin
      // Isso permite que o usuário teste com a MESMA CONTA no marketplace e no admin panel sem quebrar os lados dos balões.
      return sendMessage(conversationId, user.id, content + '\u200B');
    },
    onSuccess: (_, variables) => {
      const ids = (Array.isArray(variables.conversationId) ? variables.conversationId : [variables.conversationId]).filter(Boolean);
      ids.forEach((id) => {
        qc.invalidateQueries({ queryKey: ["messages", id] });
      });
      const idsKey = ids.slice().sort().join(",");
      qc.invalidateQueries({ queryKey: ["messages", idsKey] });
      qc.invalidateQueries({ queryKey: ["admin-conversations", user?.id] });
    },
  });
}

/**
 * Funções Adicionais para Chat Direto (Entregador/Admin)
 */
export async function getAdminId() {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .single();
  
  if (error) {
    console.error("Erro ao buscar Admin ID:", error);
    return null;
  }
  return data.user_id;
}

export async function getDirectConversation(user1: string, user2: string) {
  // Tenta encontrar conversa existente
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .contains("participants", [user1, user2])
    .is("order_id", null)
    .maybeSingle();
  
  if (existing) return existing;

  // Cria nova
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      participants: [user1, user2],
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return created;
}

export async function deleteConversation(conversationIds: string | string[]) {
  const ids = (Array.isArray(conversationIds) ? conversationIds : [conversationIds]).filter(Boolean);
  if (ids.length === 0) return true;

  await supabase.from("messages").delete().in("conversation_id", ids);
  const { error } = await supabase.from("conversations").delete().in("id", ids);
  if (error) throw error;
  return true;
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (conversationIds: string | string[]) => deleteConversation(conversationIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-conversations", user?.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
