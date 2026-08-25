import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, Loader2, Send, Paperclip, Smile, MoreVertical, Phone, Video, Search, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMessages, useSendMessage } from "@/services/chat";
import { useAuth } from "@/hooks/useAuth";
import { markConversationAsOpened } from "@/hooks/useAdminBadges";
import { useSearchParams } from "react-router-dom";
import { WhatsAppBubble } from "@/components/chat/WhatsAppBubble";

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const qc = useQueryClient();
  
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConv?.id) {
      markConversationAsOpened(selectedConv.id);
    }
  }, [selectedConv?.id]);
  
  // Fetch profiles for participants
  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url");
      return data?.reduce((acc: any, p) => ({ ...acc, [p.user_id]: p }), {}) || {};
    }
  });

  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Effect to handle userId from URL
  useEffect(() => {
    if (targetUserId && conversations && user?.id) {
      const existing = conversations.find(c => 
        c.participants.includes(targetUserId) && c.participants.includes(user.id) && !c.order_id
      );
      if (existing) {
        setSelectedConv(existing);
      } else {
        // Create new direct conversation
        const startConv = async () => {
          const { data, error } = await supabase
            .from("conversations")
            .insert({ participants: [user.id, targetUserId] })
            .select()
            .single();
          if (!error && data) {
            qc.invalidateQueries({ queryKey: ["admin-conversations"] });
            setSelectedConv(data);
          }
        };
        startConv();
      }
    }
  }, [targetUserId, conversations, user?.id, qc]);

  const { data: messages, isLoading: loadingMessages } = useMessages(selectedConv?.id);
  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedConv) return;
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConv.id,
        content: message.trim()
      });
      setMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  const getConvTitle = (conv: any) => {
    if (conv.order_id) return `Pedido #${conv.order_id.slice(0, 8)}`;
    const otherParticipant = conv.participants.find((p: string) => p !== user?.id);
    return profiles?.[otherParticipant]?.full_name || "Conversa Direta";
  };

  const getTargetProfile = () => {
    if (!selectedConv) return null;
    const otherParticipant = selectedConv.participants.find((p: string) => p !== user?.id);
    return profiles?.[otherParticipant];
  };

  return (
    <AdminLayout title="Chat Operacional" subtitle="Comunicação rápida com lojistas e entregadores" fullHeight>
      <div className="flex h-full w-full min-w-0 min-h-0 bg-[#f0f2f5] dark:bg-[#0b141a] overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 md:w-96 shrink-0 border-r border-border flex flex-col bg-card min-w-0 overflow-hidden">
          <div className="p-4 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between border-b border-border/10">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex gap-4 text-muted-foreground">
              <MessageSquare className="h-5 w-5 cursor-pointer" />
              <MoreVertical className="h-5 w-5 cursor-pointer" />
            </div>
          </div>

          <div className="p-2 border-b border-border/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                placeholder="Pesquisar ou começar uma nova conversa"
                className="w-full bg-[#f0f2f5] dark:bg-[#202c33] border-none rounded-lg py-2 pl-10 pr-4 text-xs outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loadingConvs ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (conversations ?? []).length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground italic">Nenhuma conversa ativa</div>
            ) : conversations?.map((conv) => {
              const profile = profiles?.[conv.participants.find((p: string) => p !== user?.id)];
              const lastMsg = (conv as any).last_message;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={cn(
                    "w-full p-3 flex items-center gap-3 hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942] transition-colors border-b border-border/5 text-left",
                    selectedConv?.id === conv.id && "bg-[#ebebeb] dark:bg-[#2a3942]"
                  )}
                >
                  <div className="w-12 h-12 rounded-full relative shrink-0">
                    <div className="w-full h-full rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[0.95rem] font-semibold text-foreground truncate ">{getConvTitle(conv)}</span>
                      <span className="text-[0.65rem] text-muted-foreground whitespace-nowrap">
                        {lastMsg ? format(new Date(lastMsg.created_at), "HH:mm") : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate leading-snug">
                      {lastMsg?.content || "Inicie a conversa agora"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col relative">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-border/10 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border">
                    {getTargetProfile()?.avatar_url ? (
                      <img src={getTargetProfile()?.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><User className="h-5 w-5 opacity-50" /></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-tight">{getConvTitle(selectedConv)}</h3>
                    <p className="text-[0.65rem] text-primary font-bold uppercase tracking-wider">Online</p>
                  </div>
                </div>
                <div className="flex gap-5 text-muted-foreground pr-2">
                  <Video className="h-5 w-5 cursor-pointer opacity-70 hover:opacity-100" />
                  <Phone className="h-5 w-5 cursor-pointer opacity-70 hover:opacity-100" />
                  <Search className="h-5 w-5 cursor-pointer opacity-70 hover:opacity-100" />
                  <MoreVertical className="h-5 w-5 cursor-pointer opacity-70 hover:opacity-100" />
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:px-8 space-y-1 relative scroll-smooth"
                style={{ 
                  backgroundImage: `url('/whatsapp_chat_pattern.png')`,
                  backgroundSize: '400px',
                  backgroundColor: 'rgba(230,221,212,0.6)' 
                }}
              >
                {/* Background overlay for color */}
                <div className="absolute inset-0 bg-[#e5ddd5]/40 dark:bg-[#0b141a]/95 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col gap-2">
                  <div className="mx-auto my-4 bg-[#f0f2f5] dark:bg-[#182229] px-3 py-1.5 rounded-lg text-[0.65rem] text-muted-foreground uppercase font-bold tracking-widest shadow-sm">
                    Hoje
                  </div>

                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : messages?.map((msg, i) => {
                    // A identificação verdadeira deve ser SEMPRE pelo sender_id.
                    // Se em ambiente de teste for a mesma conta, o zero-width space ainda é usado como fallback temporário.
                    const isTestAccountHack = msg.content.endsWith('\u200B');
                    const isMe = (msg.sender_id === user?.id) || isTestAccountHack;
                    const displayContent = msg.content.replace(/\u200B/g, '');

                    return (
                      <WhatsAppBubble 
                        key={msg.id} 
                        content={displayContent} 
                        timestamp={msg.created_at} 
                        isMe={isMe}
                        showTail={i === 0 || messages[i-1].sender_id !== msg.sender_id}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Footer / Input */}
              <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center gap-4 z-10">
                <div className="flex gap-4 text-muted-foreground">
                  <Smile className="h-6 w-6 cursor-pointer hover:text-foreground" />
                  <Paperclip className="h-6 w-6 cursor-pointer hover:text-foreground" />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Mensagem"
                    className="w-full bg-card dark:bg-[#2a3942] border-none rounded-xl px-4 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35] border-l border-border/10">
              <div className="w-64 h-64 bg-primary/5 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 border-4 border-dashed border-primary/10 rounded-full animate-spin-slow" />
                <MessageSquare className="h-24 w-24 text-primary opacity-20" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Nexus Chat Pro</h2>
              <p className="text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
                Envie e receba mensagens em tempo real para gerenciar suas operações com agilidade total.
              </p>
              <div className="mt-12 flex items-center gap-2 text-[0.65rem] text-muted-foreground uppercase font-black tracking-widest opacity-50">
                <CheckCheck className="h-3 w-3" /> Criptografia de ponta a ponta
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
