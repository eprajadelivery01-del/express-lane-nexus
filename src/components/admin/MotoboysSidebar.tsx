import { useState } from "react";
import { Search, Bike, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDrivers } from "@/services/drivers";
import { cn } from "@/lib/utils";
import { SectionHeader, EmptyState, StatusBadge } from "./SectionHeader";

interface MotoboysSidebarProps {
  compact?: boolean;
}

export function MotoboysSidebar({ compact = false }: MotoboysSidebarProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"online" | "offline">("online");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
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
      <SectionHeader
        icon={<Bike className="h-4 w-4" />}
        tone="primary"
        compact={compact}
        title="Status da Frota"
        subtitle="Monitoramento em tempo real"
        rightSlot={
          <div className="hidden sm:flex items-center gap-1">
            <StatusBadge variant="online" label="On" value={online.length} title="Motoboys online" />
            <StatusBadge variant="offline" label="Off" value={offline.length} title="Motoboys offline" />
          </div>
        }
      />

      {/* Tabs Online / Offline */}
      <div className={cn("shrink-0", compact ? "px-2.5 pt-2" : "px-3 pt-3")}>
        <div className="flex bg-muted/40 rounded-lg p-0.5 gap-0.5" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "online"}
            onClick={() => setTab("online")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]",
              tab === "online"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Online
            <span className={cn(
              "ml-1 px-1.5 rounded-full text-[9px] tabular-nums",
              tab === "online" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            )}>
              {online.length}
            </span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "offline"}
            onClick={() => setTab("offline")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]",
              tab === "offline"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            Offline
            <span className={cn(
              "ml-1 px-1.5 rounded-full text-[9px] tabular-nums bg-muted text-muted-foreground",
            )}>
              {offline.length}
            </span>
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className={cn("shrink-0", compact ? "px-2.5 pt-2 pb-1.5" : "px-3 pt-2 pb-2")}>
        <div className="flex items-center gap-2 bg-muted/40 border border-border/30 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs font-medium outline-none w-full placeholder:text-muted-foreground/60"
            placeholder="Buscar motoboy..."
            aria-label="Buscar motoboy"
          />
        </div>
      </div>

      {/* Lista */}
      <div className={cn("flex-1 overflow-y-auto scrollbar-thin min-h-0", compact ? "px-1.5 pb-1.5" : "px-2 pb-2")}>
        {list.length === 0 ? (
          <EmptyState
            icon={<Bike className="h-6 w-6" />}
            title={tab === "online" ? "Nenhum motoboy online" : "Nenhum motoboy offline"}
            subtitle={
              search
                ? "Nenhum resultado para a sua busca."
                : tab === "online"
                  ? "Aguardando entregadores ficarem online."
                  : "Toda a frota está disponível."
            }
          />
        ) : (
          <ul className="space-y-1" role="list">
            {list.map((driver) => {
              const isOnline = driver.is_online;
              const isSelected = selectedDriverId === driver.id;
              return (
                <li key={driver.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedDriverId(driver.id);
                      navigate("/admin/drivers");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDriverId(driver.id);
                        navigate("/admin/drivers");
                      }
                    }}
                    className={cn(
                      "group relative flex items-center justify-between gap-2 rounded-xl cursor-pointer border transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]",
                      compact ? "px-2 py-1.5" : "px-2.5 py-2",
                      isSelected
                        ? "bg-primary/5 border-primary/30 shadow-sm"
                        : isOnline
                          ? "border-transparent hover:bg-primary/5 hover:border-primary/20 hover:-translate-y-px hover:shadow-sm"
                          : "border-transparent hover:bg-muted/40 opacity-75 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className={cn(
                          "rounded-xl flex items-center justify-center text-sm overflow-hidden border",
                          compact ? "h-8 w-8" : "h-9 w-9",
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
                          aria-label={isOnline ? "Online" : "Offline"}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-xs font-bold truncate tracking-tight transition-colors",
                          isSelected
                            ? "text-primary"
                            : isOnline
                              ? "text-foreground group-hover:text-primary"
                              : "text-foreground/70"
                        )}>
                          {driver.profiles?.full_name || "—"}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider">
                          {driver.vehicle_type || "motorcycle"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/chat?userId=${driver.user_id}`);
                      }}
                      className={cn(
                        "p-1.5 rounded-lg bg-primary/10 text-primary transition-all shrink-0",
                        "hover:bg-primary/20 active:scale-95",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        // Sempre visível em compact (alvo de toque), hover-only em normal
                        compact ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                      )}
                      title="Conversar com motoboy"
                      aria-label="Conversar"
                    >
                      <MessageSquare size={13} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
