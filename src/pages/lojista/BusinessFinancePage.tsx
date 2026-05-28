import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, TrendingUp, Clock, CheckCircle, Truck, Calendar } from "lucide-react";

type Delivery = {
  id: string;
  customer_name: string;
  address: string;
  status: string;
  value: number;
  created_at: string;
};

export default function BusinessFinancePage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    // Current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    supabase
      .from("deliveries")
      .select("id, customer_name, address, status, value, created_at")
      .eq("company_id", companyId)
      .gte("created_at", startOfMonth)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDeliveries(data ?? []);
        setLoading(false);
      });
  }, [companyId]);

  const totalAll = deliveries.reduce((sum, d) => sum + Number(d.value), 0);
  const totalCompleted = deliveries
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + Number(d.value), 0);
  const totalPending = deliveries
    .filter((d) => d.status !== "completed" && d.status !== "cancelled")
    .reduce((sum, d) => sum + Number(d.value), 0);
  const countCompleted = deliveries.filter((d) => d.status === "completed").length;
  const countPending = deliveries.filter((d) => d.status !== "completed" && d.status !== "cancelled").length;

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "text-yellow-500" },
    searching: { label: "Em busca", color: "text-blue-400" },
    accepted: { label: "Aceito", color: "text-primary" },
    picked_up: { label: "Coletado", color: "text-primary" },
    in_transit: { label: "Em rota", color: "text-primary" },
    delivered: { label: "Concluído", color: "text-green-500" },
    cancelled: { label: "Cancelado", color: "text-red-400" },
  };

  return (
    <BusinessLayout title="Financeiro">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Month label */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground capitalize">{monthName}</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Total do Mês</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? "—" : `R$ ${totalAll.toFixed(2)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{deliveries.length} pedidos</p>
          </div>

          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground font-medium">Concluídos</span>
            </div>
            <p className="text-2xl font-bold text-green-500">
              {loading ? "—" : `R$ ${totalCompleted.toFixed(2)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{countCompleted} entregas</p>
          </div>

          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground font-medium">Em Andamento</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500">
              {loading ? "—" : `R$ ${totalPending.toFixed(2)}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{countPending} pedidos</p>
          </div>
        </div>

        {/* Deliveries list */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Extrato do mês
          </h3>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-card rounded-xl h-16" />
              ))}
            </div>
          ) : deliveries.length === 0 ? (
            <div className="bg-card rounded-2xl p-10 text-center shadow-card">
              <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground">Nenhum pedido neste mês ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deliveries.map((d) => {
                const st = statusLabel[d.status] ?? { label: d.status, color: "text-muted-foreground" };
                const date = new Date(d.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={d.id} className="bg-card rounded-xl px-4 py-3 shadow-card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">R$ {Number(d.value).toFixed(2)}</p>
                      <p className={`text-[10px] font-semibold ${st.color}`}>{st.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
}
