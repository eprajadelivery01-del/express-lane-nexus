import { useState } from "react";
import { 
  Clock, Package, MapPin, ChevronRight, MessageSquare, 
  CheckCircle2, AlertCircle, ShoppingBag, StickyNote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  options: any | null;
}

interface Order {
  id: string;
  customer_name?: string;
  delivery_address: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  order_items: OrderItem[];
}

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    pending: "border-yellow-500/20 bg-yellow-500/5",
    preparing: "border-primary/20 bg-primary/5",
    ready: "border-green-500/20 bg-green-500/5",
  };

  const statusIcons: Record<string, any> = {
    pending: Clock,
    preparing: Package,
    ready: CheckCircle2,
  };

  const Icon = statusIcons[order.status] || AlertCircle;

  // Helper to parse options
  const renderOptions = (options: any) => {
    if (!options) return null;
    let opts = options;
    if (typeof options === "string") {
      try { opts = JSON.parse(options); } catch { return null; }
    }
    if (!Array.isArray(opts) || opts.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {opts.map((opt: any, idx: number) => (
          <span key={idx} className="text-[10px] font-bold text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
            + {opt.name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "group relative flex flex-col border rounded-3xl transition-all duration-300 hover:shadow-xl",
        statusColors[order.status] || "border-border bg-card",
        isExpanded ? "shadow-2xl ring-2 ring-primary/20" : "shadow-sm"
      )}
    >
      {/* Header - Always visible */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
              order.status === 'pending' ? "bg-yellow-500/10 text-yellow-600" : 
              order.status === 'preparing' ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-600"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black text-foreground truncate uppercase tracking-tight">
                {order.customer_name || "Cliente"}
              </h4>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                #{order.id.slice(0, 8)} • {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-foreground">R$ {order.total.toFixed(2)}</p>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] font-black text-primary uppercase hover:underline"
            >
              {isExpanded ? "Recolher" : "Ver Itens"}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {order.status === "pending" && (
            <>
              <button 
                onClick={() => onStatusChange(order.id, "cancelled")}
                className="py-2.5 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase hover:bg-red-500/5 transition-colors"
              >
                Recusar
              </button>
              <button 
                onClick={() => onStatusChange(order.id, "preparing")}
                className="py-2.5 rounded-xl gradient-primary text-white text-[10px] font-black uppercase shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Aceitar
              </button>
            </>
          )}
          {order.status === "preparing" && (
            <button 
              onClick={() => onStatusChange(order.id, "ready")}
              className="col-span-2 py-2.5 rounded-xl gradient-primary text-white text-[10px] font-black uppercase shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Concluir Pedido
            </button>
          )}
          {order.status === "ready" && (
            <div className="col-span-2 py-2.5 rounded-xl bg-green-500/10 text-green-600 text-[10px] font-black uppercase text-center border border-green-500/20">
              Pronto / Aguardando Entrega
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="h-px bg-border/50 mx-2" />
          
          {/* Order Items */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Produtos</p>
            {order.order_items.map((item) => (
              <div key={item.id} className="bg-muted/30 rounded-2xl p-3 border border-border/50">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-black text-foreground">
                    {item.quantity}x {item.product_name}
                  </span>
                </div>
                
                {/* Options/Customization */}
                {renderOptions(item.options)}

                {/* Item Observation */}
                {item.notes && (
                  <div className="mt-2 flex items-start gap-1.5 p-2 bg-orange-500/5 rounded-lg border border-orange-500/10">
                    <MessageSquare className="h-3 w-3 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-orange-600 leading-tight">
                      OBS: {item.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Delivery Address */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Endereço de Entrega
            </p>
            <p className="text-xs font-bold text-foreground leading-relaxed pl-4">
              {order.delivery_address}
            </p>
          </div>

          {/* Global Order Note (Troco, etc) */}
          {order.notes && (
            <div className="bg-primary/5 rounded-2xl p-3 border border-primary/10">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Observação Geral
              </p>
              <p className="text-xs font-bold text-primary/80">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileText(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
