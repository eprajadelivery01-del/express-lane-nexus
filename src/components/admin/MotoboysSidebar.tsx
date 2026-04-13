import { useState } from "react";
import { Search, ChevronDown, ChevronUp, Bike, Building2, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";

export function MotoboysSidebar() {
  const [search, setSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [showOnline, setShowOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(true);
  const navigate = useNavigate();

  const { data: drivers } = useDrivers();
  const { data: companies } = useCompanies();

  const allDrivers = drivers ?? [];
  const online = allDrivers.filter((d) => d.is_online);
  const offline = allDrivers.filter((d) => !d.is_online);

  const filterBySearch = (name: string, query: string) => !query || name.toLowerCase().includes(query.toLowerCase());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
      {/* CARD 1: MOTOBOYS */}
      <div className="rounded-[2rem] bg-card shadow-xl shadow-black/5 flex flex-col overflow-hidden border border-border/60">
        <div className="p-5 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground tracking-tight">Status da Frota</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Monitoramento</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-3 bg-muted/50 border border-border/40 rounded-2xl px-4 py-2.5 transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none w-full placeholder:text-muted-foreground/60"
              placeholder="Buscar motoboy..."
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[350px] scrollbar-thin">
          <div className="px-2">
            <button 
              onClick={() => setShowOnline(!showOnline)} 
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] hover:bg-muted/50 rounded-xl transition-colors mb-1"
            >
              <span>Online • {online.length}</span>
              {showOnline ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showOnline && online.filter((d) => filterBySearch(d.profiles?.full_name || "", search)).map((driver) => (
              <div 
                key={driver.id} 
                className="group flex items-center justify-between px-3 py-2.5 hover:bg-primary/5 rounded-2xl transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1" onClick={() => navigate("/admin/drivers")}>
                  <div className="h-10 w-10 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-sm overflow-hidden group-hover:scale-110 transition-transform">
                    {driver.profiles?.avatar_url ? (
                      <img src={driver.profiles?.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🏍️"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground truncate tracking-tight group-hover:text-primary transition-colors">{driver.profiles?.full_name || "—"}</p>
                    <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">{driver.vehicle_type || "motorcycle"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/chat?userId=${driver.user_id}`); }}
                    className="p-2 rounded-xl bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
                  >
                    <MessageSquare size={14} />
                  </button>
                  <span className="flex h-2 w-2 rounded-full bg-success ring-4 ring-success/10" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 px-2">
            <button 
              onClick={() => setShowOffline(!showOffline)} 
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] hover:bg-muted/50 rounded-xl transition-colors mb-1"
            >
              <span>Offline • {offline.length}</span>
              {showOffline ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showOffline && offline.filter((d) => filterBySearch(d.profiles?.full_name || "", search)).map((driver) => (
              <div 
                key={driver.id} 
                className="group flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 rounded-2xl transition-all opacity-60 cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1" onClick={() => navigate("/admin/drivers")}>
                  <div className="h-10 w-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-sm overflow-hidden grayscale">
                    {driver.profiles?.avatar_url ? (
                      <img src={driver.profiles?.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🏍️"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground/70 truncate tracking-tight">{driver.profiles?.full_name || "—"}</p>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">{driver.vehicle_type || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/chat?userId=${driver.user_id}`); }}
                    className="p-2 rounded-xl bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MessageSquare size={14} />
                  </button>
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CARD 2: LOCAIS ATIVOS */}
      <div className="rounded-[2rem] bg-card shadow-xl shadow-black/5 flex flex-col overflow-hidden border border-border/60">
        <div className="p-5 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground tracking-tight">Locais Ativos</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Parceiros</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-border/10">
          <div className="flex items-center gap-3 bg-muted/50 border border-border/40 rounded-2xl px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-accent/20">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none w-full placeholder:text-muted-foreground/60"
              placeholder="Buscar lojista..."
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin px-2 py-2">
          {companies?.filter(c => c.is_active && filterBySearch(c.name, companySearch)).length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Nenhum parceiro encontrado...</p>
            </div>
          ) : (
            (companies ?? []).filter(c => c.is_active && filterBySearch(c.name, companySearch)).map((company) => (
              <div 
                key={company.id} 
                className="flex items-center justify-between px-3 py-3 hover:bg-accent/5 rounded-2xl transition-all group cursor-pointer border-b border-border/20 last:border-0"
              >
                <div className="flex items-center gap-4 flex-1" onClick={() => navigate("/admin/companies")}>
                  <div className="h-10 w-10 rounded-2xl bg-accent/5 flex items-center justify-center text-xl transition-transform group-hover:rotate-12 border border-accent/20 overflow-hidden shadow-sm">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🏪"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground truncate tracking-tight group-hover:text-accent transition-colors">{company.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground truncate uppercase tracking-[0.05em]">{company.address || company.phone || "—"}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/chat?userId=${company.user_id}`); }}
                  className="p-2 rounded-xl bg-accent/10 text-accent opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/20"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
