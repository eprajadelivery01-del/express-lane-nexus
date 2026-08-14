import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, Loader2, Send, Search, ArrowLeft, Building2, Bike, UserCircle, Plus, Trash2, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMessages, useSendMessage, useDeleteConversation } from "@/services/chat";
import { useAuth } from "@/hooks/useAuth";
import { WhatsAppBubble } from "@/components/chat/WhatsAppBubble";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ContactType = "company" | "driver" | "customer";

interface Contact {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  type: ContactType;
}

export default function AdminChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [filterType, setFilterType] = useState<"all" | ContactType>("all");
  const [isClearingEmpty, setIsClearingEmpty] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // All conversations for admin
  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["admin-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages(content, created_at, sender_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Global Realtime listener for incoming/deleted messages
  useEffect(() => {
    if (!user?.id) return;
    const channelId = `admin-chat-global-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-conversations", user.id] });
          if (selectedConv?.id) {
            qc.invalidateQueries({ queryKey: ["messages", selectedConv.id] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "conversations" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-conversations", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedConv?.id, qc]);

  // All profiles + roles for contact list
  const { data: contacts } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const [{ data: companies }, { data: drivers }, { data: profiles }, { data: customers }] = await Promise.all([
        supabase.from("companies").select("user_id, name, logo_url").not("user_id", "is", null),
        supabase.from("delivery_drivers").select("user_id"),
        supabase.from("profiles").select("user_id, full_name, avatar_url, role"),
        supabase.from("customers").select("id, user_id, name, phone"),
      ]);

      const list: Contact[] = [];
      const seen = new Set<string>();

      companies?.forEach((c) => {
        if (c.user_id && !seen.has(c.user_id)) {
          list.push({ user_id: c.user_id, full_name: c.name, avatar_url: c.logo_url, type: "company" });
          seen.add(c.user_id);
        }
      });

      drivers?.forEach((d) => {
        if (d.user_id && !seen.has(d.user_id)) {
          const profile = profiles?.find((p) => p.user_id === d.user_id);
          list.push({
            user_id: d.user_id,
            full_name: profile?.full_name || "Entregador",
            avatar_url: profile?.avatar_url || null,
            type: "driver",
          });
          seen.add(d.user_id);
        }
      });

      profiles?.forEach((p) => {
        if (p.user_id && !seen.has(p.user_id) && p.user_id !== user?.id) {
          list.push({
            user_id: p.user_id,
            full_name: p.full_name || "Usuário",
            avatar_url: p.avatar_url,
            type: "customer",
          });
          seen.add(p.user_id);
        }
      });

      customers?.forEach((cust) => {
        const idToUse = cust.user_id || cust.id;
        if (idToUse && !seen.has(idToUse) && idToUse !== user?.id) {
          list.push({
            user_id: idToUse,
            full_name: cust.name || "Cliente",
            avatar_url: null,
            type: "customer",
          });
          seen.add(idToUse);
        }
      });

      return list;
    },
    enabled: !!user?.id,
  });

  // Profiles map for conversation display
  const { data: profilesMap } = useQuery({
    queryKey: ["profiles-map-admin", conversations?.length],
    enabled: !!conversations && conversations.length > 0,
    queryFn: async () => {
      if (!conversations) return {};
      const participantIds = Array.from(new Set(
        conversations.flatMap(c => c.participants || [])
      ));

      const [{ data: profiles }, { data: companies }, { data: drivers }, { data: customers }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url, role").in("user_id", participantIds),
        supabase.from("companies").select("user_id, name, logo_url").in("user_id", participantIds),
        supabase.from("delivery_drivers").select("user_id").in("user_id", participantIds),
        supabase.from("customers").select("id, user_id, name, phone").or(`user_id.in.(${participantIds.join(',')}),id.in.(${participantIds.join(',')})`),
      ]);
      
      const map: Record<string, any> = {};
      profiles?.forEach(p => {
        if (p.user_id) map[p.user_id] = { ...p };
      });
      customers?.forEach(cust => {
        const idMap = (idToMap: string) => {
          if (!map[idToMap]) map[idToMap] = { user_id: idToMap };
          if (!map[idToMap].full_name || map[idToMap].full_name === 'Usuário' || map[idToMap].full_name.startsWith('Usuário #')) {
            map[idToMap].full_name = cust.name;
          }
          map[idToMap].role = map[idToMap].role || 'customer';
        };
        if (cust.user_id) idMap(cust.user_id);
        if (cust.id) idMap(cust.id);
      });
      companies?.forEach(c => {
        if (c.user_id) {
          if (!map[c.user_id]) map[c.user_id] = { user_id: c.user_id };
          map[c.user_id].full_name = c.name;
          map[c.user_id].avatar_url = c.logo_url;
          map[c.user_id].role = 'company';
        }
      });
      drivers?.forEach(d => {
        if (d.user_id) {
          const profile = profiles?.find((p) => p.user_id === d.user_id);
          if (!map[d.user_id]) map[d.user_id] = { user_id: d.user_id };
          map[d.user_id].full_name = profile?.full_name || map[d.user_id].full_name || "Entregador";
          map[d.user_id].avatar_url = profile?.avatar_url || map[d.user_id].avatar_url || null;
          map[d.user_id].role = 'driver';
        }
      });
      return map;
    },
  });

  const { data: messages } = useMessages(selectedConv?.id);
  const sendMessage = useSendMessage();
  const deleteConversationMutation = useDeleteConversation();

  const startConversation = useMutation({
    mutationFn: async (contact: Contact) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Look for existing conversation
      const { data: existing } = await supabase
        .from("conversations")
        .select("*, messages(content, created_at, sender_id)")
        .contains("participants", [user.id, contact.user_id])
        .is("order_id", null)
        .maybeSingle();

      if (existing) return existing;

      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          participants: [user.id, contact.user_id],
          updated_at: new Date().toISOString(),
        })
        .select("*, messages(content, created_at, sender_id)")
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ["admin-conversations", user?.id] });
      setSelectedConv(conv);
      setShowContacts(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao iniciar conversa");
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedConv || !user?.id) return;
    const content = message.trim();
    setMessage("");

    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConv.id,
        content,
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar mensagem");
    }
  };

  const handleDeleteConversation = async (convId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja apagar esta conversa e todo o histórico?")) return;

    try {
      await deleteConversationMutation.mutateAsync(convId);
      toast.success("Conversa apagada com sucesso!");
      if (selectedConv?.id === convId) {
        setSelectedConv(null);
      }
    } catch (err: any) {
      console.error("Erro ao apagar conversa:", err);
      toast.error("Erro ao apagar conversa: " + (err.message || "Tente novamente"));
    }
  };

  const handleClearEmptyConversations = async () => {
    const emptyConvs = (conversations || []).filter((c: any) => !c.messages || c.messages.length === 0);
    if (emptyConvs.length === 0) {
      toast.info("Não há conversas vazias para limpar.");
      return;
    }

    if (!window.confirm(`Deseja apagar todas as ${emptyConvs.length} conversas vazias (sem mensagens)?`)) return;

    setIsClearingEmpty(true);
    try {
      const ids = emptyConvs.map((c: any) => c.id);
      await supabase.from("conversations").delete().in("id", ids);
      qc.invalidateQueries({ queryKey: ["admin-conversations", user?.id] });
      toast.success(`${emptyConvs.length} conversas vazias apagadas!`);
      if (selectedConv && ids.includes(selectedConv.id)) {
        setSelectedConv(null);
      }
    } catch (err: any) {
      console.error("Erro ao limpar conversas vazias:", err);
      toast.error("Erro ao limpar conversas vazias");
    } finally {
      setIsClearingEmpty(false);
    }
  };

  const getOtherProfile = (conv: any) => {
    const otherId = conv.participants?.find((id: string) => id !== user?.id) || conv.participants?.[0];
    return profilesMap?.[otherId] || null;
  };

  const getConvTitle = (conv: any) => {
    if (conv.order_id) return `Pedido #${conv.order_id.slice(0, 8)}`;
    
    let extractedTopic = null;
    if (conv.messages && conv.messages.length > 0) {
      const firstMsg = [...conv.messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      if (firstMsg?.content?.startsWith('[Assunto:')) {
        extractedTopic = firstMsg.content.replace('[Assunto:', '').replace(']', '').trim();
      }
    }

    const profile = getOtherProfile(conv);
    if (profile?.full_name) return extractedTopic ? `${profile.full_name} (${extractedTopic})` : profile.full_name;
    return extractedTopic || conv.title || "Conversa";
  };

  const formatConvTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const typeIcon = (type: ContactType) => {
    switch (type) {
      case "company": return <Building2 className="h-3 w-3 text-blue-500" />;
      case "driver": return <Bike className="h-3 w-3 text-orange-500" />;
      case "customer": return <UserCircle className="h-3 w-3 text-emerald-500" />;
    }
  };

  const typeLabel = (type: ContactType) => {
    switch (type) {
      case "company": return "Lojista";
      case "driver": return "Entregador";
      case "customer": return "Cliente";
    }
  };

  // Filtered & sorted conversations
  const filteredConvs = useMemo(() => {
    if (!conversations) return [];
    
    // Sort so conversations with newest messages are at top
    const list = [...conversations].sort((a, b) => {
      const lastMsgA = a.messages && a.messages.length > 0 
        ? Math.max(...a.messages.map((m: any) => new Date(m.created_at).getTime()))
        : new Date(a.created_at).getTime();

      const lastMsgB = b.messages && b.messages.length > 0 
        ? Math.max(...b.messages.map((m: any) => new Date(m.created_at).getTime()))
        : new Date(b.created_at).getTime();

      return lastMsgB - lastMsgA;
    });

    if (!search.trim()) return list;

    const q = search.toLowerCase();
    return list.filter((c: any) => {
      const title = getConvTitle(c).toLowerCase();
      const lastMsg = (c.messages?.[c.messages.length - 1]?.content || "").toLowerCase();
      return title.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, profilesMap, search]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
      const matchType = filterType === "all" || c.type === filterType;
      const matchSearch = !search.trim() || c.full_name.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [contacts, filterType, search]);

  return (
    <AdminLayout title="Chat" subtitle="Comunicação com lojistas, entregadores e clientes">
      <div className="flex h-[calc(100vh-14rem)] bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className={cn("w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card", selectedConv && "hidden md:flex")}>
          {/* Header */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between gap-1">
              <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
                <button
                  onClick={() => setShowContacts(false)}
                  className={cn("px-3 py-1 rounded-md transition-all", !showContacts ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                >
                  Conversas ({filteredConvs.length})
                </button>
                <button
                  onClick={() => setShowContacts(true)}
                  className={cn("px-3 py-1 rounded-md transition-all flex items-center gap-1", showContacts ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                >
                  <Plus className="h-3 w-3" /> Nova
                </button>
              </div>

              {!showContacts && (
                <button
                  onClick={handleClearEmptyConversations}
                  disabled={isClearingEmpty}
                  title="Apagar todas as conversas sem mensagens"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-[0.65rem] font-bold uppercase tracking-wider hover:bg-destructive/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isClearingEmpty ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eraser className="h-3 w-3" />}
                  <span>Limpar Vazias</span>
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={showContacts ? "Buscar contatos..." : "Buscar conversas..."}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Filter tags for contacts */}
            {showContacts && (
              <div className="flex gap-1 pt-1">
                {(["all", "company", "driver", "customer"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all",
                      filterType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t === "all" ? "Todos" : typeLabel(t as ContactType)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {showContacts ? (
              filteredContacts.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">Nenhum contato</p>
              ) : (
                filteredContacts.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => startConversation.mutate(c)}
                    disabled={startConversation.isPending}
                    className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/30 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{c.full_name}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        {typeIcon(c.type)}
                        {typeLabel(c.type)}
                      </span>
                    </div>
                  </button>
                ))
              )
            ) : loadingConvs ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">Nenhuma conversa ainda.</p>
                <Button size="sm" onClick={() => setShowContacts(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Iniciar conversa
                </Button>
              </div>
            ) : (
              filteredConvs.map((conv: any) => {
                const profile = getOtherProfile(conv);
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/30 text-left cursor-pointer group justify-between",
                      selectedConv?.id === conv.id && "bg-primary/5 border-l-2 border-l-primary",
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-sm font-semibold text-foreground truncate">{getConvTitle(conv)}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatConvTime(lastMsg?.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-snug">{lastMsg?.content?.replace(/\u200B/g, '') || "Inicie a conversa"}</p>
                    </div>

                    {/* Botão de Excluir Conversa na Lista */}
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      title="Apagar conversa"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat */}
        <div className={cn("flex-1 flex flex-col relative bg-muted/20", !selectedConv && "hidden md:flex")}>
          {selectedConv ? (
            <>
              <div className="p-3 bg-card border-b border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button className="md:hidden" onClick={() => setSelectedConv(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border shrink-0 flex items-center justify-center">
                    {getOtherProfile(selectedConv)?.avatar_url ? (
                      <img src={getOtherProfile(selectedConv)?.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 opacity-50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground leading-tight truncate">{getConvTitle(selectedConv)}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Online</p>
                  </div>
                </div>

                {/* Botão Apagar Chat Aberto */}
                <button
                  onClick={() => handleDeleteConversation(selectedConv.id)}
                  title="Apagar esta conversa e mensagens"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Apagar Chat</span>
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-8 scroll-smooth">
                <div className="flex flex-col gap-1 pb-4">
                  {messages?.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Envie a primeira mensagem</p>
                    </div>
                  )}
                  {messages?.map((msg, i) => (
                    <WhatsAppBubble
                      key={msg.id}
                      content={msg.content.replace(/\u200B/g, '')}
                      timestamp={msg.created_at}
                      isMe={msg.sender_id === user?.id || msg.content.endsWith('\u200B')}
                      showTail={i === 0 || messages[i - 1].sender_id !== msg.sender_id}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 bg-card border-t border-border flex items-center gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-muted/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessage.isPending}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="h-16 w-16 text-primary/20 mb-4" />
              <h2 className="text-lg font-bold text-foreground mb-1">Central de Chat</h2>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Selecione uma conversa ou inicie uma nova com qualquer lojista, entregador ou cliente.
              </p>
              <Button onClick={() => setShowContacts(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Nova Conversa
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
