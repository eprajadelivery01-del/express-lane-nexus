import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, User, Loader2, Send, Search, ArrowLeft, 
  Building2, Bike, UserCircle, Plus, Trash2, Eraser, 
  Store, ShoppingBag, ShieldAlert, Sparkles, Filter,
  UserCheck, HelpCircle, Users, CheckCheck, Clock, 
  Phone, ExternalLink, X, MessageCircle, AlertCircle, Copy, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMessages, useSendMessage, useDeleteConversation } from "@/services/chat";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ContactType = "company" | "driver" | "customer";
type ChatCategory = "all" | "drivers" | "companies" | "store_customer" | "customers" | "driver_application";

interface Contact {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  type: ContactType;
}

const QUICK_REPLIES = [
  "Olá! Como posso ajudar você hoje?",
  "Estamos verificando sua solicitação, um momento por favor.",
  "Seu pedido já foi despachado e está em rota de entrega.",
  "Problema resolvido! Qualquer dúvida estamos à disposição."
];

export default function AdminChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [filterType, setFilterType] = useState<"all" | ContactType>("all");
  const [activeCategory, setActiveCategory] = useState<ChatCategory>("all");
  const [isClearingEmpty, setIsClearingEmpty] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
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
        supabase.from("companies").select("user_id, name, logo_url, phone").not("user_id", "is", null),
        supabase.from("delivery_drivers").select("user_id"),
        supabase.from("profiles").select("user_id, full_name, avatar_url, role, phone"),
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
        supabase.from("profiles").select("user_id, full_name, avatar_url, role, phone").in("user_id", participantIds),
        supabase.from("companies").select("id, user_id, name, logo_url, phone").or(`user_id.in.(${participantIds.join(',')}),id.in.(${participantIds.join(',')})`),
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
          if (cust.phone) map[idToMap].phone = cust.phone;
          map[idToMap].role = map[idToMap].role || 'customer';
        };
        if (cust.user_id) idMap(cust.user_id);
        if (cust.id) idMap(cust.id);
      });
      companies?.forEach(c => {
        const idMap = (idToMap: string) => {
          if (!map[idToMap]) map[idToMap] = { user_id: idToMap };
          map[idToMap].full_name = c.name;
          map[idToMap].avatar_url = c.logo_url;
          if (c.phone) map[idToMap].phone = c.phone;
          map[idToMap].role = 'company';
        };
        if (c.user_id) idMap(c.user_id);
        if (c.id) idMap(c.id);
      });
      drivers?.forEach(d => {
        if (d.user_id) {
          const profile = profiles?.find((p) => p.user_id === d.user_id);
          if (!map[d.user_id]) map[d.user_id] = { user_id: d.user_id };
          map[d.user_id].full_name = profile?.full_name || map[d.user_id].full_name || "Entregador";
          map[d.user_id].avatar_url = profile?.avatar_url || map[d.user_id].avatar_url || null;
          if (profile?.phone) map[d.user_id].phone = profile.phone;
          map[d.user_id].role = 'driver';
        }
      });
      return map;
    },
  });

  const { data: messages, isLoading: loadingMessages } = useMessages(selectedConv?.id);
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

  const handleSend = async (customContent?: string) => {
    const textToSend = (customContent || message).trim();
    if (!textToSend || !selectedConv || !user?.id) return;
    if (!customContent) setMessage("");

    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConv.id,
        content: textToSend,
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

  const copyChatId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success("ID do Chat copiado!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Helper to determine conversation category with high precision
  const getConversationCategory = (conv: any): ChatCategory => {
    const topic = (conv.topic || "").toLowerCase();
    const title = (conv.title || "").toLowerCase();
    
    let firstMsgContent = "";
    if (conv.messages && conv.messages.length > 0) {
      const first = [...conv.messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      firstMsgContent = (first?.content || "").toLowerCase();
    }

    // 1. Driver Application
    if (
      topic === 'driver_application' || 
      title.includes('cadastro') || 
      title.includes('seja um entregador') ||
      firstMsgContent.includes('cadastro de entregador') ||
      firstMsgContent.includes('seja um entregador')
    ) {
      return 'driver_application';
    }

    // 2. Store <-> Customer
    const isOrderLinked = !!conv.order_id || topic === 'suporte do pedido' || topic === 'order_support';
    const hasCompany = conv.participants?.some((p: string) => profilesMap?.[p]?.role === 'company');
    const hasNonAdminUser = conv.participants?.some((p: string) => {
      const role = profilesMap?.[p]?.role;
      return role !== 'company' && role !== 'admin';
    });

    if (isOrderLinked || (hasCompany && hasNonAdminUser && conv.participants?.length >= 2)) {
      return 'store_customer';
    }

    // 3. Driver direct chat
    const otherId = conv.participants?.find((id: string) => id !== user?.id) || conv.participants?.[0];
    const otherProfile = profilesMap?.[otherId];

    if (otherProfile?.role === 'driver' || topic.includes('driver') || topic.includes('entregador')) {
      return 'drivers';
    }

    // 4. Company direct chat
    if (otherProfile?.role === 'company' || topic.includes('company') || topic.includes('lojista')) {
      return 'companies';
    }

    // 5. Customer direct support
    return 'customers';
  };

  const getOtherProfile = (conv: any) => {
    const otherId = conv.participants?.find((id: string) => id !== user?.id) || conv.participants?.[0];
    return profilesMap?.[otherId] || null;
  };

  const getStoreCustomerParticipants = (conv: any) => {
    const p1 = conv.participants?.[0] ? profilesMap?.[conv.participants[0]] : null;
    const p2 = conv.participants?.[1] ? profilesMap?.[conv.participants[1]] : null;
    
    let store = p1?.role === 'company' ? p1 : p2?.role === 'company' ? p2 : null;
    let customer = p1?.role !== 'company' ? p1 : p2;

    return { store, customer };
  };

  // Clean title without messy topic tags
  const getConvTitle = (conv: any) => {
    const category = getConversationCategory(conv);

    if (category === 'store_customer') {
      const { store, customer } = getStoreCustomerParticipants(conv);
      const storeName = store?.full_name || "Loja";
      const customerName = customer?.full_name || "Cliente";
      const orderTag = conv.order_id ? ` • Pedido #${conv.order_id.slice(0, 4).toUpperCase()}` : '';
      return `${storeName} ↔ ${customerName}${orderTag}`;
    }

    if (category === 'driver_application') {
      const otherProfile = getOtherProfile(conv);
      return otherProfile?.full_name || "Candidato a Entregador";
    }

    if (category === 'drivers') {
      const otherProfile = getOtherProfile(conv);
      return otherProfile?.full_name || "Entregador Parceiro";
    }

    if (category === 'companies') {
      const otherProfile = getOtherProfile(conv);
      return otherProfile?.full_name || "Lojista Parceiro";
    }

    const otherProfile = getOtherProfile(conv);
    return otherProfile?.full_name || conv.title || "Cliente do Marketplace";
  };

  // Extract topic cleanly for secondary badge
  const getConvTopicBadge = (conv: any) => {
    if (conv.messages && conv.messages.length > 0) {
      const firstMsg = [...conv.messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      if (firstMsg?.content?.startsWith('[Assunto:')) {
        return firstMsg.content.replace('[Assunto:', '').replace(']', '').trim();
      }
    }
    return conv.topic || null;
  };

  // Clean last message snippet
  const getCleanSnippet = (conv: any) => {
    if (!conv.messages || conv.messages.length === 0) return "Nenhuma mensagem trocada ainda";
    const sorted = [...conv.messages].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const valid = sorted.find((m: any) => !m.content?.startsWith('[Assunto:'));
    if (!valid) return "Iniciando atendimento...";
    return valid.content.replace(/\u200B/g, '').trim();
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
      case "company": return <Building2 className="h-3.5 w-3.5 text-blue-500" />;
      case "driver": return <Bike className="h-3.5 w-3.5 text-emerald-500" />;
      case "customer": return <UserCircle className="h-3.5 w-3.5 text-indigo-500" />;
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
    
    const list = [...conversations].sort((a, b) => {
      const lastMsgA = a.messages && a.messages.length > 0 
        ? Math.max(...a.messages.map((m: any) => new Date(m.created_at).getTime()))
        : new Date(a.created_at).getTime();

      const lastMsgB = b.messages && b.messages.length > 0 
        ? Math.max(...b.messages.map((m: any) => new Date(m.created_at).getTime()))
        : new Date(b.created_at).getTime();

      return lastMsgB - lastMsgA;
    });

    return list.filter((c: any) => {
      const cat = getConversationCategory(c);
      const matchCat = activeCategory === "all" || cat === activeCategory;
      if (!matchCat) return false;

      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const title = getConvTitle(c).toLowerCase();
      const lastMsg = (c.messages?.[c.messages.length - 1]?.content || "").toLowerCase();
      const orderId = (c.order_id || "").toLowerCase();
      return title.includes(q) || lastMsg.includes(q) || orderId.includes(q);
    });
  }, [conversations, profilesMap, search, activeCategory]);

  // Counts for all granular tabs
  const categoryCounts = useMemo(() => {
    if (!conversations) return { all: 0, drivers: 0, companies: 0, store_customer: 0, customers: 0, driver_application: 0 };
    return {
      all: conversations.length,
      drivers: conversations.filter(c => getConversationCategory(c) === 'drivers').length,
      companies: conversations.filter(c => getConversationCategory(c) === 'companies').length,
      store_customer: conversations.filter(c => getConversationCategory(c) === 'store_customer').length,
      customers: conversations.filter(c => getConversationCategory(c) === 'customers').length,
      driver_application: conversations.filter(c => getConversationCategory(c) === 'driver_application').length,
    };
  }, [conversations, profilesMap]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
      const matchType = filterType === "all" || c.type === filterType;
      const matchSearch = !search.trim() || c.full_name.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [contacts, filterType, search]);

  // Filter out system subject messages from chat stream
  const visibleMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter((m: any) => !m.content?.startsWith('[Assunto:'));
  }, [messages]);

  return (
    <AdminLayout title="Central de Comando • Chat & Suporte" subtitle="Atendimento profissional unificado e monitoramento de conversas em tempo real">
      <div className="flex h-[calc(100vh-13.5rem)] bg-card/60 backdrop-blur-xl rounded-3xl border border-border/80 overflow-hidden shadow-2xl relative">
        
        {/* SIDEBAR DE CONVERSAS */}
        <div className={cn("w-full md:w-[410px] lg:w-[450px] border-r border-border/70 flex flex-col bg-card/90 shrink-0", selectedConv && "hidden md:flex")}>
          
          {/* Header Superior */}
          <div className="p-3.5 border-b border-border/60 space-y-3 bg-card">
            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-2xl bg-muted/70 p-1 text-xs font-bold shadow-inner">
                <button
                  onClick={() => setShowContacts(false)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl transition-all flex items-center gap-2", 
                    !showContacts ? "bg-card text-foreground shadow-md font-extrabold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  <span>Conversas</span>
                </button>
                <button
                  onClick={() => setShowContacts(true)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5", 
                    showContacts ? "bg-card text-foreground shadow-md font-extrabold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Plus className="h-3.5 w-3.5 text-primary" /> 
                  <span>Nova</span>
                </button>
              </div>

              {!showContacts && (
                <button
                  onClick={handleClearEmptyConversations}
                  disabled={isClearingEmpty}
                  title="Apagar todas as conversas sem mensagens"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-[0.7rem] font-black uppercase tracking-wider hover:bg-destructive/20 transition-all disabled:opacity-50 cursor-pointer border border-destructive/20 active:scale-95"
                >
                  {isClearingEmpty ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />}
                  <span>Limpar Vazias</span>
                </button>
              )}
            </div>

            {/* SELETOR DE CATEGORIAS PROFISSIONAL COM PILLS */}
            {!showContacts && (
              <div className="grid grid-cols-3 gap-1.5">
                {/* 1. Todos */}
                <button
                  onClick={() => setActiveCategory("all")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-black transition-all border text-left",
                    activeCategory === "all" 
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]" 
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <span className="truncate">📋 Todos</span>
                  <span className={cn("px-1.5 py-0.2 rounded-md text-[9px] font-black", activeCategory === "all" ? "bg-white/20 text-white" : "bg-muted-foreground/15 text-foreground")}>
                    {categoryCounts.all}
                  </span>
                </button>

                {/* 2. Entregadores */}
                <button
                  onClick={() => setActiveCategory("drivers")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-black transition-all border text-left",
                    activeCategory === "drivers" 
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.02]" 
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                  )}
                >
                  <span className="truncate">🏍️ Entregador</span>
                  <span className={cn("px-1.5 py-0.2 rounded-md text-[9px] font-black", activeCategory === "drivers" ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200")}>
                    {categoryCounts.drivers}
                  </span>
                </button>

                {/* 3. Lojas */}
                <button
                  onClick={() => setActiveCategory("companies")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-black transition-all border text-left",
                    activeCategory === "companies" 
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 scale-[1.02]" 
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
                  )}
                >
                  <span className="truncate">🏪 Lojistas</span>
                  <span className={cn("px-1.5 py-0.2 rounded-md text-[9px] font-black", activeCategory === "companies" ? "bg-white/20 text-white" : "bg-blue-500/20 text-blue-800 dark:text-blue-200")}>
                    {categoryCounts.companies}
                  </span>
                </button>

                {/* 4. Loja <-> Cliente */}
                <button
                  onClick={() => setActiveCategory("store_customer")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-black transition-all border text-left",
                    activeCategory === "store_customer" 
                      ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20 scale-[1.02]" 
                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
                  )}
                >
                  <span className="truncate">🛒 Loja ↔ Cli</span>
                  <span className={cn("px-1.5 py-0.2 rounded-md text-[9px] font-black", activeCategory === "store_customer" ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-800 dark:text-purple-200")}>
                    {categoryCounts.store_customer}
                  </span>
                </button>

                {/* 5. Clientes */}
                <button
                  onClick={() => setActiveCategory("customers")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-black transition-all border text-left",
                    activeCategory === "customers" 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-[1.02]" 
                      : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20"
                  )}
                >
                  <span className="truncate">👤 Clientes</span>
                  <span className={cn("px-1.5 py-0.2 rounded-md text-[9px] font-black", activeCategory === "customers" ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200")}>
                    {categoryCounts.customers}
                  </span>
                </button>

                {/* 6. Pré-Cadastro */}
                <button
                  onClick={() => setActiveCategory("driver_application")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-black transition-all border text-left",
                    activeCategory === "driver_application" 
                      ? "bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20 scale-[1.02]" 
                      : "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 hover:bg-orange-500/20"
                  )}
                >
                  <span className="truncate">📝 Pré-Cad.</span>
                  <span className={cn("px-1.5 py-0.2 rounded-md text-[9px] font-black", activeCategory === "driver_application" ? "bg-white/20 text-white" : "bg-orange-500/20 text-orange-800 dark:text-orange-200")}>
                    {categoryCounts.driver_application}
                  </span>
                </button>
              </div>
            )}

            {/* Caixa de Busca Elegante */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={showContacts ? "Buscar contatos para iniciar conversa..." : "Buscar por nome, loja, telefone, pedido..."}
                className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-muted/50 border border-border/80 text-xs font-semibold placeholder:text-muted-foreground/70 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtros rápidos de Contato */}
            {showContacts && (
              <div className="flex gap-1.5 pt-1">
                {(["all", "company", "driver", "customer"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={cn(
                      "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                      filterType === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t === "all" ? "Todos" : typeLabel(t as ContactType)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LISTA DE CONVERSAS */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/20 p-2 space-y-1">
            {showContacts ? (
              filteredContacts.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground font-medium">Nenhum contato encontrado</div>
              ) : (
                filteredContacts.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => startConversation.mutate(c)}
                    disabled={startConversation.isPending}
                    className="w-full p-3 flex items-center gap-3.5 hover:bg-muted/60 rounded-2xl transition-all text-left group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-foreground truncate">{c.full_name}</p>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-0.5">
                        {typeIcon(c.type)}
                        {typeLabel(c.type)}
                      </span>
                    </div>
                  </button>
                ))
              )
            ) : loadingConvs ? (
              <div className="flex flex-col items-center justify-center p-16 space-y-3">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-semibold">Carregando conversas...</span>
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/40">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <p className="text-xs font-bold text-muted-foreground">Nenhuma conversa nesta categoria.</p>
                <Button size="sm" onClick={() => setShowContacts(true)} className="gap-2 rounded-xl font-bold px-4 py-2 shadow-sm">
                  <Plus className="h-4 w-4" /> Iniciar conversa
                </Button>
              </div>
            ) : (
              filteredConvs.map((conv: any) => {
                const category = getConversationCategory(conv);
                const profile = getOtherProfile(conv);
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const topicBadge = getConvTopicBadge(conv);
                const cleanSnippet = getCleanSnippet(conv);
                const isSelected = selectedConv?.id === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      "w-full p-3 rounded-2xl flex items-start gap-3 transition-all text-left cursor-pointer group relative border",
                      isSelected 
                        ? "bg-primary/10 border-primary/40 shadow-sm shadow-primary/5" 
                        : "border-transparent hover:bg-muted/50 hover:border-border/50"
                    )}
                  >
                    {/* Indicador Ativo Lateral */}
                    {isSelected && (
                      <div className="absolute left-1.5 top-3 bottom-3 w-1.5 bg-primary rounded-full" />
                    )}

                    {/* Avatar com Gradiente e Borda Temática */}
                    <div className="relative shrink-0 pl-1">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden border shadow-sm transition-transform group-hover:scale-105",
                        category === 'drivers' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                        category === 'companies' ? "bg-blue-500/10 border-blue-500/30 text-blue-600" :
                        category === 'store_customer' ? "bg-purple-500/10 border-purple-500/30 text-purple-600" :
                        category === 'driver_application' ? "bg-orange-500/10 border-orange-500/30 text-orange-600" :
                        "bg-indigo-500/10 border-indigo-500/30 text-indigo-600"
                      )}>
                        {category === 'drivers' ? <Bike className="h-5 w-5" /> :
                         category === 'companies' ? <Building2 className="h-5 w-5" /> :
                         category === 'store_customer' ? <ShoppingBag className="h-5 w-5" /> :
                         category === 'driver_application' ? <UserCheck className="h-5 w-5" /> :
                         profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> :
                         <User className="h-5 w-5 text-indigo-600" />}
                      </div>

                      {/* Status Dot */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                    </div>

                    <div className="min-w-0 flex-1 pr-1">
                      {/* Linha Superior: Categoria + Hora */}
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0",
                            category === 'drivers' ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" :
                            category === 'companies' ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300" :
                            category === 'store_customer' ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300" :
                            category === 'driver_application' ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300" :
                            "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                          )}>
                            {category === 'drivers' ? '🏍️ Entregador' :
                             category === 'companies' ? '🏪 Lojista' :
                             category === 'store_customer' ? '🛒 Loja ↔ Cli' :
                             category === 'driver_application' ? '📝 Pré-Cad.' :
                             '👤 Cliente'}
                          </span>

                          {topicBadge && (
                            <span className="text-[9px] font-bold text-muted-foreground/80 bg-muted/80 px-1.5 py-0.5 rounded truncate max-w-[110px]">
                              {topicBadge}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                          {formatConvTime(lastMsg?.created_at)}
                        </span>
                      </div>

                      {/* Nome do Contato / Título da Conversa */}
                      <p className="text-xs font-extrabold text-foreground truncate leading-snug">
                        {getConvTitle(conv)}
                      </p>

                      {/* Prévia da Mensagem */}
                      <p className="text-[11px] text-muted-foreground/80 truncate leading-snug mt-0.5 font-medium">
                        {cleanSnippet}
                      </p>
                    </div>

                    {/* Botão de Excluir Rápido */}
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      title="Apagar conversa"
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-all shrink-0 self-center active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ÁREA PRINCIPAL DO CHAT */}
        <div className={cn("flex-1 flex flex-col relative bg-muted/15", !selectedConv && "hidden md:flex")}>
          {selectedConv ? (
            <>
              {/* CABEÇALHO DO CHAT (PREMIUM) */}
              <div className="p-3.5 bg-card border-b border-border/80 flex items-center justify-between gap-3 shadow-sm z-10">
                <div className="flex items-center gap-3.5 min-w-0">
                  <button className="md:hidden p-2 rounded-xl hover:bg-muted text-foreground" onClick={() => setSelectedConv(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden border-2 shadow-sm shrink-0",
                    getConversationCategory(selectedConv) === 'drivers' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                    getConversationCategory(selectedConv) === 'companies' ? "bg-blue-500/10 border-blue-500/30 text-blue-600" :
                    getConversationCategory(selectedConv) === 'store_customer' ? "bg-purple-500/10 border-purple-500/30 text-purple-600" :
                    getConversationCategory(selectedConv) === 'driver_application' ? "bg-orange-500/10 border-orange-500/30 text-orange-600" :
                    "bg-indigo-500/10 border-indigo-500/30 text-indigo-600"
                  )}>
                    {getConversationCategory(selectedConv) === 'drivers' ? <Bike className="h-6 w-6" /> :
                     getConversationCategory(selectedConv) === 'companies' ? <Building2 className="h-6 w-6" /> :
                     getConversationCategory(selectedConv) === 'store_customer' ? <ShoppingBag className="h-6 w-6" /> :
                     getConversationCategory(selectedConv) === 'driver_application' ? <UserCheck className="h-6 w-6" /> :
                     getOtherProfile(selectedConv)?.avatar_url ? <img src={getOtherProfile(selectedConv)?.avatar_url} alt="" className="w-full h-full object-cover" /> :
                     <User className="h-6 w-6 text-indigo-600" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-foreground leading-tight truncate">
                        {getConvTitle(selectedConv)}
                      </h3>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider shrink-0",
                        getConversationCategory(selectedConv) === 'drivers' ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" :
                        getConversationCategory(selectedConv) === 'companies' ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30" :
                        getConversationCategory(selectedConv) === 'store_customer' ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30" :
                        getConversationCategory(selectedConv) === 'driver_application' ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30" :
                        "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                      )}>
                        {getConversationCategory(selectedConv) === 'drivers' ? 'Entregador Oficial' :
                         getConversationCategory(selectedConv) === 'companies' ? 'Restaurante / Lojista' :
                         getConversationCategory(selectedConv) === 'store_customer' ? 'Intermediação de Pedido' :
                         getConversationCategory(selectedConv) === 'driver_application' ? 'Candidato a Entregador' :
                         'Cliente Marketplace'}
                      </span>
                    </div>

                    {/* Linha de Metadados: Telefone, Pedido, ID com clique para copiar */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium mt-1">
                      {getOtherProfile(selectedConv)?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-primary" />
                          <span>{getOtherProfile(selectedConv).phone}</span>
                        </span>
                      )}

                      {selectedConv.order_id && (
                        <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          Pedido #{selectedConv.order_id.slice(-6).toUpperCase()}
                        </span>
                      )}

                      <button 
                        onClick={() => copyChatId(selectedConv.id)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        title="Copiar ID do Chat"
                      >
                        {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-60" />}
                        <span className="font-mono text-[10.5px]">#{selectedConv.id.slice(0, 8)}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ações do Topo */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteConversation(selectedConv.id)}
                    title="Apagar esta conversa e histórico"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-black transition-all cursor-pointer border border-destructive/20 active:scale-95 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Apagar Chat</span>
                  </button>
                </div>
              </div>

              {/* BANNER DE CONTEXTO ESPECÍFICO */}
              {getConversationCategory(selectedConv) === 'store_customer' && (
                <div className="bg-gradient-to-r from-purple-500/15 via-purple-500/10 to-transparent border-b border-purple-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
                  <div className="flex items-center gap-2.5 font-bold">
                    <Store className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Canal de Intermediação: você pode visualizar e intervir nas mensagens entre a Loja e o Cliente.</span>
                  </div>
                  {selectedConv.order_id && (
                    <span className="font-black text-[11px] bg-purple-600 text-white px-2.5 py-0.5 rounded-lg shadow-sm">
                      Pedido #{selectedConv.order_id.slice(-6).toUpperCase()}
                    </span>
                  )}
                </div>
              )}

              {getConversationCategory(selectedConv) === 'drivers' && (
                <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border-b border-emerald-500/20 px-5 py-2 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-bold">
                  <Bike className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Canal exclusivo de suporte operacional direto com o Entregador Parceiro.</span>
                </div>
              )}

              {getConversationCategory(selectedConv) === 'driver_application' && (
                <div className="bg-gradient-to-r from-orange-500/15 via-orange-500/10 to-transparent border-b border-orange-500/20 px-5 py-2 flex items-center gap-2.5 text-xs text-orange-900 dark:text-orange-200 font-bold">
                  <UserCheck className="h-4 w-4 text-orange-600 shrink-0" />
                  <span>Solicitação de novo cadastro de motorista para aprovação na base.</span>
                </div>
              )}

              {/* FLUXO DE MENSAGENS */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground font-bold">Sincronizando histórico...</span>
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <MessageSquare className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-extrabold text-foreground">Nenhuma mensagem nesta conversa.</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Envie uma mensagem abaixo para iniciar o atendimento diretamente com o usuário.
                    </p>
                  </div>
                ) : (
                  visibleMessages.map((msg: any, i: number) => {
                    const isTestAccountHack = msg.content?.endsWith('\u200B');
                    const isMe = (msg.sender_id === user?.id) || isTestAccountHack;
                    const displayContent = msg.content?.replace(/\u200B/g, '') || '';
                    const senderProfile = profilesMap?.[msg.sender_id];

                    return (
                      <div key={msg.id} className={cn("flex flex-col w-full animate-in fade-in slide-in-from-bottom-1 duration-200", isMe ? "items-end" : "items-start")}>
                        <div 
                          className={cn(
                            "relative max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-3xl shadow-md",
                            isMe 
                              ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground rounded-br-xs shadow-primary/10" 
                              : "bg-card border border-border/80 text-foreground rounded-bl-xs shadow-sm"
                          )}
                        >
                          {/* Nome do Remetente se for conversa de terceiros */}
                          {!isMe && (
                            <p className="text-[10.5px] font-black text-primary uppercase tracking-wider mb-1">
                              {senderProfile?.full_name || (senderProfile?.role === 'company' ? 'Estabelecimento' : 'Cliente')}
                            </p>
                          )}

                          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words font-medium">
                            {displayContent}
                          </p>

                          <div className={cn("flex items-center justify-end gap-1.5 mt-1.5", isMe ? "text-primary-foreground/75" : "text-muted-foreground")}>
                            <span className="text-[10px] font-bold">
                              {format(new Date(msg.created_at), "HH:mm")}
                            </span>
                            {isMe && (
                              <CheckCheck className="h-3.5 w-3.5 text-sky-200" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* RESPOSTAS RÁPIDAS (CHIPS) */}
              <div className="px-4 py-1.5 bg-card/60 border-t border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-black uppercase text-muted-foreground/70 shrink-0 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Respostas Rápidas:
                </span>
                {QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(reply)}
                    disabled={sendMessage.isPending}
                    className="px-3 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-[11px] font-bold text-muted-foreground whitespace-nowrap transition-all border border-border/60 hover:border-primary/30 shrink-0 shadow-2xs"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* BARRA DE ENVIO DE MENSAGEM */}
              <div className="p-3 bg-card border-t border-border/80">
                <div className="flex items-center gap-2 max-w-5xl mx-auto">
                  <div className="flex-1 bg-muted/60 border border-border/80 rounded-2xl flex items-center px-4 py-1.5 shadow-inner focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                      placeholder="Escreva sua resposta como Administrador..."
                      className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60 py-2 font-medium"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleSend()}
                    disabled={!message.trim() || sendMessage.isPending}
                    className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    {sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-5 text-primary shadow-xl shadow-primary/5">
                <MessageSquare className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">Central de Atendimento Unificada</h2>
              <p className="text-xs text-muted-foreground max-w-md mb-6 font-medium leading-relaxed">
                Selecione qualquer conversa ao lado para responder em tempo real, 
                auditar conversas de pedidos entre <strong>Lojas e Clientes</strong> ou acompanhar solicitações de <strong>Entregadores</strong>.
              </p>
              <Button onClick={() => setShowContacts(true)} className="gap-2.5 rounded-2xl font-extrabold px-6 py-3 shadow-lg shadow-primary/20 active:scale-95 transition-all">
                <Plus className="h-4 w-4" /> Iniciar Nova Conversa
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
