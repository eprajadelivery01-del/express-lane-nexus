import { useMemo } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { DeliveryWithRelations } from "@/services/deliveries";

interface DashboardChartsProps {
  deliveries: DeliveryWithRelations[];
  period: "today" | "7d" | "30d";
}

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(38, 92%, 50%)",
  broadcasted: "hsl(210, 100%, 52%)",
  accepted: "hsl(217, 91%, 50%)",
  collecting: "hsl(32, 95%, 52%)",
  in_transit: "hsl(270, 60%, 55%)",
  delivered: "hsl(145, 63%, 42%)",
  cancelled: "hsl(0, 84%, 60%)",
  returned: "hsl(220, 10%, 50%)",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  broadcasted: "Enviado",
  accepted: "Aceito",
  collecting: "Coletando",
  in_transit: "Em Trânsito",
  delivered: "Entregue",
  cancelled: "Cancelado",
  returned: "Devolvido",
};

export function DashboardCharts({ deliveries, period }: DashboardChartsProps) {
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
        const entry = map.get(key)!;
        entry.revenue += Number(d.value ?? 0);
        entry.count += 1;
      }
    });

    return Array.from(map.values());
  }, [deliveries, period]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    deliveries.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, value]) => ({
        name: STATUS_LABELS[status] || status,
        value,
        color: STATUS_COLORS[status] || "hsl(220, 10%, 50%)",
      }))
      .sort((a, b) => b.value - a.value);
  }, [deliveries]);

  const hourlyVolume = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}h`,
      entregas: 0,
    }));
    deliveries.forEach((d) => {
      const h = new Date(d.created_at).getHours();
      hours[h].entregas += 1;
    });
    return hours.filter((_, i) => i >= 6 && i <= 23);
  }, [deliveries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Revenue Trend */}
      <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4">
          📈 Tendência de Receita
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueTrend}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(145, 63%, 42%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(145, 63%, 42%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" tickFormatter={(v) => `R$${v}`} />
            <Tooltip
              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
              contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(220, 13%, 91%)" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(145, 63%, 42%)"
              strokeWidth={2.5}
              fill="url(#revenueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4">
          🍩 Distribuição de Status
        </h3>
        {statusDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {statusDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(220, 13%, 91%)" }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            Sem dados no período
          </div>
        )}
      </div>

      {/* Hourly Volume */}
      <div className="lg:col-span-3 bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4">
          ⏰ Volume por Hora
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourlyVolume}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(220, 10%, 50%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 50%)" allowDecimals={false} />
            <Tooltip
              formatter={(value: number) => [value, "Entregas"]}
              contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(220, 13%, 91%)" }}
            />
            <Bar dataKey="entregas" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
