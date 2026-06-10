import { useState, useEffect, useRef, useCallback } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Truck, Clock, CheckCircle, Package, Loader2,
  Bell, ListFilter, AlertCircle, ShoppingBag, Volume2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { OrderCard } from "@/components/business/OrderCard";
import { useCompanyOrders, useUpdateOrderStatus } from "@/services/orders";
import { cn } from "@/lib/utils";

const AUDIO_UNLOCKED_KEY = "epj_audio_unlocked";

// Play a beep using Web Audio API (no external file needed, no autoplay block)
function playOrderBeep(ctx: AudioContext) {
  const times = [0, 0.18, 0.36];
  times.forEach((t) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime + t);
    gain.gain.setValueAtTime(0.6, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.16);
  });
}

export default function BusinessOrdersPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const qc = useQueryClient();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(() => {
    try { return localStorage.getItem(AUDIO_UNLOCKED_KEY) === "true"; } catch { return false; }
  });

  const unlockAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      // Play a silent buffer to unlock
      const buf = audioCtxRef.current.createBuffer(1, 1, 22050);
      const src = audioCtxRef.current.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtxRef.current.destination);
      src.start(0);
      localStorage.setItem(AUDIO_UNLOCKED_KEY, "true");
      setAudioUnlocked(true);
      toast.success("🔔 Notificações sonoras ativadas!");
    } catch (e) {
      console.warn("Erro ao ativar áudio:", e);
    }
  }, []);

  const playSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().then(() => playOrderBeep(audioCtxRef.current!));
      } else {
        playOrderBeep(audioCtxRef.current);
      }
    } catch (e) {
      console.warn("Erro ao tocar som:", e);
    }
  }, []);

  // If already unlocked from a previous session, init AudioContext silently
  useEffect(() => {
    if (audioUnlocked && !audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {}
    }
  }, [audioUnlocked]);

  // Fetch company
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      let { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!company) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          const { data: fallback } = await supabase
            .from("companies")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          company = fallback;
        }
      }
      if (company) setCompanyId(company.id);
    };
    init();
  }, [user]);

  // Use the orders service hooks
  const { data: orders = [], isLoading: loadingOrders } = useCompanyOrders(companyId);
  const updateStatus = useUpdateOrderStatus();

  // Real-time synchronization for orders
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`orders-business-${companyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `company_id=eq.${companyId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["orders", "company", companyId] });
          // Tocar som de novo pedido (só se áudio desbloqueado)
          if (localStorage.getItem(AUDIO_UNLOCKED_KEY) === "true") {
            playSound();
          }
          toast.success("NOVO PEDIDO RECEBIDO! 🛎️", {
            description: "Um novo pedido chegou no marketplace.",
            duration: 10000,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `company_id=eq.${companyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", "company", companyId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders", filter: `company_id=eq.${companyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", "company", companyId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", "company", companyId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId, qc]);

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ orderId, status });
      toast.success(`Pedido atualizado para ${status === 'preparing' ? 'Em Preparo' : status === 'ready' ? 'Pronto' : status}`);
    } catch (err: any) {
      toast.error("Erro ao atualizar pedido: " + err.message);
    }
  };

  // Kanban Columns
  const columns = [
    { id: "pending", title: "Novos", icon: Bell, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { id: "preparing", title: "Em Preparo", icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { id: "ready", title: "Prontos", icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  return (
    <BusinessLayout title="Gestão de Pedidos">
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Banner de ativação de som — aparece UMA vez até o usuário clicar */}
        {!audioUnlocked && (
          <button
            onClick={unlockAudio}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all animate-in fade-in duration-500"
          >
            <Volume2 className="h-5 w-5 shrink-0 animate-pulse" />
            <div className="text-left">
              <p className="text-sm font-black">Clique aqui para ativar as notificações sonoras</p>
              <p className="text-xs font-medium opacity-70">Necessário apenas uma vez. Você receberá um bip a cada novo pedido.</p>
            </div>
          </button>
        )}

        {/* Header Stats & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">
              Quadro de Comandos 👨‍🍳
            </h2>
            <p className="text-muted-foreground font-medium">Acompanhe e prepare os pedidos do marketplace em tempo real.</p>
          </div>

          <div className="flex items-center gap-3">
             <div className="px-6 py-3 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4">
                <div className="text-center">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Hoje</p>
                   <p className="text-xl font-black text-foreground">{orders.length}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pendentes</p>
                   <p className="text-xl font-black text-yellow-500">{orders.filter(o => o.status === 'pending').length}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Kanban Board */}
        {loadingOrders ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground animate-pulse">Sincronizando com a cozinha...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((col) => {
              const colOrders = orders.filter((o) => o.status === col.id);
              return (
                <div key={col.id} className="flex flex-col gap-4 min-h-[500px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", col.bg)}>
                        <col.icon className={cn("h-4 w-4", col.color)} />
                      </div>
                      <h3 className="font-black text-foreground uppercase tracking-tighter text-sm">{col.title}</h3>
                      <span className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-black text-muted-foreground">
                        {colOrders.length}
                      </span>
                    </div>
                    <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                      <ListFilter className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Column Content */}
                  <div className={cn(
                    "flex-1 rounded-[2.5rem] p-3 space-y-4 border-2 border-dashed transition-colors",
                    colOrders.length === 0 ? "border-border/40 bg-muted/5" : "border-transparent bg-muted/20"
                  )}>
                    {colOrders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                        <ShoppingBag className="h-10 w-10 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Vazio</p>
                      </div>
                    ) : (
                      colOrders.map((order) => (
                        <OrderCard 
                          key={order.id} 
                          order={order} 
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend / Info */}
        <div className="bg-card border border-border rounded-3xl p-6 flex items-center gap-4 shadow-sm">
           <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-primary" />
           </div>
           <div>
              <p className="text-sm font-bold text-foreground">Como funciona o fluxo?</p>
              <p className="text-xs text-muted-foreground">
                Ao mover um pedido para <span className="font-bold text-green-600">"Pronto"</span>, o sistema solicita automaticamente um entregador no seu <span className="font-bold text-primary">Painel de Entregas</span>.
              </p>
           </div>
        </div>

      </div>
    </BusinessLayout>
  );
}
