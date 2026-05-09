import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Truck, Clock, CheckCircle, Package, Loader2,
  Bell, ListFilter, AlertCircle, ShoppingBag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { OrderCard } from "@/components/business/OrderCard";
import { useCompanyOrders, useUpdateOrderStatus } from "@/services/orders";
import { cn } from "@/lib/utils";

export default function BusinessOrdersPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const qc = useQueryClient();

  // Fetch company
  useEffect(() => {
    if (!user) return;
    supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setCompanyId(data.id); });
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
        { event: "*", schema: "public", table: "orders", filter: `company_id=eq.${companyId}` },
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
