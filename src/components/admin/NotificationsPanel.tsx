import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeliveries } from "@/services/deliveries";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader, EmptyState, StatusBadge } from "./SectionHeader";

interface NotificationsPanelProps {
  compact?: boolean;
}

export function NotificationsPanel({ compact = false }: NotificationsPanelProps) {
  const PAGE_SIZE = compact ? 6 : 8;
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching } = useDeliveries({ pageSize: PAGE_SIZE, page });
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
      case "broadcasted": return `Pedido enviado para motoboys`;
      case "accepted": return `Pedido aceito`;
      case "in_transit": return `Entrega em rota`;
      case "delivered": return `Entrega finalizada`;
      case "cancelled": return `Entrega cancelada`;
      default: return `Atualização: ${d.status}`;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        icon={<Bell className="h-4 w-4" />}
        tone="warning"
        compact={compact}
        title="Atividade Recente"
        subtitle={`${totalCount} ${totalCount === 1 ? "registro" : "registros"} no total`}
        rightSlot={
          isFetching ? (
            <StatusBadge variant="online" label="Sync" title="Sincronizando..." className="animate-pulse" />
          ) : (
            <StatusBadge variant="count" value={totalCount} title="Total de registros" />
          )
        }
      />

      {/* Lista paginada */}
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/20 min-h-0">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Carregando...</div>
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="Sem atividade"
            subtitle="Nenhuma entrega registrada ainda."
          />
        ) : (
          deliveries.map((d) => (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/admin/deliveries")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/admin/deliveries");
                }
              }}
              className={cn(
                "flex items-start gap-3 cursor-pointer group border-l-2 border-transparent transition-all",
                "hover:bg-muted/30 hover:border-l-primary/40 hover:translate-x-px",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-muted/30",
                "active:scale-[0.99]",
                compact ? "p-2.5" : "p-3.5",
              )}
            >
              <div className={cn(
                "rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center shrink-0",
                compact ? "w-8 h-8 text-sm" : "w-9 h-9 text-base",
              )}>
                {getIcon(d.status)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                    {getTitle(d)}
                  </p>
                  <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap tabular-nums">
                    {d.updated_at ? format(new Date(d.updated_at), "HH:mm") : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-medium text-muted-foreground/80 truncate">
                    {d.customer_name || "—"}
                  </p>
                  <div className="w-0.5 h-0.5 rounded-full bg-border" />
                  <p className="text-[11px] font-bold text-success whitespace-nowrap tabular-nums">
                    R$ {Number(d.value ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer com paginação real */}
      {totalCount > 0 && (
        <div className="border-t border-border/30 px-3 py-2 flex items-center justify-between gap-2 bg-muted/10 shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold transition-all px-2 py-1 rounded-lg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95",
              page === 0
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-foreground hover:bg-muted"
            )}
          >
            <ChevronLeft className="h-3 w-3" /> Anterior
          </button>

          <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
            Página <strong className="text-foreground">{page + 1}</strong> de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold transition-all px-2 py-1 rounded-lg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95",
              page + 1 >= totalPages
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-foreground hover:bg-muted"
            )}
          >
            Próxima <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
