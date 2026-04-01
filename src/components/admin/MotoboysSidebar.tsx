import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";

export function MotoboysSidebar() {
  const [search, setSearch] = useState("");
  const [showOnline, setShowOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(true);
  const [showLocais, setShowLocais] = useState(true);

  const { data: drivers } = useDrivers();
  const { data: companies } = useCompanies();

  const allDrivers = drivers ?? [];
  const online = allDrivers.filter((d) => d.is_online);
  const offline = allDrivers.filter((d) => !d.is_online);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-primary">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-sm">👤</span>
          </div>
          <h2 className="font-display font-bold text-primary-foreground text-sm">Motoboys e Locais</h2>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Online */}
        <div>
          <button
            onClick={() => setShowOnline(!showOnline)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
          >
            Motoboys Online ({online.length})
            {showOnline ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showOnline &&
            online
              .filter((d) => !search || (d.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()))
              .map((driver) => (
                <div key={driver.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {driver.profiles?.avatar_url ? (
                        <img src={driver.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">🏍️</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{driver.profiles?.full_name || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{driver.vehicle}</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                </div>
              ))}
        </div>

        {/* Offline */}
        <div>
          <button
            onClick={() => setShowOffline(!showOffline)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
          >
            Motoboys Offline ({offline.length})
            {showOffline ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showOffline &&
            offline
              .filter((d) => !search || (d.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()))
              .map((driver) => (
                <div key={driver.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {driver.profiles?.avatar_url ? (
                        <img src={driver.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">🏍️</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{driver.profiles?.full_name || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{driver.vehicle}</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                </div>
              ))}
        </div>

        {/* Locais */}
        <div>
          <button
            onClick={() => setShowLocais(!showLocais)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
          >
            Locais Ativos ({companies?.length ?? 0})
            {showLocais ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showLocais &&
            (companies ?? [])
              .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
              .map((company) => (
                <div key={company.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">🏪</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{company.name}</p>
                    <p className="text-[11px] text-muted-foreground">{company.phone || "—"}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
