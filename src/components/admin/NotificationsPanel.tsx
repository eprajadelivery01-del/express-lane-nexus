import { Bell, ChevronRight } from "lucide-react";
import { useDeliveries } from "@/services/deliveries";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const INITIAL_LIMIT = 6;
const EXPANDED_LIMIT = 15;

export function NotificationsPanel() {
  const { data } = useDeliveries({ pageSize: 20 });
  const allDeliveries = data?.data ?? [];
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const limit = expanded ? EXPANDED_LIMIT : INITIAL_LIMIT;
  const deliveries = allDeliveries.slice(0, limit);
  const hasMore = allDeliveries.length > limit;

  const getIcon = (status: string) => {
    switch (status) {
      case "pending": return "📦";
      case "broadcasted": return "📡";
      case "accepted": return "✅";
      case "collecting": return "🏪";
      case "in_transit": return "🏍️";
      case "delivered": return "🎉";
      case "cancelled": return "❌";
      default: return "📦";
    }
  };

  const getTitle = (d: any) => {
    const name = d.companies?.name || "Empresa";
    switch (d.status) {
      case "pending": return `Novo pedido de ${name}`;
      case "broadcasted": return `Pedido enviado para motoboys`;
      case "accepted": return `Pedido aceito`;
      case "in_transit": return `Entrega em rota`;
      case "delivered": return `Entrega finalizada`;
      case "cancelled": return `Entrega cancelada`;
      default: return `Atualização: ${d.status}`;
    }
  };

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Header compacto */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
            <Bell className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Atividade Recente</h3>
        </div>
        <span className="text-[10px] font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
          {allDeliveries.length}
        </span>
      </div>

      {/* Lista limitada com altura fixa */}
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/20 max-h-[420px]">
        {deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-3 border border-dashed border-border/60">
              <Bell className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-bold text-foreground">Sem atividade</p>
            <p className="text-xs text-muted-foreground mt-1 px-4">
              Nenhuma entrega registrada recentemente.
            </p>
          </div>
        ) : (
          deliveries.map((d) => (
            <div
              key={d.id}
              onClick={() => navigate("/admin/deliveries")}
              className="flex items-start gap-3 p-3.5 hover:bg-muted/30 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center shrink-0 text-base">
                {getIcon(d.status)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {getTitle(d)}
                  </p>
                  <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    {d.updated_at ? format(new Date(d.updated_at), "HH:mm") : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-medium text-muted-foreground/80 truncate">
                    {d.customer_name || "—"}
                  </p>
                  <div className="w-0.5 h-0.5 rounded-full bg-border" />
                  <p className="text-[10px] font-bold text-primary whitespace-nowrap">
                    R$ {Number(d.value ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer com ações */}
      {allDeliveries.length > 0 && (
        <div className="border-t border-border/30 px-3 py-2.5 flex items-center justify-between gap-2 bg-muted/10 shrink-0">
          {hasMore ? (
            <button
              onClick={() => setExpanded(true)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Ver mais ({allDeliveries.length - limit})
            </button>
          ) : expanded ? (
            <button
              onClick={() => setExpanded(false)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Mostrar menos
            </button>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground/60">
              Mostrando {deliveries.length} de {allDeliveries.length}
            </span>
          )}
          <button
            onClick={() => navigate("/admin/deliveries")}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
          >
            Ver todas <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
