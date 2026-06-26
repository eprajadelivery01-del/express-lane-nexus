import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Plus, Truck, Clock, CheckCircle, Loader2, Package, Trash2, Pencil, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveries } from "@/services/deliveries";
import { useCompany } from "@/services/companies";
import { DeliveryStatusBadge } from "@/components/admin/DeliveryStatusBadge";
import type { DeliveryStatus } from "@/types/models";
import { cn } from "@/lib/utils";
import NewDeliveryForm from "@/components/business/NewDeliveryForm";

export default function BusinessHomePage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const qc = useQueryClient();
  
  const { data: companyData } = useCompany(user?.id);
  const companyId = companyData?.id;

  const { data, isLoading } = useDeliveries({
    companyId: companyId || undefined,
    pageSize: 10
  });

  const deliveries = data?.data || [];
  
  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel("business-home-deliveries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `company_id=eq.${companyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["deliveries"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, qc]);

  const stats = {
    pending: deliveries.filter(d => ["pending", "broadcasted"].includes(d.status)).length,
    inRoute: deliveries.filter(d => ["accepted", "collecting", "in_route", "in_transit"].includes(d.status)).length,
    completed: deliveries.filter(d => d.status === "delivered").length
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta entrega?")) return;
    
    try {
      const { error } = await supabase
        .from("deliveries")
        .update({ status: "cancelled" })
        .eq("id", id);
        
      if (error) throw error;
      toast.success("Entrega cancelada com sucesso");
      qc.invalidateQueries({ queryKey: ["deliveries"] });
    } catch (error: any) {
      toast.error("Erro ao cancelar: " + error.message);
    }
  };

  const handleEdit = (delivery: any) => {
    setEditingDelivery(delivery);
    setShowNewDelivery(true);
  };

  return (
    <BusinessLayout title="Painel de Entregas">
      {showNewDelivery ? (
        <NewDeliveryForm 
          onClose={() => {
            setShowNewDelivery(false);
            setEditingDelivery(null);
          }} 
          initialData={editingDelivery}
          companyId={companyId}
          companyData={companyData}
        />
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Olá, {companyData?.name || profile?.full_name?.split(" ")[0] || "Lojista"} 👋
              </h2>
              <p className="text-muted-foreground font-medium">Gerencie suas solicitações de entrega em tempo real.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/business/chat")}
                className="p-4 rounded-2xl bg-card border border-border text-foreground hover:bg-muted transition-all shadow-lg flex items-center justify-center group"
                title="Chat com Central"
              >
                <div className="relative">
                  <MessageSquare className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                </div>
              </button>

              <button
                onClick={() => setShowNewDelivery(true)}
                className="px-8 py-4 rounded-2xl bg-primary text-white text-lg font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Plus className="h-6 w-6" />
                Nova Entrega
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="Pendentes" value={String(stats.pending)} icon={Clock} color="warning" />
            <StatCard label="Em trânsito" value={String(stats.inRoute)} icon={Truck} color="primary" />
            <StatCard label="Entregues" value={String(stats.completed)} icon={CheckCircle} color="success" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : deliveries.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-2">Atividade Recente</h3>
              <div className="grid grid-cols-1 gap-4">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="bg-card border border-border/50 rounded-[2rem] p-6 shadow-sm hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                        <Package className="h-7 w-7 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-foreground truncate">{delivery.customer_name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5" /> {delivery.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:gap-8">
                       <div className="text-left md:text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Status</p>
                          <DeliveryStatusBadge status={delivery.status as DeliveryStatus} />
                       </div>
                       <div className="text-left md:text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Valor</p>
                          <p className="text-lg font-black text-foreground">R$ {Number(delivery.value || (delivery as any).price || 0).toFixed(2)}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          {["pending", "broadcasted"].includes(delivery.status) && (
                            <>
                              <button 
                                onClick={() => handleEdit(delivery)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleCancel(delivery.id)}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                title="Cancelar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-[2.5rem] p-12 text-center shadow-sm border-dashed animate-in fade-in duration-700">
              <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                 <Package className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Sem atividade recente</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">Suas novas solicitações de entrega aparecerão aqui.</p>
            </div>
          )}
        </div>
      )}
    </BusinessLayout>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/10",
    success: "text-green-500 bg-green-500/10",
  };
  
  return (
    <div className="bg-card rounded-3xl p-6 shadow-sm border border-border/50 hover:border-primary/20 transition-all group">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", colors[color])}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-4xl font-black text-foreground tracking-tight">{value}</p>
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

