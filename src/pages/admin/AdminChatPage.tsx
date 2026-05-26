import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, Loader2, Send, Search, ArrowLeft, Building2, Bike, UserCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMessages, useSendMessage } from "@/services/chat";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Existing conversations
  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["admin-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages(content, created_at, sender_id)")
        .contains("participants", [user.id])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // All profiles + roles for contact list
  const { data: contacts } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const [{ data: companies }, { data: drivers }, { data: profiles }] = await Promise.all([
        supabase.from("companies").select("user_id, name, logo_url").not("user_id", "is", null),
        supabase.from("delivery_drivers").select("user_id"),
        supabase.from("profiles").select("user_id, full_name, avatar_url, role"),
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

      const [{ data: profiles }, { data: companies }, { data: drivers }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url, role").in("user_id", participantIds),
        supabase.from("companies").select("user_id, name, logo_url").in("user_id", participantIds),
        supabase.from("delivery_drivers").select("user_id").in("user_id", participantIds),
      ]);
      
      const map: Record<string, any> = {};
      profiles?.forEach(p => {
        if (p.user_id) map[p.user_id] = { ...p };
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

  const startConversation = useMutation({
    mutationFn: async (contact: Contact) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Look for existing conversation
      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .contains("participants", [user.id, contact.user_id])
        .is("order_id", null)
        .maybeSingle();

      if (existing) return existing;

      const { data, error } = await supabase
        .from("conversations")
        .insert({ participants: [user.id, contact.user_id], order_id: null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ["admin-conversations"] });
      setSelectedConv(conv);
      setShowContacts(false);
      toast.success("Conversa aberta");
    },
    onError: (err: any) => toast.error("Erro ao iniciar conversa: " + err.message),
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedConv) return;
    try {
      await sendMessage.mutateAsync({ conversationId: selectedConv.id, content: message.trim() });
      setMessage("");
      qc.invalidateQueries({ queryKey: ["admin-conversations"] });
    } catch (err: any) {
      toast.error("Falha ao enviar: " + err.message);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
      if (filterType !== "all" && c.type !== filterType) return false;
      if (search && !c.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [contacts, filterType, search]);

  const filteredConvs = useMemo(() => {
    if (!conversations) return [];
    if (!search) return conversations;
    return conversations.filter((c: any) => {
      const otherId = c.participants.find((p: string) => p !== user?.id);
      const profile = profilesMap?.[otherId];
      const name = profile?.full_name || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [conversations, search, profilesMap, user?.id]);

  const getOtherProfile = (conv: any) => {
    const otherId = conv?.participants?.find((p: string) => p !== user?.id);
    return profilesMap?.[otherId];
  };

  const getConvTitle = (conv: any) => {
    if (conv.order_id) return `Pedido #${conv.order_id.slice(0, 8)}`;
    
    // Tenta extrair o Assunto da primeira mensagem caso seja um chat de suporte
    let extractedTopic = null;
    if (conv.messages && conv.messages.length > 0) {
      const sorted = [...conv.messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const firstMsg = sorted[0];
      if (firstMsg?.content?.startsWith('[Assunto:')) {
        extractedTopic = firstMsg.content.replace('[Assunto:', '').replace(']', '').trim();
      }
    }

    const profile = getOtherProfile(conv);
    if (profile?.full_name) {
      return extractedTopic ? `${profile.full_name} (${extractedTopic})` : profile.full_name;
    }

    const otherId = conv?.participants?.find((p: string) => p !== user?.id);
    if (otherId) {
      return extractedTopic || `Usuário #${otherId.slice(0, 6).toUpperCase()}`;
    }
    
    return extractedTopic || conv.topic || "Conversa";
  };

  const formatConvTime = (date?: string) => {
    if (!date) return "";
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd/MM", { locale: ptBR });
  };

  const typeIcon = (type: ContactType) => {
    if (type === "company") return <Building2 className="h-3 w-3" />;
    if (type === "driver") return <Bike className="h-3 w-3" />;
    return <UserCircle className="h-3 w-3" />;
  };

  const typeLabel = (type: ContactType) => {
    if (type === "company") return "Lojista";
    if (type === "driver") return "Entregador";
    return "Cliente";
  };

  return (
    <AdminLayout title="Chat" subtitle="Comunicação com lojistas, entregadores e clientes">
      <div className="flex h-[calc(100vh-180px)] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm -mx-2">
        {/* Sidebar */}
        <div className={cn("w-full md:w-80 lg:w-96 border-r border-border flex flex-col shrink-0", selectedConv && "hidden md:flex")}>
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {showContacts ? "Novo Contato" : "Conversas"}
            </h2>
            <Button size="sm" variant={showContacts ? "secondary" : "default"} onClick={() => setShowContacts((v) => !v)} className="gap-1.5 h-8">
              {showContacts ? <ArrowLeft className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showContacts ? "Voltar" : "Nova"}
            </Button>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={showContacts ? "Buscar contato..." : "Buscar conversa..."}
                className="w-full bg-muted/50 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            {showContacts && (
              <div className="flex gap-1 mt-2">
                {(["all", "company", "driver", "customer"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={cn(
                      "flex-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors",
                      filterType === t ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
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
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/30 text-left",
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
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-sm font-semibold text-foreground truncate">{getConvTitle(conv)}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatConvTime(lastMsg?.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-snug">{lastMsg?.content || "Inicie a conversa"}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat */}
        <div className={cn("flex-1 flex flex-col relative bg-muted/20", !selectedConv && "hidden md:flex")}>
          {selectedConv ? (
            <>
              <div className="p-3 bg-card border-b border-border flex items-center gap-3">
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
                      content={msg.content}
                      timestamp={msg.created_at}
                      isMe={msg.sender_id === user?.id}
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
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-50"
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
