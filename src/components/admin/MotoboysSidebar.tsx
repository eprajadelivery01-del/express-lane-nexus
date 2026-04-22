import { useState } from "react";
import { Search, Bike, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDrivers } from "@/services/drivers";
import { cn } from "@/lib/utils";

export function MotoboysSidebar() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"online" | "offline">("online");
  const navigate = useNavigate();

  const { data: drivers } = useDrivers();

  const allDrivers = drivers ?? [];
  const online = allDrivers.filter((d) => d.is_online);
  const offline = allDrivers.filter((d) => !d.is_online);

  const filterBySearch = (name: string, query: string) =>
    !query || name.toLowerCase().includes(query.toLowerCase());

  const list = (tab === "online" ? online : offline).filter((d) =>
    filterBySearch(d.profiles?.full_name || "", search)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header unificado (mesmo padrão das outras seções) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bike className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight truncate">Status da Frota</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {online.length} online · {offline.length} offline
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Online / Offline */}
      <div className="px-3 pt-3 shrink-0">
        <div className="flex bg-muted/40 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setTab("online")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all",
              tab === "online"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Online
            <span className={cn(
              "ml-1 px-1.5 rounded-full text-[9px]",
              tab === "online" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            )}>
              {online.length}
            </span>
          </button>
          <button
            onClick={() => setTab("offline")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all",
              tab === "offline"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            Offline
            <span className={cn(
              "ml-1 px-1.5 rounded-full text-[9px]",
              tab === "offline" ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
            )}>
              {offline.length}
            </span>
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="px-3 pt-2 pb-2 shrink-0">
        <div className="flex items-center gap-2 bg-muted/40 border border-border/30 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs font-medium outline-none w-full placeholder:text-muted-foreground/60"
            placeholder="Buscar motoboy..."
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 min-h-0">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mb-3 border border-dashed border-border/60">
              <Bike className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {tab === "online" ? "Nenhum motoboy online" : "Nenhum motoboy offline"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((driver) => {
              const isOnline = driver.is_online;
              return (
                <div
                  key={driver.id}
                  className={cn(
                    "group flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors cursor-pointer",
                    isOnline ? "hover:bg-primary/5" : "hover:bg-muted/40 opacity-70"
                  )}
                  onClick={() => navigate("/admin/drivers")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center text-sm overflow-hidden border",
                        isOnline ? "bg-success/5 border-success/20" : "bg-muted border-border grayscale"
                      )}>
                        {driver.profiles?.avatar_url ? (
                          <img src={driver.profiles?.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          "🏍️"
                        )}
                      </div>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                          isOnline ? "bg-success" : "bg-muted-foreground/40"
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        "text-xs font-bold truncate",
                        isOnline ? "text-foreground group-hover:text-primary transition-colors" : "text-foreground/70"
                      )}>
                        {driver.profiles?.full_name || "—"}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wide">
                        {driver.vehicle_type || "motorcycle"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/chat?userId=${driver.user_id}`);
                    }}
                    className="p-1.5 rounded-lg bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
                    title="Conversar"
                  >
                    <MessageSquare size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
