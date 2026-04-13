import { AdminLayout } from "@/components/admin/AdminLayout";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { useDeliveryStats, useDeliveries } from "@/services/deliveries";
import { useOnlineDrivers, useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import React, { useState, useMemo } from "react";
import { useCity } from "@/contexts/CityContext";
import { useRegions } from "@/services/regions";
import { HeroMapSection } from "@/components/shared/HeroMapSection";
import { cn } from "@/lib/utils";
import {
  Package, Bike, Building2, DollarSign, TrendingUp, Clock, CheckCircle, MapPin, Navigation, ArrowUpRight, Calendar
} from "lucide-react";
import { useRealtimeDeliveries } from "@/hooks/useRealtimeDeliveries";
import { DashboardExport } from "@/components/admin/DashboardExport";

type Period = "today" | "7d" | "30d";

function getDateFrom(period: Period): string {
  const d = new Date();
  if (period === "today") d.setHours(0, 0, 0, 0);
  else if (period === "7d") d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
}

const PERIOD_LABELS: Record<Period, string> = { today: "Hoje", "7d": "7 dias", "30d": "30 dias" };

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const dateFrom = useMemo(() => getDateFrom(period), [period]);
  useRealtimeDeliveries();

  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers } = useOnlineDrivers();
  const { data: allDrivers } = useDrivers();
  const { data: companies } = useCompanies();
  const { data: allDeliveries } = useDeliveries({ dateFrom, pageSize: 500 });
  const { data: inTransitData } = useDeliveries({ status: "in_transit" });

  const { selectedCity, setCity } = useCity();
  const { data: regions } = useRegions(selectedCity || undefined);

  const inTransitCount = inTransitData?.count ?? 0;
  const totalCompanies = companies?.length ?? 0;
  const onlineCount = onlineDrivers?.length ?? 0;
  const cities = Array.from(new Set(regions?.map(r => r.city) || [])).sort();

  const periodDeliveries = allDeliveries?.data ?? [];
  const periodDelivered = periodDeliveries.filter(d => d.status === "delivered").length;
  const periodRevenue = periodDeliveries
    .filter(d => d.status === "delivered")
    .reduce((sum, d) => sum + Number(d.value ?? 0), 0);

  return (
    <AdminLayout title="Dashboard">
      {/* Period Filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
          <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
            {(["today", "7d", "30d"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  period === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {periodDeliveries.length} entregas · R$ {periodRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <DashboardExport deliveries={periodDeliveries} period={PERIOD_LABELS[period]} />
        </div>
      </div>

      {/* Hero Map */}
      <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm">
        <HeroMapSection />
      </div>

      <div className="mt-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard icon={<Clock className="h-5 w-5" />} label="Em Trânsito" value={inTransitCount} sub={`Hoje: ${stats?.today ?? 0}`} color="primary" pulse />
          <KPICard icon={<Bike className="h-5 w-5" />} label="Frota Online" value={onlineCount} sub="Prontos para entrega" color="success" />
          <KPICard icon={<DollarSign className="h-5 w-5" />} label="Faturamento" value={`R$ ${periodRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} sub={PERIOD_LABELS[period]} color="info" />
          <KPICard icon={<Package className="h-5 w-5" />} label="Volume Total" value={periodDeliveries.length} sub={`${periodDelivered} entregues`} color="accent" />
        </div>

        {/* Charts */}
        <DashboardCharts deliveries={periodDeliveries} drivers={allDrivers} period={period} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1"><MotoboysSidebar /></div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><MapPin className="h-4 w-4" /></div>
                  <h3 className="text-sm font-bold text-foreground">Cidades Ativas</h3>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">{cities.length}</span>
              </div>
              <div className="p-3 space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
                {cities.map(city => {
                  const cityRegions = regions?.filter(r => r.city === city) || [];
                  const isActive = selectedCity === city;
                  return (
                    <button key={city} onClick={() => setCity(city)} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left", isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/50")}>
                      <div className="flex items-center gap-3">
                        <Navigation className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-semibold", isActive ? "text-primary-foreground" : "text-foreground")}>{city}</span>
                      </div>
                      <span className={cn("text-xs font-medium", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{cityRegions.length} regiões</span>
                    </button>
                  );
                })}
                {cities.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhuma cidade encontrada</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <QuickStat icon={<CheckCircle className="h-4 w-4 text-success" />} label="Entregues" value={periodDelivered} />
              <QuickStat icon={<Building2 className="h-4 w-4 text-primary" />} label="Empresas" value={totalCompanies} />
              <QuickStat icon={<TrendingUp className="h-4 w-4 text-accent-foreground" />} label="Taxa" value={`${periodDeliveries.length ? Math.round((periodDelivered / periodDeliveries.length) * 100) : 0}%`} />
            </div>
          </div>

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

function KPICard({ icon, label, value, sub, color, pulse }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color: "primary" | "success" | "info" | "accent"; pulse?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary/10 text-primary", success: "bg-success/10 text-success",
    info: "bg-info/10 text-info", accent: "bg-accent text-accent-foreground",
  };
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", styles[color], pulse && "animate-pulse")}>{icon}</div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-3.5 text-center shadow-sm">
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-2">{icon}</div>
      <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}
