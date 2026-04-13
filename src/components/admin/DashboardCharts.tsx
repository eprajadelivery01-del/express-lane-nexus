import { useMemo } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { DeliveryWithRelations } from "@/services/deliveries";
import type { DriverWithProfile } from "@/services/drivers";
import { Trophy } from "lucide-react";

interface Props {
  deliveries: DeliveryWithRelations[];
  drivers?: DriverWithProfile[];
  period: "today" | "7d" | "30d";
}

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(38, 92%, 50%)", broadcasted: "hsl(210, 100%, 52%)",
  accepted: "hsl(217, 91%, 50%)", collecting: "hsl(32, 95%, 52%)",
  in_transit: "hsl(270, 60%, 55%)", delivered: "hsl(145, 63%, 42%)",
  cancelled: "hsl(0, 84%, 60%)", returned: "hsl(220, 10%, 50%)",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", broadcasted: "Enviado", accepted: "Aceito",
  collecting: "Coletando", in_transit: "Em Trânsito", delivered: "Entregue",
  cancelled: "Cancelado", returned: "Devolvido",
};

const RANK_COLORS = ["hsl(38, 92%, 50%)", "hsl(220, 10%, 60%)", "hsl(25, 70%, 45%)", "hsl(217, 91%, 50%)", "hsl(145, 63%, 42%)"];

export function DashboardCharts({ deliveries, drivers, period }: Props) {
  const revenueTrend = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; count: number }>();
    const now = new Date();
    const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = days <= 7
        ? d.toLocaleDateString("pt-BR", { weekday: "short" })
        : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      map.set(key, { date: label, revenue: 0, count: 0 });
    }
    deliveries.forEach((d) => {
      if (d.status !== "delivered") return;
      const key = (d.delivered_at || d.created_at)?.split("T")[0];
      if (key && map.has(key)) {
        const e = map.get(key)!;
        e.revenue += Number(d.value ?? 0);
        e.count += 1;
      }
    });
    return Array.from(map.values());
  }, [deliveries, period]);

  const statusDist = useMemo(() => {
    const c: Record<string, number> = {};
    deliveries.forEach((d) => { c[d.status] = (c[d.status] || 0) + 1; });
    return Object.entries(c)
      .map(([s, v]) => ({ name: STATUS_LABELS[s] || s, value: v, color: STATUS_COLORS[s] || "#888" }))
      .sort((a, b) => b.value - a.value);
  }, [deliveries]);

  const hourly = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}h`, entregas: 0 }));
    deliveries.forEach((d) => { h[new Date(d.created_at).getHours()].entregas += 1; });
    return h.filter((_, i) => i >= 6 && i <= 23);
  }, [deliveries]);

  const driverRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    deliveries.forEach((d) => {
      if (d.status === "delivered" && d.driver_id) {
        counts[d.driver_id] = (counts[d.driver_id] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([driverId, entregas]) => {
        const driver = drivers?.find(dr => dr.id === driverId);
        const name = driver?.profiles?.full_name || `Motoboy ${driverId.slice(0, 6)}`;
        return { name, entregas, driverId };
      })
      .sort((a, b) => b.entregas - a.entregas)
      .slice(0, 10);
  }, [deliveries, drivers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Revenue Trend */}
      <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4">📈 Tendência de Receita</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueTrend}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(145,63%,42%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(145,63%,42%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" tickFormatter={(v) => `R$${v}`} />
            <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(145,63%,42%)" strokeWidth={2.5} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4">🍩 Status</h3>
        {statusDist.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">Sem dados</div>
        )}
      </div>

      {/* Hourly Volume */}
      <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4">⏰ Volume por Hora</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(220,10%,50%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(220,10%,50%)" allowDecimals={false} />
            <Tooltip formatter={(v: number) => [v, "Entregas"]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="entregas" fill="hsl(217,91%,50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Driver Ranking */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-bold text-foreground">Ranking Motoboys</h3>
        </div>
        {driverRanking.length > 0 ? (
          <div className="space-y-2.5">
            {driverRanking.map((d, i) => {
              const maxVal = driverRanking[0].entregas;
              const pct = maxVal > 0 ? (d.entregas / maxVal) * 100 : 0;
              return (
                <div key={d.driverId} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i < 3 ? "text-white" : "text-muted-foreground bg-muted/50"}`}
                    style={i < 3 ? { backgroundColor: RANK_COLORS[i] } : undefined}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground truncate">{d.name}</span>
                      <span className="text-xs font-bold text-primary ml-2 shrink-0">{d.entregas}</span>
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: i < 5 ? RANK_COLORS[i] : "hsl(217, 91%, 50%)" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">Sem entregas no período</div>
        )}
      </div>
    </div>
  );
}
