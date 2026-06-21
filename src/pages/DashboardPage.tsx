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
  Package, Bike, DollarSign,
  RefreshCw, AlertTriangle,
  Map as MapIcon, WifiOff, Truck, ChevronRight
} from "lucide-react";
import { useRealtimeDeliveries } from "@/hooks/useRealtimeDeliveries";
import { useUniqueDeliveries } from "@/hooks/useUniqueDeliveries";
import { DashboardExport } from "@/components/admin/DashboardExport";
import { GenerateInviteDialog } from "@/components/admin/GenerateInviteDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCitiesWithRegions } from "@/services/regions";
import { toast } from "sonner";

type Period = "today" | "7d" | "30d";
type AutoRefreshOption = 0 | 15 | 30 | 60;
const AUTO_REFRESH_OPTIONS: { value: AutoRefreshOption; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
];

function getDateFrom(period: Period): string {
  const d = new Date();
  if (period === "today") d.setHours(0, 0, 0, 0);
  else if (period === "7d") d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
}

const PERIOD_LABELS: Record<Period, string> = { today: "Hoje", "7d": "7 dias", "30d": "30 dias" };

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshOption>(() => {
    try {
      const v = Number(localStorage.getItem("epj_dashboard_autorefresh") ?? "30");
      return ([0, 15, 30, 60].includes(v) ? v : 30) as AutoRefreshOption;
    } catch { return 30; }
  });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const dateFrom = useMemo(() => getDateFrom(period), [period]);
  useRealtimeDeliveries();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const intervalRef = useRef<number | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const refreshScopedQueries = React.useCallback(async (opts?: { full?: boolean }) => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey;
            if (!Array.isArray(k) || k[0] !== "deliveries") return false;
            return opts?.full ? true : (k as unknown[]).includes(dateFrom);
          },
        }),
        queryClient.invalidateQueries({ queryKey: ["delivery-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["online-drivers"] }),
      ]);
      setLastSync(new Date());
      setLiveError(null);
    } catch (e: any) {
      setLiveError(e?.message ?? "Falha ao sincronizar");
    }
  }, [queryClient, dateFrom]);

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
      toast.error("Você está offline. Atualizações pausadas.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshScopedQueries]);

  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers, isLoading: loadingDriversOnline } = useOnlineDrivers();
  const { data: allDrivers } = useDrivers();
  const { data: companies } = useCompanies();
  const { selectedCity, setCity } = useCity();
  const { data: allDeliveries, isLoading: loadingDeliveries } = useDeliveries({ dateFrom, pageSize: 500 });
  const { data: inTransitData, isLoading: loadingTransit } = useDeliveries({ status: "in_transit" });
  const { data: dbCities } = useCitiesWithRegions();
  const { data: regions } = useRegions(selectedCity || undefined);

  const inTransitCount = inTransitData?.count ?? 0;
  const totalCompanies = companies?.length ?? 0;
  const onlineCount = onlineDrivers?.length ?? 0;
  const cities = dbCities || Array.from(new Set(regions?.map(r => r.city) || [])).sort();

  const rawPeriodDeliveries = allDeliveries?.data ?? [];
  const filteredByCity = selectedCity 
    ? rawPeriodDeliveries.filter(d => d.companies?.city_id === selectedCity || (!d.companies?.city_id && d.driver_id === null))
    : rawPeriodDeliveries;
    
  let filteredPeriodDeliveries = filteredByCity;
  if (showOnlyCompleted) {
    filteredPeriodDeliveries = filteredPeriodDeliveries.filter(d => ["completed", "delivered"].includes(d.status));
  }

  const periodDeliveries = useUniqueDeliveries(filteredPeriodDeliveries);
  const isLoadingMain = loadingDeliveries || loadingTransit || loadingDriversOnline;

  const metrics = useMemo(() => {
    const total = periodDeliveries.length;
    const delivered = periodDeliveries.filter(d => d.status === "delivered").length;
    const pending = periodDeliveries.filter(d => d.status === "pending" || d.status === "broadcasted").length;
    const cancelled = periodDeliveries.filter(d => d.status === "cancelled").length;
    const revenue = periodDeliveries
      .filter(d => d.status === "delivered")
      .reduce((sum, d) => sum + Number(d.value ?? 0), 0);
    const conversionRate = total > 0 ? (delivered / total) * 100 : 0;

    const criticalAlerts = periodDeliveries.filter((d: any) => {
      if (d.status !== "pending" && d.status !== "broadcasted") return false;
      if (d.driver_id) return false;
      return (Date.now() - new Date(d.created_at).getTime()) / 60000 > 30;
    });

    return { total, delivered, pending, cancelled, revenue, conversionRate, criticalAlerts };
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

  const liveActive = autoRefresh > 0 && isOnline;

  // Relative time for last sync
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick(x => x + 1), 15000);
    return () => window.clearInterval(t);
  }, []);
  const syncAgo = (() => {
    const diff = Math.floor((Date.now() - lastSync.getTime()) / 1000);
    if (diff < 5) return "agora";
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}min`;
  })();

  return (
    <AdminLayout title="Dashboard">
      {/* ── TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-muted/60 rounded-lg p-0.5 gap-0.5">
            {(["today", "7d", "30d"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all",
                  period === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* City Filter */}
          <div className="w-40">
            <Select value={selectedCity || "all"} onValueChange={(v) => setCity(v === "all" ? null : v)}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-card border-border/50">
                <SelectValue placeholder="Todas as Cidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Cidades</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-muted/60 px-3 py-1.5 rounded-md">
            <input 
              type="checkbox" 
              checked={showOnlyCompleted}
              onChange={(e) => setShowOnlyCompleted(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 bg-background"
            />
            Apenas Finalizadas
          </label>

          {/* Live pill */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
            !isOnline
              ? "bg-destructive/10 text-destructive"
              : liveActive
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
          )}>
            {!isOnline ? (
              <><WifiOff className="h-3 w-3" /> Offline</>
            ) : (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  {liveActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />}
                  <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", liveActive ? "bg-success" : "bg-muted-foreground/40")} />
                </span>
                {liveActive ? `Live · ${syncAgo}` : "Pausado"}
              </>
            )}
          </div>

          {/* Auto-refresh selector */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
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
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing} className="h-8 w-8 p-0">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
          <GenerateInviteDialog triggerLabel="Convidar Parceiro" />
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/regions")} className="gap-1.5">
            <MapIcon className="h-3.5 w-3.5" />
            Mapa
          </Button>
          <DashboardExport deliveries={periodDeliveries} period={PERIOD_LABELS[period]} />
        </div>
      </div>

      {/* ── OFFLINE / ERROR BANNER ── */}
      {(!isOnline || liveError) && (
        <div className={cn(
          "mb-5 rounded-xl p-3 flex items-center gap-3 border",
          !isOnline ? "bg-destructive/5 border-destructive/30" : "bg-warning/5 border-warning/30"
        )}>
          {!isOnline ? <WifiOff className="h-4 w-4 text-destructive shrink-0" /> : <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
          <p className="text-xs text-muted-foreground flex-1">
            {!isOnline ? "Sem conexão. Reconectaremos automaticamente." : (liveError ?? "Reconectando...")}
          </p>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={!isOnline || refreshing} className="text-xs h-7">
            Tentar
          </Button>
        </div>
      )}

      {/* ── CRITICAL ALERT ── */}
      {metrics.criticalAlerts.length > 0 && (
        <div className="mb-5 bg-destructive/5 border border-destructive/30 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">
            <strong className="text-destructive">{metrics.criticalAlerts.length}</strong> entrega{metrics.criticalAlerts.length > 1 ? "s" : ""} sem motoboy há +30min
          </p>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => navigate("/admin/deliveries")}>
            Resolver
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* ═══════════════════════════════════════════
            SEÇÃO 1 — KPIs (clicáveis)
        ═══════════════════════════════════════════ */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoadingMain ? (
              <>
                <KPISkeleton />
                <KPISkeleton />
                <KPISkeleton />
                <KPISkeleton />
              </>
            ) : (
              <>
                <KPICard
                  icon={<Truck className="h-5 w-5" />}
                  label="Em Trânsito"
                  value={inTransitCount}
                  sub={`${metrics.pending} pendentes`}
                  color="primary"
                  pulse={inTransitCount > 0}
                  onClick={() => navigate("/admin/deliveries?status=in_transit")}
                />
                <KPICard
                  icon={<DollarSign className="h-5 w-5" />}
                  label="Faturamento"
                  value={`R$ ${metrics.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  sub={`${metrics.delivered} entregues`}
                  color="success"
                />
                <KPICard
                  icon={<Package className="h-5 w-5" />}
                  label="Pedidos"
                  value={metrics.total}
                  sub={`${metrics.conversionRate.toFixed(0)}% conversão`}
                  color="info"
                  onClick={() => navigate("/admin/deliveries")}
                />
                <KPICard
                  icon={<Bike className="h-5 w-5" />}
                  label="Frota Online"
                  value={onlineCount}
                  sub={`${totalCompanies} empresa${totalCompanies !== 1 ? "s" : ""} · ${cities.length} cidade${cities.length !== 1 ? "s" : ""}`}
                  color="accent"
                  onClick={() => navigate("/admin/drivers")}
                />
              </>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            SEÇÃO 2 — Gráficos
        ═══════════════════════════════════════════ */}
        <section>
          <DashboardCharts
            deliveries={periodDeliveries}
            drivers={allDrivers}
            period={period}
            isLoading={loadingDeliveries}
          />
        </section>

        {/* ═══════════════════════════════════════════
            SEÇÃO 3 — Painel operacional (Frota + Atividade)
        ═══════════════════════════════════════════ */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[420px]">
              <MotoboysSidebar />
            </div>
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[420px]">
              <NotificationsPanel />
            </div>
          </div>
        </section>
      </div>
      {/* ── BONASOFT Watermark ── */}
      <div className="mt-16 pb-8 text-center opacity-40 select-none pointer-events-none">
        <p className="text-[11px] font-black uppercase tracking-[0.6em] text-muted-foreground ml-2">BONASOFT</p>
      </div>
    </AdminLayout>
  );
}

/* ── KPI Card (clicável) ── */
function KPICard({ icon, label, value, sub, color, pulse, onClick }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color: "primary" | "success" | "info" | "accent"; pulse?: boolean;
  onClick?: () => void;
}) {
  const iconBg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    accent: "bg-accent text-accent-foreground",
  };
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "bg-card border border-border/50 rounded-xl p-4 shadow-sm transition-all group text-left w-full",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
          iconBg[color],
          pulse && "animate-pulse",
        )}>{icon}</div>
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          {onClick && <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
    </Wrapper>
  );
}

/* ── KPI Skeleton ── */
function KPISkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-16 h-3 rounded" />
      </div>
      <Skeleton className="w-20 h-7 rounded mb-1.5" />
      <Skeleton className="w-24 h-3 rounded" />
    </div>
  );
}
