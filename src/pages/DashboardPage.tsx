import { AdminLayout } from "@/components/admin/AdminLayout";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { useDeliveryStats, useDeliveries } from "@/services/deliveries";
import { useOnlineDrivers, useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useCity } from "@/contexts/CityContext";
import { useRegions } from "@/services/regions";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Package, Bike, Building2, DollarSign, TrendingUp, Clock, CheckCircle, MapPin, Navigation,
  ArrowUpRight, Calendar, RefreshCw, AlertTriangle, Receipt, Timer, XCircle, Truck,
  PackageCheck, Map as MapIcon, Radio, WifiOff
} from "lucide-react";
import { useRealtimeDeliveries } from "@/hooks/useRealtimeDeliveries";
import { DashboardExport } from "@/components/admin/DashboardExport";
import { GenerateInviteDialog } from "@/components/admin/GenerateInviteDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Period = "today" | "7d" | "30d";
type AutoRefreshOption = 0 | 15 | 30 | 60;
const AUTO_REFRESH_OPTIONS: { value: AutoRefreshOption; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
];

type EndpointKey = "deliveries" | "stats" | "drivers";
type SyncMap = Record<EndpointKey, Date>;

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
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshOption>(() => {
    try {
      const v = Number(localStorage.getItem("epj_dashboard_autorefresh") ?? "30");
      return ([0, 15, 30, 60].includes(v) ? v : 30) as AutoRefreshOption;
    } catch { return 30; }
  });
  const initialNow = new Date();
  const [syncMap, setSyncMap] = useState<SyncMap>({
    deliveries: initialNow, stats: initialNow, drivers: initialNow,
  });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const dateFrom = useMemo(() => getDateFrom(period), [period]);
  useRealtimeDeliveries();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const intervalRef = useRef<number | null>(null);

  // Period-scoped invalidation: only refresh queries actually affected by current dateFrom
  const refreshScopedQueries = React.useCallback(async (opts?: { full?: boolean }) => {
    try {
      const ts = new Date();
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey;
            if (!Array.isArray(k) || k[0] !== "deliveries") return false;
            // full=true → all delivery queries; otherwise restrict to active period
            return opts?.full ? true : (k as unknown[]).includes(dateFrom);
          },
        }),
        queryClient.invalidateQueries({ queryKey: ["delivery-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["online-drivers"] }),
      ]);
      setSyncMap({ deliveries: ts, stats: ts, drivers: ts });
      setLiveError(null);
    } catch (e: any) {
      setLiveError(e?.message ?? "Falha ao sincronizar");
    }
  }, [queryClient, dateFrom]);

  // Auto-refresh effect (period-scoped + offline-aware)
  useEffect(() => {
    try { localStorage.setItem("epj_dashboard_autorefresh", String(autoRefresh)); } catch {}
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoRefresh > 0 && isOnline) {
      intervalRef.current = window.setInterval(() => {
        refreshScopedQueries();
      }, autoRefresh * 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [autoRefresh, isOnline, refreshScopedQueries]);

  // Online/offline awareness with auto-reconnect
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLiveError(null);
      toast.success("Conexão restabelecida — sincronizando...");
      refreshScopedQueries({ full: true });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLiveError("Sem conexão com a internet");
      toast.error("Você está offline. Atualizações em tempo real pausadas.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshScopedQueries]);

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

  const metrics = useMemo(() => {
    const total = periodDeliveries.length;
    const delivered = periodDeliveries.filter(d => d.status === "delivered").length;
    const pending = periodDeliveries.filter(d => d.status === "pending" || d.status === "broadcasted").length;
    const accepted = periodDeliveries.filter(d => d.status === "accepted").length;
    const collecting = periodDeliveries.filter(d => d.status === "collecting").length;
    const cancelled = periodDeliveries.filter(d => d.status === "cancelled").length;
    const revenue = periodDeliveries
      .filter(d => d.status === "delivered")
      .reduce((sum, d) => sum + Number(d.value ?? 0), 0);
    const avgTicket = delivered > 0 ? revenue / delivered : 0;
    const cancelRate = total > 0 ? (cancelled / total) * 100 : 0;
    const conversionRate = total > 0 ? (delivered / total) * 100 : 0;

    const deliveredWithTimes = periodDeliveries.filter(
      (d: any) => d.status === "delivered" && d.delivered_at && d.accepted_at
    );
    const avgDeliveryMin = deliveredWithTimes.length
      ? deliveredWithTimes.reduce((sum: number, d: any) => {
          const diff = (new Date(d.delivered_at).getTime() - new Date(d.accepted_at).getTime()) / 60000;
          return sum + diff;
        }, 0) / deliveredWithTimes.length
      : 0;

    const now = Date.now();
    const criticalAlerts = periodDeliveries.filter((d: any) => {
      if (d.status !== "pending" && d.status !== "broadcasted") return false;
      if (d.driver_id) return false;
      const created = new Date(d.created_at).getTime();
      return (now - created) / 60000 > 30;
    });

    return {
      total, delivered, pending, accepted, collecting, cancelled,
      revenue, avgTicket, cancelRate, conversionRate, avgDeliveryMin, criticalAlerts,
    };
  }, [periodDeliveries]);

  const handleRefresh = async () => {
    if (!isOnline) {
      toast.error("Sem conexão. Verifique sua rede.");
      return;
    }
    setRefreshing(true);
    await refreshScopedQueries({ full: true });
    setTimeout(() => setRefreshing(false), 600);
    toast.success("Dados atualizados");
  };

  const formatLastSync = (d: Date) => {
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 5) return "agora";
    if (diff < 60) return `${diff}s atrás`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}min atrás`;
    const h = Math.floor(m / 60);
    return `${h}h atrás`;
  };

  // Tick to keep relative timestamps fresh without polling data
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 15000);
    return () => window.clearInterval(t);
  }, []);

  const liveActive = autoRefresh > 0 && isOnline;

  return (
    <AdminLayout title="Dashboard">
      {/* Header: Filters + Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
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
          <p className="text-xs text-muted-foreground hidden md:block ml-2">
            {periodDeliveries.length} entregas · R$ {metrics.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Indicador Live + última sincronização */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/50">
            <span className="relative flex h-2 w-2">
              {autoRefresh > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              )}
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                autoRefresh > 0 ? "bg-success" : "bg-muted-foreground/40"
              )}></span>
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {autoRefresh > 0 ? "Live" : "Pausado"}
            </span>
            <span className="text-[10px] text-muted-foreground/70">· {formatLastSync(lastSync)}</span>
          </div>

          {/* Auto-refresh selector */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <Radio className="h-3 w-3 text-muted-foreground ml-1.5" />
            {AUTO_REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAutoRefresh(opt.value)}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                  autoRefresh === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={`Atualizar a cada ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Atualizar
          </Button>
          <GenerateInviteDialog fixedRole="driver" triggerLabel="Convidar Entregador" />
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/regions")} className="gap-1.5">
            <MapIcon className="h-3.5 w-3.5" />
            Ver Mapa
          </Button>
          <DashboardExport deliveries={periodDeliveries} period={PERIOD_LABELS[period]} />
        </div>
      </div>

      {/* Critical Alerts */}
      {metrics.criticalAlerts.length > 0 && (
        <div className="mb-4 bg-destructive/5 border border-destructive/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {metrics.criticalAlerts.length} entrega{metrics.criticalAlerts.length > 1 ? "s" : ""} pendente{metrics.criticalAlerts.length > 1 ? "s" : ""} há mais de 30 min
            </p>
            <p className="text-xs text-muted-foreground">Sem motoboy alocado. Ação urgente recomendada.</p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => navigate("/admin/deliveries")}>
            Resolver
          </Button>
        </div>
      )}

      <div className="space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard icon={<Clock className="h-5 w-5" />} label="Em Trânsito" value={inTransitCount} sub={`Hoje: ${stats?.today ?? 0}`} color="primary" pulse />
          <KPICard icon={<Bike className="h-5 w-5" />} label="Frota Online" value={onlineCount} sub="Prontos para entrega" color="success" />
          <KPICard icon={<DollarSign className="h-5 w-5" />} label="Faturamento" value={`R$ ${metrics.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} sub={PERIOD_LABELS[period]} color="info" />
          <KPICard icon={<Package className="h-5 w-5" />} label="Volume Total" value={metrics.total} sub={`${metrics.delivered} entregues`} color="accent" />
        </div>

        {/* Quick Stats - Operational Status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickStat icon={<Clock className="h-4 w-4 text-warning" />} label="Pendentes" value={metrics.pending} />
          <QuickStat icon={<CheckCircle className="h-4 w-4 text-info" />} label="Aceitos" value={metrics.accepted} />
          <QuickStat icon={<Truck className="h-4 w-4 text-primary" />} label="Coletando" value={metrics.collecting} />
          <QuickStat icon={<PackageCheck className="h-4 w-4 text-success" />} label="Entregues" value={metrics.delivered} />
          <QuickStat icon={<XCircle className="h-4 w-4 text-destructive" />} label="Cancelados" value={metrics.cancelled} />
          <QuickStat icon={<Receipt className="h-4 w-4 text-accent-foreground" />} label="Ticket Médio" value={`R$ ${metrics.avgTicket.toFixed(2)}`} />
        </div>

        {/* Operational Row - Business KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickStat icon={<Building2 className="h-4 w-4 text-primary" />} label="Empresas Ativas" value={totalCompanies} />
          <QuickStat icon={<MapPin className="h-4 w-4 text-info" />} label="Cidades Ativas" value={cities.length} />
          <QuickStat icon={<TrendingUp className="h-4 w-4 text-success" />} label="Taxa Conversão" value={`${metrics.conversionRate.toFixed(0)}%`} />
          <QuickStat icon={<Timer className="h-4 w-4 text-accent-foreground" />} label="Tempo Médio" value={metrics.avgDeliveryMin > 0 ? `${metrics.avgDeliveryMin.toFixed(0)} min` : "—"} />
        </div>

        {/* Charts */}
        <DashboardCharts deliveries={periodDeliveries} drivers={allDrivers} period={period} />

        {/* Operational Monitoring - 2 main columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Frota e Cidades empilhados na primeira coluna */}
          <div className="lg:col-span-1 space-y-4">
            <MotoboysSidebar />
            {cities.length > 0 && (
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><MapPin className="h-3.5 w-3.5" /></div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Cidades</h3>
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{cities.length}</span>
                </div>
                <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                  {cities.map(city => {
                    const cityRegions = regions?.filter(r => r.city === city) || [];
                    const isActive = selectedCity === city;
                    return (
                      <button key={city} onClick={() => setCity(city)} className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left", isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/50")}>
                        <div className="flex items-center gap-2">
                          <Navigation className={cn("h-3.5 w-3.5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                          <span className={cn("text-xs font-semibold", isActive ? "text-primary-foreground" : "text-foreground")}>{city}</span>
                        </div>
                        <span className={cn("text-[10px] font-medium", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{cityRegions.length} reg.</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Top Empresas */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-info/10 flex items-center justify-center text-info"><Building2 className="h-4 w-4" /></div>
                  <h3 className="text-sm font-bold text-foreground">Top Empresas</h3>
                </div>
                <button onClick={() => navigate("/admin/companies")} className="text-[10px] font-bold text-info bg-info/10 px-2.5 py-1 rounded-full uppercase tracking-wider hover:bg-info/20 transition-colors">
                  Gerenciar
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[420px]">
                {(() => {
                  const counts = new Map<string, { name: string; count: number; revenue: number }>();
                  periodDeliveries.forEach((d: any) => {
                    const id = d.company_id;
                    const name = d.companies?.name || "—";
                    if (!id) return;
                    const cur = counts.get(id) || { name, count: 0, revenue: 0 };
                    cur.count += 1;
                    if (d.status === "delivered") cur.revenue += Number(d.value ?? 0);
                    counts.set(id, cur);
                  });
                  const top = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 8);
                  if (top.length === 0) {
                    return <p className="text-center text-sm text-muted-foreground py-10">Sem dados no período</p>;
                  }
                  return (
                    <div className="divide-y divide-border/20">
                      {top.map((c, i) => (
                        <div key={c.name + i} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-foreground shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-foreground">{c.count}</p>
                            <p className="text-[10px] font-medium text-success">R$ {c.revenue.toFixed(0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Atividade Recente */}
          <div className="lg:col-span-1">
            <div className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm h-full">
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
