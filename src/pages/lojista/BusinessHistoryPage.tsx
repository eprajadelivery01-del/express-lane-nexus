import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardList, Truck, MapPin, Calendar, Filter, ChevronDown } from "lucide-react";

type Delivery = {
  id: string;
  customer_name: string;
  address: string;
  status: string;
  value: number;
  created_at: string;
  delivered_at: string | null;
};

type FilterStatus = "all" | "delivered" | "cancelled";

export default function BusinessHistoryPage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

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
    setPage(0);

    let q = supabase
      .from("deliveries")
      .select("id, customer_name, address, status, value, created_at, delivered_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(0, pageSize - 1);

    if (filterStatus === "delivered") q = q.eq("status", "delivered");
    else if (filterStatus === "cancelled") q = q.eq("status", "cancelled");
    else q = q.in("status", ["delivered", "cancelled"]);

    q.then(({ data }) => {
      setDeliveries((data as any) ?? []);
      setLoading(false);
    });
  }, [companyId, filterStatus]);

  const loadMore = async () => {
    if (!companyId) return;
    const next = page + 1;
    let q = supabase
      .from("deliveries")
      .select("id, customer_name, address, status, value, created_at, delivered_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(next * pageSize, (next + 1) * pageSize - 1);

    if (filterStatus === "delivered") q = q.eq("status", "delivered");
    else if (filterStatus === "cancelled") q = q.eq("status", "cancelled");
    else q = q.in("status", ["delivered", "cancelled"]);

    const { data } = await q;
    if (data && data.length > 0) {
      setDeliveries((prev) => [...prev, ...(data as any)]);
      setPage(next);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const filters: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "delivered", label: "Concluídos" },
    { key: "cancelled", label: "Cancelados" },
  ];

  return (
    <BusinessLayout title="Histórico">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Count */}
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            {loading ? "Carregando..." : `${deliveries.length} registros`}
          </span>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-card rounded-2xl h-20" />
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 text-center shadow-card">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">Nenhum histórico encontrado.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {deliveries.map((d) => {
                const isDelivered = d.status === "completed";
                const isCancelled = d.status === "cancelled";
                return (
                  <div key={d.id} className="bg-card rounded-2xl p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isDelivered ? "bg-green-500/10" : isCancelled ? "bg-red-500/10" : "bg-muted"
                        }`}
                      >
                        <Truck
                          className={`h-5 w-5 ${
                            isDelivered ? "text-green-500" : isCancelled ? "text-red-400" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{d.customer_name}</p>
                          <span className="text-sm font-bold text-foreground shrink-0">
                            R$ {Number(d.value).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {d.address}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isDelivered
                                ? "bg-green-500/10 text-green-500"
                                : isCancelled
                                ? "bg-red-500/10 text-red-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isDelivered ? "Concluído" : isCancelled ? "Cancelado" : d.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {formatDate(d.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {deliveries.length >= pageSize && (
              <button
                onClick={loadMore}
                className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown className="h-4 w-4" /> Carregar mais
              </button>
            )}
          </>
        )}
      </div>
    </BusinessLayout>
  );
}
