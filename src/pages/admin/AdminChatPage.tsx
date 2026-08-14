import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, User, Loader2, Send, Search, ArrowLeft, 
  Building2, Bike, UserCircle, Plus, Trash2, Eraser, 
  Store, ShoppingBag, ShieldAlert, Sparkles, Filter,
  UserCheck, HelpCircle, Users
} from "lucide-react";
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
type ChatCategory = "all" | "drivers" | "companies" | "store_customer" | "customers" | "driver_application";

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
  const [activeCategory, setActiveCategory] = useState<ChatCategory>("all");
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
        supabase.from("companies").select("id, user_id, name, logo_url").or(`user_id.in.(${participantIds.join(',')}),id.in.(${participantIds.join(',')})`),
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
        const idMap = (idToMap: string) => {
          if (!map[idToMap]) map[idToMap] = { user_id: idToMap };
          map[idToMap].full_name = c.name;
          map[idToMap].avatar_url = c.logo_url;
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

  // Helper to determine conversation category with high precision
  const getConversationCategory = (conv: any): ChatCategory => {
    const topic = (conv.topic || "").toLowerCase();
    const title = (conv.title || "").toLowerCase();
    
    let firstMsgContent = "";
    if (conv.messages && conv.messages.length > 0) {
      const first = [...conv.messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      firstMsgContent = (first?.content || "").toLowerCase();
    }

    // 1. Driver Application (Pré-Cadastro de Entregador)
    if (
      topic === 'driver_application' || 
      title.includes('cadastro') || 
      title.includes('seja um entregador') ||
      firstMsgContent.includes('cadastro de entregador') ||
      firstMsgContent.includes('seja um entregador')
    ) {
      return 'driver_application';
    }

    // 2. Store <-> Customer (Intermediação Pedido)
    const isOrderLinked = !!conv.order_id || topic === 'suporte do pedido' || topic === 'order_support';
    const hasCompany = conv.participants?.some((p: string) => profilesMap?.[p]?.role === 'company');
    const hasNonAdminUser = conv.participants?.some((p: string) => {
      const role = profilesMap?.[p]?.role;
      return role !== 'company' && role !== 'admin';
    });

    if (isOrderLinked || (hasCompany && hasNonAdminUser && conv.participants?.length >= 2)) {
      return 'store_customer';
    }

    // 3. Driver direct chat (Entregadores Parceiros)
    const otherId = conv.participants?.find((id: string) => id !== user?.id) || conv.participants?.[0];
    const otherProfile = profilesMap?.[otherId];

    if (otherProfile?.role === 'driver' || topic.includes('driver') || topic.includes('entregador')) {
      return 'drivers';
    }

    // 4. Company direct chat (Lojistas)
    if (otherProfile?.role === 'company' || topic.includes('company') || topic.includes('lojista')) {
      return 'companies';
    }

    // 5. Customer direct support (Clientes)
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

  const getConvTitle = (conv: any) => {
    const category = getConversationCategory(conv);

    if (category === 'store_customer') {
      const { store, customer } = getStoreCustomerParticipants(conv);
      const storeName = store?.full_name || "Loja";
      const customerName = customer?.full_name || "Cliente";
      const orderTag = conv.order_id ? ` (#${conv.order_id.slice(0, 4).toUpperCase()})` : '';
      return `${storeName} ↔ ${customerName}${orderTag}`;
    }

    if (category === 'driver_application') {
      const otherProfile = getOtherProfile(conv);
      return `🏍️ Pré-Cadastro: ${otherProfile?.full_name || "Candidato a Entregador"}`;
    }

    if (category === 'drivers') {
      const otherProfile = getOtherProfile(conv);
      return `🏍️ ${otherProfile?.full_name || "Entregador Parceiro"}`;
    }

    if (category === 'companies') {
      const otherProfile = getOtherProfile(conv);
      return `🏪 ${otherProfile?.full_name || "Lojista Parceiro"}`;
    }

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
    return extractedTopic || conv.title || "Cliente / Suporte";
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
      case "driver": return <Bike className="h-3 w-3 text-emerald-500" />;
      case "customer": return <UserCircle className="h-3 w-3 text-indigo-500" />;
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

  return (
    <AdminLayout title="Central de Atendimento e Chats" subtitle="Comunicação segregada por Entregadores, Lojas, Clientes e Pedidos">
      <div className="flex h-[calc(100vh-13rem)] bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className={cn("w-full md:w-96 lg:w-[440px] border-r border-border flex flex-col bg-card shrink-0", selectedConv && "hidden md:flex")}>
          {/* Header */}
          <div className="p-3 border-b border-border space-y-2.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
                <button
                  onClick={() => setShowContacts(false)}
                  className={cn("px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5", !showContacts ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground")}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Conversas</span>
                </button>
                <button
                  onClick={() => setShowContacts(true)}
                  className={cn("px-3 py-1.5 rounded-lg transition-all flex items-center gap-1", showContacts ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground")}
                >
                  <Plus className="h-3.5 w-3.5" /> 
                  <span>Nova</span>
                </button>
              </div>

              {!showContacts && (
                <button
                  onClick={handleClearEmptyConversations}
                  disabled={isClearingEmpty}
                  title="Apagar todas as conversas sem mensagens"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[0.68rem] font-bold uppercase tracking-wider hover:bg-destructive/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isClearingEmpty ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eraser className="h-3 w-3" />}
                  <span>Limpar Vazias</span>
                </button>
              )}
            </div>

            {/* Granular Category Filter Tabs */}
            {!showContacts && (
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {/* 1. Todos */}
                <button
                  onClick={() => setActiveCategory("all")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-[10.5px] font-extrabold transition-all border text-center relative",
                    activeCategory === "all" 
                      ? "bg-foreground text-background border-foreground shadow-sm" 
                      : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span>📋 Todos</span>
                    <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeCategory === "all" ? "bg-background/20 text-background" : "bg-muted-foreground/20 text-foreground")}>
                      {categoryCounts.all}
                    </span>
                  </div>
                </button>

                {/* 2. Entregadores */}
                <button
                  onClick={() => setActiveCategory("drivers")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-[10.5px] font-extrabold transition-all border text-center relative",
                    activeCategory === "drivers" 
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">🏍️ Entregador</span>
                    <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeCategory === "drivers" ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200")}>
                      {categoryCounts.drivers}
                    </span>
                  </div>
                </button>

                {/* 3. Lojas / Empresas */}
                <button
                  onClick={() => setActiveCategory("companies")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-[10.5px] font-extrabold transition-all border text-center relative",
                    activeCategory === "companies" 
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">🏪 Lojistas</span>
                    <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeCategory === "companies" ? "bg-white/20 text-white" : "bg-blue-500/20 text-blue-800 dark:text-blue-200")}>
                      {categoryCounts.companies}
                    </span>
                  </div>
                </button>

                {/* 4. Lojas <-> Clientes */}
                <button
                  onClick={() => setActiveCategory("store_customer")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-[10.5px] font-extrabold transition-all border text-center relative",
                    activeCategory === "store_customer" 
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm" 
                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">🛒 Loja ↔ Cli</span>
                    <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeCategory === "store_customer" ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-800 dark:text-purple-200")}>
                      {categoryCounts.store_customer}
                    </span>
                  </div>
                </button>

                {/* 5. Clientes Suporte */}
                <button
                  onClick={() => setActiveCategory("customers")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-[10.5px] font-extrabold transition-all border text-center relative",
                    activeCategory === "customers" 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                      : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">👤 Clientes</span>
                    <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeCategory === "customers" ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200")}>
                      {categoryCounts.customers}
                    </span>
                  </div>
                </button>

                {/* 6. Pré-Cadastro Entregador */}
                <button
                  onClick={() => setActiveCategory("driver_application")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-[10.5px] font-extrabold transition-all border text-center relative",
                    activeCategory === "driver_application" 
                      ? "bg-orange-600 text-white border-orange-600 shadow-sm" 
                      : "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 hover:bg-orange-500/20"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">📝 Pré-Cad.</span>
                    <span className={cn("px-1.5 py-0.2 rounded-full text-[9px] font-black", activeCategory === "driver_application" ? "bg-white/20 text-white" : "bg-orange-500/20 text-orange-800 dark:text-orange-200")}>
                      {categoryCounts.driver_application}
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={showContacts ? "Buscar por nome ou loja..." : "Filtrar por nome, loja, telefone, pedido..."}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/60 border border-border text-xs outline-none focus:ring-2 focus:ring-primary/20 font-medium"
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
                      "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all",
                      filterType === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t === "all" ? "Todos" : typeLabel(t as ContactType)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/30">
            {showContacts ? (
              filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Nenhum contato encontrado</div>
              ) : (
                filteredContacts.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => startConversation.mutate(c)}
                    disabled={startConversation.isPending}
                    className="w-full p-3.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{c.full_name}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                        {typeIcon(c.type)}
                        {typeLabel(c.type)}
                      </span>
                    </div>
                  </button>
                ))
              )
            ) : loadingConvs ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-muted-foreground mb-3">Nenhuma conversa encontrada nesta categoria.</p>
                <Button size="sm" onClick={() => setShowContacts(true)} className="gap-1.5 rounded-xl font-bold">
                  <Plus className="h-3.5 w-3.5" /> Iniciar conversa
                </Button>
              </div>
            ) : (
              filteredConvs.map((conv: any) => {
                const category = getConversationCategory(conv);
                const profile = getOtherProfile(conv);
                const lastMsg = conv.messages?.[conv.messages.length - 1];

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      "w-full p-3.5 flex items-start gap-3 hover:bg-muted/50 transition-all text-left cursor-pointer group justify-between relative",
                      selectedConv?.id === conv.id && "bg-primary/5 border-l-4 border-l-primary shadow-sm",
                    )}
                  >
                    {/* Avatar / Icon Badge */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden border shadow-sm",
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
                         <User className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 pr-1">
                      {/* Top row: Category tag + Time */}
                      <div className="flex justify-between items-center mb-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                          category === 'drivers' ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" :
                          category === 'companies' ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300" :
                          category === 'store_customer' ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300" :
                          category === 'driver_application' ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300" :
                          "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                        )}>
                          {category === 'drivers' ? '🏍️ Entregador' :
                           category === 'companies' ? '🏪 Lojista' :
                           category === 'store_customer' ? '🛒 Loja ↔ Cliente' :
                           category === 'driver_application' ? '📝 Pré-Cadastro' :
                           '👤 Cliente'}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{formatConvTime(lastMsg?.created_at)}</span>
                      </div>

                      {/* Main Title */}
                      <p className="text-xs font-bold text-foreground truncate leading-snug">
                        {getConvTitle(conv)}
                      </p>

                      {/* Message preview */}
                      <p className="text-[11px] text-muted-foreground/80 truncate leading-snug mt-0.5 italic">
                        {lastMsg?.content?.replace(/\u200B/g, '') || "Nenhuma mensagem trocada ainda"}
                      </p>
                    </div>

                    {/* Botão de Excluir Conversa na Lista */}
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      title="Apagar conversa"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0 self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className={cn("flex-1 flex flex-col relative bg-muted/20", !selectedConv && "hidden md:flex")}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3.5 bg-card border-b border-border flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <button className="md:hidden p-1.5 rounded-lg hover:bg-muted" onClick={() => setSelectedConv(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden border shadow-sm shrink-0",
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
                     <User className="h-6 w-6 opacity-50" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-foreground leading-tight truncate">{getConvTitle(selectedConv)}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0",
                        getConversationCategory(selectedConv) === 'drivers' ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                        getConversationCategory(selectedConv) === 'companies' ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                        getConversationCategory(selectedConv) === 'store_customer' ? "bg-purple-500/10 text-purple-600 border border-purple-500/20" :
                        getConversationCategory(selectedConv) === 'driver_application' ? "bg-orange-500/10 text-orange-600 border border-orange-500/20" :
                        "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                      )}>
                        {getConversationCategory(selectedConv) === 'drivers' ? 'Entregador Parceiro' :
                         getConversationCategory(selectedConv) === 'companies' ? 'Lojista Parceiro' :
                         getConversationCategory(selectedConv) === 'store_customer' ? 'Intermediação Loja ↔ Cliente' :
                         getConversationCategory(selectedConv) === 'driver_application' ? 'Pré-Cadastro Entregador' :
                         'Cliente do Marketplace'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {selectedConv.order_id ? `Vinculado ao Pedido: #${selectedConv.order_id}` : `ID do Chat: ${selectedConv.id.slice(0, 8)}`}
                    </p>
                  </div>
                </div>

                {/* Botão Apagar Chat Aberto */}
                <button
                  onClick={() => handleDeleteConversation(selectedConv.id)}
                  title="Apagar esta conversa e mensagens"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Apagar Chat</span>
                </button>
              </div>

              {/* Informative Banner for Driver Chat */}
              {getConversationCategory(selectedConv) === 'drivers' && (
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                  <Bike className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Canal exclusivo de comunicação direta entre a Administração e o <strong>Entregador Parceiro</strong>.</span>
                </div>
              )}

              {/* Informative Banner for Company Chat */}
              {getConversationCategory(selectedConv) === 'companies' && (
                <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200 font-medium">
                  <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Canal exclusivo de suporte e comunicação direta com o <strong>Lojista / Estabelecimento</strong>.</span>
                </div>
              )}

              {/* Informative Banner for Store <-> Customer */}
              {getConversationCategory(selectedConv) === 'store_customer' && (
                <div className="bg-purple-500/10 border-b border-purple-500/20 px-4 py-2 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
                  <div className="flex items-center gap-2 font-medium">
                    <Store className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Visualizando o histórico de mensagens trocadas entre o Estabelecimento e o Cliente sobre o pedido.</span>
                  </div>
                  {selectedConv.order_id && (
                    <span className="font-bold text-[11px] bg-purple-200 dark:bg-purple-900/50 px-2 py-0.5 rounded-md">
                      Pedido #{selectedConv.order_id.slice(-6).toUpperCase()}
                    </span>
                  )}
                </div>
              )}

              {/* Informative Banner for Driver Application */}
              {getConversationCategory(selectedConv) === 'driver_application' && (
                <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 flex items-center gap-2 text-xs text-orange-900 dark:text-orange-200 font-medium">
                  <UserCheck className="h-4 w-4 text-orange-600 shrink-0" />
                  <span>Solicitação de pré-cadastro de novo motorista querendo ingressar na plataforma.</span>
                </div>
              )}

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-8 scroll-smooth">
                <div className="flex flex-col gap-1 pb-4">
                  {messages?.length === 0 && (
                    <div className="text-center py-16">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-muted-foreground">Nenhuma mensagem registrada nesta conversa.</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">Envie uma mensagem abaixo para falar com os participantes.</p>
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

              {/* Input */}
              <div className="p-3 bg-card border-t border-border flex items-center gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Responder como Administrador..."
                  className="flex-1 bg-muted/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessage.isPending}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 text-primary shadow-sm">
                <MessageSquare className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-black text-foreground mb-1">Central de Chat Segmentada</h2>
              <p className="text-xs text-muted-foreground max-w-md mb-6 font-medium leading-relaxed">
                Utilize as categorias acima para filtrar exclusivamente conversas com <strong>Entregadores</strong>, 
                <strong>Lojistas</strong>, <strong>Clientes</strong> ou acompanhar <strong>Pré-Cadastros e Pedidos</strong>.
              </p>
              <Button onClick={() => setShowContacts(true)} className="gap-2 rounded-xl font-bold px-5 py-2.5 shadow-md">
                <Plus className="h-4 w-4" /> Nova Conversa
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
