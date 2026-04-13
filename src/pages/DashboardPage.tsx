import { AdminLayout } from "@/components/admin/AdminLayout";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { useDeliveryStats, useDeliveries } from "@/services/deliveries";
import { useOnlineDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import React from "react";
import { useCity } from "@/contexts/CityContext";
import { useRegions } from "@/services/regions";
import { HeroMapSection } from "@/components/shared/HeroMapSection";
import { cn } from "@/lib/utils";
import {
  Package, Bike, Building2, DollarSign, TrendingUp, Clock, CheckCircle, MapPin, Navigation, ArrowUpRight
} from "lucide-react";

export default function DashboardPage() {
  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers } = useOnlineDrivers();
  const { data: companies } = useCompanies();
  const { data: inTransitData } = useDeliveries({ status: "in_transit" });
  const { data: deliveredData } = useDeliveries({ status: "delivered" });

  const { selectedCity, setCity } = useCity();
  const { data: regions } = useRegions(selectedCity || undefined);

  const inTransitCount = inTransitData?.count ?? 0;
  const deliveredCount = deliveredData?.count ?? 0;
  const totalCompanies = companies?.length ?? 0;
  const onlineCount = onlineDrivers?.length ?? 0;
  const cities = Array.from(new Set(regions?.map(r => r.city) || [])).sort();

  return (
    <AdminLayout title="Dashboard">
      {/* Hero Map - compact */}
      <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm">
        <HeroMapSection />
      </div>

      <div className="mt-6 space-y-6">
        {/* ROW 1: KPI Cards - clean horizontal strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            icon={<Clock className="h-5 w-5" />}
            label="Em Trânsito"
            value={inTransitCount}
            sub={stats?.today ? `${stats.today} hoje` : "—"}
            color="primary"
            pulse
          />
          <KPICard
            icon={<Bike className="h-5 w-5" />}
            label="Frota Online"
            value={onlineCount}
            sub="Disponíveis"
            color="success"
          />
          <KPICard
            icon={<DollarSign className="h-5 w-5" />}
            label="Faturamento"
            value={`R$ ${(stats?.todayRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            sub="Receita do dia"
            color="info"
          />
          <KPICard
            icon={<Package className="h-5 w-5" />}
            label="Total Entregas"
            value={stats?.total ?? 0}
            sub={`${deliveredCount} concluídas`}
            color="accent"
          />
        </div>

        {/* ROW 2: Main content - 3 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Col 1: Fleet Status */}
          <div className="lg:col-span-1">
            <MotoboysSidebar />
          </div>

          {/* Col 2: Cities + Quick Stats */}
          <div className="lg:col-span-1 space-y-4">
            {/* Cities Card */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Cidades Ativas</h3>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {cities.length}
                </span>
              </div>

              <div className="p-3 space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
                {cities.map(city => {
                  const cityRegions = regions?.filter(r => r.city === city) || [];
                  const isActive = selectedCity === city;
                  return (
                    <button
                      key={city}
                      onClick={() => setCity(city)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Navigation className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-semibold", isActive ? "text-primary-foreground" : "text-foreground")}>{city}</span>
                      </div>
                      <span className={cn("text-xs font-medium", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {cityRegions.length} regiões
                      </span>
                    </button>
                  );
                })}
                {cities.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">Nenhuma cidade encontrada</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <QuickStat icon={<CheckCircle className="h-4 w-4 text-success" />} label="Entregues" value={deliveredCount} />
              <QuickStat icon={<Building2 className="h-4 w-4 text-primary" />} label="Empresas" value={totalCompanies} />
              <QuickStat icon={<TrendingUp className="h-4 w-4 text-accent-foreground" />} label="Taxa" value={`${stats?.total ? Math.round((deliveredCount / stats.total) * 100) : 0}%`} />
            </div>
          </div>

          {/* Col 3: Activity Feed */}
          <div className="lg:col-span-1 h-full">
            <div className="h-full min-h-[400px] lg:min-h-0 border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
              <NotificationsPanel />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ── Compact KPI Card ── */
function KPICard({ icon, label, value, sub, color, pulse }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: "primary" | "success" | "info" | "accent";
  pulse?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    accent: "bg-accent text-accent-foreground",
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", styles[color], pulse && "animate-pulse")}>
          {icon}
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Quick Stat Mini Card ── */
function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-3.5 text-center shadow-sm">
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-2">
        {icon}
      </div>
      <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}
