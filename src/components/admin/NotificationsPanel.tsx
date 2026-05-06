import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeliveries } from "@/services/deliveries";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 8;

export function NotificationsPanel() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useDeliveries({ pageSize: PAGE_SIZE, page });
  const deliveries = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const navigate = useNavigate();

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
      case "broadcasted": return `Enviado para motoboys`;
      case "accepted": return `Pedido aceito`;
      case "in_transit": return `Em rota`;
      case "delivered": return `Entrega finalizada`;
      case "cancelled": return `Cancelada`;
      default: return d.status;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-tight">Atividade</h3>
            <p className="text-[11px] text-muted-foreground">{totalCount} registros</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/20 min-h-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="w-3/4 h-3 rounded" />
                  <Skeleton className="w-1/2 h-2.5 rounded" />
                </div>
                <Skeleton className="w-10 h-3 rounded" />
              </div>
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-center py-8">
            <Bell className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-medium text-muted-foreground">Sem atividade</p>
          </div>
        ) : (
          deliveries.map((d) => (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/admin/deliveries")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/admin/deliveries"); } }}
              className={cn(
                "flex items-center gap-3 cursor-pointer group transition-all",
                "hover:bg-muted/30 active:scale-[0.99]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                "px-4 py-3",
              )}
            >
              <span className="text-base shrink-0">{getIcon(d.status)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {getTitle(d)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground truncate">{d.customer_name || "—"}</span>
                  <span className="text-[10px] font-bold text-success tabular-nums">R$ {Number(d.value ?? 0).toFixed(2)}</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {d.updated_at ? format(new Date(d.updated_at), "HH:mm") : "—"}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="border-t border-border/30 px-3 py-2 flex items-center justify-between bg-muted/5 shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all",
              page === 0 ? "text-muted-foreground/40" : "text-foreground hover:bg-muted"
            )}
          >
            <ChevronLeft className="h-3 w-3" /> Anterior
          </button>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all",
              page + 1 >= totalPages ? "text-muted-foreground/40" : "text-foreground hover:bg-muted"
            )}
          >
            Próxima <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
