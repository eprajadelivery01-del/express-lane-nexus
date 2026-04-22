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
  PackageCheck, Map as MapIcon, Radio, WifiOff, Minimize2, Maximize2, Trophy
} from "lucide-react";
import { useRealtimeDeliveries } from "@/hooks/useRealtimeDeliveries";
import { DashboardExport } from "@/components/admin/DashboardExport";
import { GenerateInviteDialog } from "@/components/admin/GenerateInviteDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SectionHeader, EmptyState, StatusBadge } from "@/components/admin/SectionHeader";

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
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshOption>(() => {
    try {
      const v = Number(localStorage.getItem("epj_dashboard_autorefresh") ?? "30");
      return ([0, 15, 30, 60].includes(v) ? v : 30) as AutoRefreshOption;
    } catch { return 30; }
  });
  const [compact, setCompact] = useState<boolean>(() => {
    try { return localStorage.getItem("epj_dashboard_compact") === "1"; } catch { return false; }
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
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

  // Persist compact mode + auto-suggest on small viewports
  useEffect(() => {
    try { localStorage.setItem("epj_dashboard_compact", compact ? "1" : "0"); } catch {}
  }, [compact]);

  useEffect(() => {
    try {
      const suggested = sessionStorage.getItem("epj_dashboard_compact_suggested");
      if (!suggested && typeof window !== "undefined" && window.innerWidth < 1280 && !compact) {
        sessionStorage.setItem("epj_dashboard_compact_suggested", "1");
        toast("Tela pequena detectada", {
          description: "Ative o modo compacto para uma visualização melhor.",
          action: { label: "Ativar", onClick: () => setCompact(true) },
          duration: 8000,
        });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* Indicador Live + estado da conexão */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border",
            !isOnline
              ? "bg-destructive/10 border-destructive/30"
              : liveError
                ? "bg-warning/10 border-warning/30"
                : "bg-muted/40 border-border/50"
          )}>
            {!isOnline ? (
              <>
                <WifiOff className="h-3 w-3 text-destructive" />
                <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Offline</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  {liveActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  )}
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    liveActive ? "bg-success" : "bg-muted-foreground/40"
                  )}></span>
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {liveError ? "Reconectando" : liveActive ? "Live" : "Pausado"}
                </span>
              </>
            )}
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

          {/* Compact mode toggle */}
          <button
            onClick={() => setCompact((c) => !c)}
            title={compact ? "Modo padrão" : "Modo compacto (ideal para telas menores)"}
            aria-pressed={compact}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95",
              compact
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {compact ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            {compact ? "Padrão" : "Compacto"}
          </button>

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

      {/* Per-endpoint sync timestamps */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground/80 mb-3 px-1">
        <span className="flex items-center gap-1">
          <Package className="h-3 w-3" /> Entregas: <strong className="text-foreground/80">{formatLastSync(syncMap.deliveries)}</strong>
          <span className="text-muted-foreground/50">({syncMap.deliveries.toLocaleTimeString("pt-BR")})</span>
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> Stats: <strong className="text-foreground/80">{formatLastSync(syncMap.stats)}</strong>
          <span className="text-muted-foreground/50">({syncMap.stats.toLocaleTimeString("pt-BR")})</span>
        </span>
        <span className="flex items-center gap-1">
          <Bike className="h-3 w-3" /> Frota: <strong className="text-foreground/80">{formatLastSync(syncMap.drivers)}</strong>
          <span className="text-muted-foreground/50">({syncMap.drivers.toLocaleTimeString("pt-BR")})</span>
        </span>
      </div>

      {/* Offline / Live error banner */}
      {(!isOnline || liveError) && (
        <div className={cn(
          "mb-4 rounded-xl p-3 flex items-center gap-3 border",
          !isOnline
            ? "bg-destructive/5 border-destructive/30"
            : "bg-warning/5 border-warning/30"
        )}>
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
            !isOnline ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
          )}>
            {!isOnline ? <WifiOff className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {!isOnline ? "Você está offline" : "Falha na sincronização ao vivo"}
            </p>
            <p className="text-xs text-muted-foreground">
              {!isOnline
                ? "O modo Live foi pausado. Reconectaremos automaticamente quando a internet voltar."
                : (liveError ?? "Tentando reconectar...")}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={!isOnline || refreshing} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Tentar agora
          </Button>
        </div>
      )}

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

      <div className={cn(compact ? "space-y-3" : "space-y-5")}>
        {/* KPI Cards */}
        <div className={cn("grid grid-cols-2 lg:grid-cols-4", compact ? "gap-2" : "gap-3")}>
          <KPICard compact={compact} icon={<Clock className="h-5 w-5" />} label="Em Trânsito" value={inTransitCount} sub={`Hoje: ${stats?.today ?? 0}`} color="primary" pulse />
          <KPICard compact={compact} icon={<Bike className="h-5 w-5" />} label="Frota Online" value={onlineCount} sub="Prontos para entrega" color="success" />
          <KPICard compact={compact} icon={<DollarSign className="h-5 w-5" />} label="Faturamento" value={`R$ ${metrics.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} sub={PERIOD_LABELS[period]} color="info" />
          <KPICard compact={compact} icon={<Package className="h-5 w-5" />} label="Volume Total" value={metrics.total} sub={`${metrics.delivered} entregues`} color="accent" />
        </div>

        {/* Quick Stats - Operational Status */}
        <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6", compact ? "gap-2" : "gap-3")}>
          <QuickStat compact={compact} icon={<Clock className="h-4 w-4 text-warning" />} label="Pendentes" value={metrics.pending} />
          <QuickStat compact={compact} icon={<CheckCircle className="h-4 w-4 text-info" />} label="Aceitos" value={metrics.accepted} />
          <QuickStat compact={compact} icon={<Truck className="h-4 w-4 text-primary" />} label="Coletando" value={metrics.collecting} />
          <QuickStat compact={compact} icon={<PackageCheck className="h-4 w-4 text-success" />} label="Entregues" value={metrics.delivered} />
          <QuickStat compact={compact} icon={<XCircle className="h-4 w-4 text-destructive" />} label="Cancelados" value={metrics.cancelled} />
          <QuickStat compact={compact} icon={<Receipt className="h-4 w-4 text-accent-foreground" />} label="Ticket Médio" value={`R$ ${metrics.avgTicket.toFixed(2)}`} />
        </div>

        {/* Operational Row - Business KPIs */}
        <div className={cn("grid grid-cols-2 lg:grid-cols-4", compact ? "gap-2" : "gap-3")}>
          <QuickStat compact={compact} icon={<Building2 className="h-4 w-4 text-primary" />} label="Empresas Ativas" value={totalCompanies} />
          <QuickStat compact={compact} icon={<MapPin className="h-4 w-4 text-info" />} label="Cidades Ativas" value={cities.length} />
          <QuickStat compact={compact} icon={<TrendingUp className="h-4 w-4 text-success" />} label="Taxa Conversão" value={`${metrics.conversionRate.toFixed(0)}%`} />
          <QuickStat compact={compact} icon={<Timer className="h-4 w-4 text-accent-foreground" />} label="Tempo Médio" value={metrics.avgDeliveryMin > 0 ? `${metrics.avgDeliveryMin.toFixed(0)} min` : "—"} />
        </div>

        {/* Charts */}
        <DashboardCharts deliveries={periodDeliveries} drivers={allDrivers} period={period} />

        {/* ===========================================================
            Painel Inferior — Grid harmônico, todos os cards padronizados
            (mesma altura, mesmo header, mesma tipografia, mesmos paddings)
        =========================================================== */}
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-fr",
            compact ? "min-h-[420px]" : "min-h-[560px]",
          )}
        >
          {/* COLUNA 1 — Frota (4/12) */}
          <div className={cn("lg:col-span-4 flex flex-col", compact ? "min-h-[420px]" : "min-h-[560px]")}>
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm h-full overflow-hidden flex flex-col">
              <MotoboysSidebar compact={compact} />
            </div>
          </div>

          {/* COLUNA 2 — Top Empresas + Cidades (4/12) */}
          <div className={cn("lg:col-span-4 flex flex-col gap-4", compact ? "min-h-[420px]" : "min-h-[560px]")}>
            {/* Top Empresas */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
              <SectionHeader
                icon={<Building2 className="h-4 w-4" />}
                tone="info"
                compact={compact}
                title="Top Empresas"
                subtitle="Ranking por volume no período"
                action={{ label: "Gerenciar", onClick: () => navigate("/admin/companies") }}
              />
              <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
                {(() => {
                  const counts = new Map<string, { id: string; name: string; count: number; revenue: number }>();
                  periodDeliveries.forEach((d: any) => {
                    const id = d.company_id;
                    const name = d.companies?.name || "—";
                    if (!id) return;
                    const cur = counts.get(id) || { id, name, count: 0, revenue: 0 };
                    cur.count += 1;
                    if (d.status === "delivered") cur.revenue += Number(d.value ?? 0);
                    counts.set(id, cur);
                  });
                  const top = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
                  if (top.length === 0) {
                    return (
                      <EmptyState
                        icon={<Building2 className="h-6 w-6" />}
                        title="Sem dados no período"
                        subtitle="Tente um intervalo maior ou aguarde novos pedidos."
                        cta={{ label: "Ver empresas", onClick: () => navigate("/admin/companies") }}
                      />
                    );
                  }
                  const maxCount = Math.max(...top.map(t => t.count), 1);
                  return (
                    <ul className={cn("space-y-1", compact ? "p-1.5" : "p-2")} role="list">
                      {top.map((c, i) => {
                        const pct = (c.count / maxCount) * 100;
                        const isSelected = selectedCompanyId === c.id;
                        const isLeader = i === 0;
                        return (
                          <li key={c.id}>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedCompanyId(c.id);
                                navigate("/admin/companies");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedCompanyId(c.id);
                                  navigate("/admin/companies");
                                }
                              }}
                              className={cn(
                                "relative flex items-center gap-3 rounded-xl border cursor-pointer overflow-hidden transition-all",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 active:scale-[0.99]",
                                compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
                                isSelected
                                  ? "bg-info/10 border-info/40 shadow-sm"
                                  : "border-transparent hover:bg-info/5 hover:border-info/20 hover:-translate-y-px hover:shadow-sm"
                              )}
                            >
                              {/* barra de progresso sutil */}
                              <div
                                className={cn(
                                  "absolute inset-y-0 left-0 rounded-xl pointer-events-none transition-all",
                                  isSelected ? "bg-info/10" : "bg-info/5"
                                )}
                                style={{ width: `${pct}%` }}
                                aria-hidden
                              />
                              <div className={cn(
                                "relative rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                                compact ? "w-5 h-5" : "w-6 h-6",
                                isLeader
                                  ? "bg-warning/15 text-warning"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {isLeader ? <Trophy className="h-3 w-3" /> : i + 1}
                              </div>
                              <div className="relative flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate tracking-tight">{c.name}</p>
                                {!compact && (
                                  <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                                    {c.count} {c.count === 1 ? "pedido" : "pedidos"}
                                  </p>
                                )}
                              </div>
                              <div className="relative text-right shrink-0">
                                <p className="text-xs font-bold text-foreground leading-none tabular-nums">{c.count}</p>
                                <p className="text-[10px] font-bold text-success mt-0.5 tabular-nums">R$ {c.revenue.toFixed(0)}</p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
              </div>
            </div>

            {/* Cidades — só renderiza se houver */}
            {cities.length > 0 && (
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm shrink-0">
                <SectionHeader
                  icon={<MapPin className="h-4 w-4" />}
                  tone="primary"
                  compact={compact}
                  title="Cidades"
                  subtitle={`${cities.length} ${cities.length === 1 ? "cidade ativa" : "cidades ativas"}`}
                  rightSlot={
                    selectedCity ? (
                      <button
                        onClick={() => setCity(null)}
                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                        title="Limpar filtro"
                      >
                        Limpar
                      </button>
                    ) : undefined
                  }
                />
                <div className={cn(
                  "overflow-y-auto scrollbar-thin space-y-1",
                  compact ? "p-1.5 max-h-[120px]" : "p-2 max-h-[160px]",
                )}>
                  {cities.map(city => {
                    const cityRegions = regions?.filter(r => r.city === city) || [];
                    const isActive = selectedCity === city;
                    return (
                      <button
                        key={city}
                        onClick={() => setCity(isActive ? null : city)}
                        aria-pressed={isActive}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl transition-all text-left border",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]",
                          compact ? "px-2.5 py-1.5" : "px-3 py-2",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "border-transparent hover:bg-primary/5 hover:border-primary/20 hover:-translate-y-px hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Navigation className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                          <span className={cn(
                            "text-xs font-bold truncate tracking-tight",
                            isActive ? "text-primary-foreground" : "text-foreground"
                          )}>
                            {city}
                          </span>
                        </div>
                        <span
                          title={`${cityRegions.length} ${cityRegions.length === 1 ? "região" : "regiões"}`}
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums tracking-wide",
                            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {cityRegions.length} reg.
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COLUNA 3 — Atividade Recente (4/12) */}
          <div className={cn("lg:col-span-4 flex flex-col", compact ? "min-h-[420px]" : "min-h-[560px]")}>
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
              <NotificationsPanel compact={compact} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function KPICard({ icon, label, value, sub, color, pulse, compact }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color: "primary" | "success" | "info" | "accent"; pulse?: boolean; compact?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary/10 text-primary", success: "bg-success/10 text-success",
    info: "bg-info/10 text-info", accent: "bg-accent text-accent-foreground",
  };
  return (
    <div className={cn(
      "bg-card border border-border/50 rounded-xl shadow-sm hover:shadow-md transition-all group hover:-translate-y-px",
      compact ? "p-2.5" : "p-4",
    )}>
      <div className={cn("flex items-center justify-between", compact ? "mb-1.5" : "mb-3")}>
        <div className={cn(
          "rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
          compact ? "w-8 h-8" : "w-9 h-9",
          styles[color],
          pulse && "animate-pulse",
        )}>{icon}</div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
      </div>
      <p className={cn(
        "font-bold text-foreground tracking-tight leading-none tabular-nums",
        compact ? "text-xl" : "text-2xl",
      )}>{value}</p>
      <p className={cn("font-medium text-muted-foreground mt-1", compact ? "text-[10px]" : "text-[11px]")}>{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function QuickStat({ icon, label, value, compact }: {
  icon: React.ReactNode; label: string; value: number | string; compact?: boolean;
}) {
  return (
    <div
      title={typeof value === "string" || typeof value === "number" ? `${label}: ${value}` : undefined}
      className={cn(
        "bg-card border border-border/50 rounded-xl text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-px",
        compact ? "p-2" : "p-3.5",
      )}
    >
      <div className={cn(
        "rounded-lg bg-muted/50 flex items-center justify-center mx-auto",
        compact ? "w-7 h-7 mb-1" : "w-8 h-8 mb-2",
      )}>{icon}</div>
      <p className={cn(
        "font-bold text-foreground leading-none tabular-nums",
        compact ? "text-base" : "text-lg",
      )}>{value}</p>
      <p className={cn(
        "font-medium text-muted-foreground mt-1 uppercase tracking-wider",
        compact ? "text-[9px] truncate" : "text-[10px]",
      )}>{label}</p>
    </div>
  );
}

