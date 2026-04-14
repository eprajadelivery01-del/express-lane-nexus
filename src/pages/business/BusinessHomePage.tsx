import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Truck, Clock, CheckCircle, Loader2, ArrowLeft, MapPin, Package, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { CustomerSelector } from "@/components/business/CustomerSelector";

export default function BusinessHomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    const cId = await fetchCompanyId();
    if (!cId) return;

    const { data } = await supabase
      .from("deliveries")
      .select("*")
      .eq("company_id", cId)
      .order("created_at", { ascending: false });
    
    setDeliveries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDeliveries();
    
    // Realtime subscription
    const channel = supabase
      .channel("business-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => {
        fetchDeliveries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = {
    pending: deliveries.filter(d => d.status === "pending" || d.status === "broadcasted" || d.status === "accepted" || d.status === "collecting").length,
    in_transit: deliveries.filter(d => d.status === "in_transit").length,
    delivered: deliveries.filter(d => d.status === "delivered").length,
  };

  return (
    <BusinessLayout title="Painel de Entregas">
      {showNewDelivery ? (
        <NewDeliveryForm onClose={() => setShowNewDelivery(false)} />
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Olá, {profile?.full_name?.split(" ")[0] || "Lojista"} 👋
              </h2>
              <p className="text-muted-foreground font-medium">Gerencie suas solicitações de entrega em tempo real.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/chat")}
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
                className="px-8 py-4 rounded-2xl modal-gradient text-white text-lg font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Plus className="h-6 w-6" />
                Nova Entrega
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="Pendentes" value={stats.pending.toString()} icon={Clock} color="warning" />
            <StatCard label="Em trânsito" value={stats.in_transit.toString()} icon={Truck} color="primary" />
            <StatCard label="Entregues" value={stats.delivered.toString()} icon={CheckCircle} color="success" />
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Atividade Recente</h3>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : deliveries.length === 0 ? (
              <div className="bg-card border border-border rounded-[2.5rem] p-12 text-center shadow-card border-dashed">
                <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                   <Package className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Sem atividade recente</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">Suas novas solicitações de entrega aparecerão aqui.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="bg-card border border-border rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg transition-all border-l-4 border-l-primary">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{delivery.customer_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{delivery.address || delivery.delivery_address}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Valor</p>
                        <p className="text-lg font-black text-foreground">R$ {parseFloat(delivery.value || 0).toFixed(2).replace(".", ",")}</p>
                      </div>
                      
                      <div className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest",
                        delivery.status === "delivered" ? "bg-success/10 text-success" :
                        delivery.status === "in_transit" ? "bg-primary/10 text-primary" :
                        "bg-warning/10 text-warning"
                      )}>
                        {delivery.status === "delivered" ? "Concluído" :
                         delivery.status === "in_transit" ? "Em Rota" :
                         delivery.status === "pending" || delivery.status === "broadcasted" ? "Buscando Motoboy" : 
                         "Processando"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </BusinessLayout>
  );
}

import { cn } from "@/lib/utils";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/10",
    success: "text-success bg-success/10",
  };
  
  return (
    <div className="bg-card rounded-3xl p-6 shadow-card border border-border/50 hover:border-primary/20 transition-all group">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", colors[color])}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-4xl font-black text-foreground tracking-tight">{value}</p>
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function NewDeliveryForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const fetchCompanyId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    return company?.id || null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const cId = companyId || await fetchCompanyId();
      if (!cId) throw new Error("Empresa não encontrada.");

      // Check if customer exists in 'customers' table by name
      const { data: existingCust } = await supabase
        .from("customers")
        .select("id")
        .ilike("name", customerName)
        .maybeSingle();

      let finalCustomerId = existingCust?.id;

      if (!finalCustomerId) {
        // Create new anonymous customer
        const { data: newCust, error: custError } = await supabase
          .from("customers")
          .insert([{ name: customerName }])
          .select("id")
          .single();
        
        if (custError) console.error("Error creating customer profile:", custError);
        if (newCust) {
          finalCustomerId = newCust.id;
          // Also create initial address for them
          await supabase.from("addresses").insert([{
            customer_id: newCust.id,
            street: address.split(",")[0] || address,
            city: "Diamantino", // Default or extract from string
            state: "MT",
            is_default: true
          }]);
        }
      }

      const { error } = await supabase.from("deliveries").insert([{
        company_id: cId,
        customer_name: customerName,
        address: address, 
        value: value ? parseFloat(value) : 0, 
        notes: notes || null,
        status: "pending",
        commission: 0
      }]);

      if (error) throw error;

      toast.success("Entrega solicitada com sucesso!");
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar entrega");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCompanyId().then(setCompanyId);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-left-4 duration-300">
      <button onClick={onClose} className="group flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors px-2">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Voltar ao Início
      </button>

      <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <h2 className="text-2xl font-black text-foreground mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
             <Plus className="h-6 w-6 text-primary-foreground" />
          </div>
          Nova Solicitação de Entrega
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="md:col-span-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Destinatário</label>
            {companyId && (
              <CustomerSelector 
                companyId={companyId} 
                value={customerName}
                onChange={(name, addr) => {
                  setCustomerName(name);
                  if (addr) setAddress(addr);
                }}
              />
            )}
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Endereço de Entrega</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro e complemento"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-background/50 font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-base"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Valor do Pedido (R$)</label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-4 rounded-2xl border border-border bg-background/50 font-medium outline-none focus:border-primary transition-all text-base"
              required
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Dificuldade/Tipo (Opcional)</label>
            <select className="w-full px-4 py-4 rounded-2xl border border-border bg-background/50 font-medium outline-none focus:border-primary transition-all text-base">
               <option>Padrão</option>
               <option>Frágil</option>
               <option>Grande Porte</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Observações do Admin/Entregador</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ponto de referência, campainha, andar..."
              rows={3}
              className="w-full px-4 py-4 rounded-2xl border border-border bg-background/50 font-medium outline-none focus:border-primary resize-none transition-all text-base"
            />
          </div>

          <div className="md:col-span-2 pt-4">
            <button
              type="submit"
              disabled={submitting || !customerName || !address}
              className="w-full py-5 rounded-2xl gradient-primary text-primary-foreground text-lg font-black shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all"
            >
              {submitting && <Loader2 className="h-6 w-6 animate-spin" />}
              {submitting ? "Publicando..." : "Confirmar Solicitação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

