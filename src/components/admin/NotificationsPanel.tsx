import { Bell } from "lucide-react";
import { useDeliveries } from "@/services/deliveries";
import { format } from "date-fns";

export function NotificationsPanel() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data } = useDeliveries({ pageSize: 10 });
  const deliveries = data?.data ?? [];

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
    <div className="h-full flex flex-col bg-card overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="flex items-center justify-between p-6 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-warning/10 flex items-center justify-center text-warning">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground tracking-tight">Atividade Recente</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Notificações</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-background/50 rounded-full border border-border/40">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{deliveries.length} itens</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/20">
        {deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-[1.5rem] bg-muted/40 flex items-center justify-center mb-4 border border-dashed border-border/60">
              <Bell className="h-8 w-8 text-muted-foreground/20" />
            </div>
            <p className="text-sm font-black text-foreground tracking-tight">Silêncio no rádio</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-relaxed px-4">
              Nenhuma atividade importante detectada nas últimas horas.
            </p>
          </div>
        ) : (
          deliveries.map((d, idx) => (
            <div 
              key={d.id} 
              className="flex items-start gap-4 p-5 hover:bg-muted/30 transition-all cursor-pointer group hover:pl-6"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="w-10 h-10 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center shrink-0 text-xl transition-transform group-hover:scale-110 group-hover:rotate-6">
                {getIcon(d.status)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-black text-foreground tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {getTitle(d)}
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-md">
                    {d.updated_at ? format(new Date(d.updated_at), "HH:mm") : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tighter truncate">
                    {d.customer_name}
                  </p>
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <p className="text-[11px] font-black text-primary uppercase tracking-tight">
                    R$ {Number(d.value ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="mt-2 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                  {d.updated_at ? format(new Date(d.updated_at), "dd/MM/yyyy") : "—"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
