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
  Package, Bike, Building2, DollarSign, TrendingUp,
  RefreshCw, AlertTriangle, Clock, CheckCircle,
  Map as MapIcon, WifiOff, Truck
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
  const { data: onlineDrivers } = useOnlineDrivers();
  const { data: allDrivers } = useDrivers();
  const { data: companies } = useCompanies();
  const { data: allDeliveries } = useDeliveries({ dateFrom, pageSize: 500 });
  const { data: inTransitData } = useDeliveries({ status: "in_transit" });

  const { selectedCity } = useCity();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        {/* Left: Period + Live indicator */}
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

          {/* Auto-refresh selector (compact) */}
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

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
          <GenerateInviteDialog fixedRole="driver" triggerLabel="Convidar" />
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/regions")} className="gap-1.5">
            <MapIcon className="h-3.5 w-3.5" />
            Mapa
          </Button>
          <DashboardExport deliveries={periodDeliveries} period={PERIOD_LABELS[period]} />
        </div>
      </div>

      {/* ── OFFLINE BANNER ── */}
      {(!isOnline || liveError) && (
        <div className={cn(
          "mb-4 rounded-xl p-3 flex items-center gap-3 border",
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
        <div className="mb-4 bg-destructive/5 border border-destructive/30 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">
            <strong className="text-destructive">{metrics.criticalAlerts.length}</strong> entrega{metrics.criticalAlerts.length > 1 ? "s" : ""} sem motoboy há +30min
          </p>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => navigate("/admin/deliveries")}>
            Resolver
          </Button>
        </div>
      )}

      <div className="space-y-5">
        {/* ── KPI CARDS ── 4 essential metrics only */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            icon={<Truck className="h-5 w-5" />}
            label="Em Trânsito"
            value={inTransitCount}
            sub={`${metrics.pending} pendentes`}
            color="primary"
            pulse={inTransitCount > 0}
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
          />
          <KPICard
            icon={<Bike className="h-5 w-5" />}
            label="Frota Online"
            value={onlineCount}
            sub={`${totalCompanies} empresa${totalCompanies !== 1 ? "s" : ""} · ${cities.length} cidade${cities.length !== 1 ? "s" : ""}`}
            color="accent"
          />
        </div>

        {/* ── CHARTS ── */}
        <DashboardCharts deliveries={periodDeliveries} drivers={allDrivers} period={period} />

        {/* ── BOTTOM PANEL ── 2 columns: Fleet + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <MotoboysSidebar />
          </div>
          <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <NotificationsPanel />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ── KPI Card ── */
function KPICard({ icon, label, value, sub, color, pulse }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color: "primary" | "success" | "info" | "accent"; pulse?: boolean;
}) {
  const iconBg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    accent: "bg-accent text-accent-foreground",
  };
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
          iconBg[color],
          pulse && "animate-pulse",
        )}>{icon}</div>
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}
