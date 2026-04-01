import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { DeliveryStatusBadge } from "@/components/admin/DeliveryStatusBadge";
import { mockDeliveries, mockDrivers } from "@/data/mockData";
import { Truck, Package, Users, DollarSign, Clock, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const activeDeliveries = mockDeliveries.filter(d => !["completed", "cancelled"].includes(d.status));
  const completedToday = mockDeliveries.filter(d => d.status === "completed").length;
  const onlineDrivers = mockDrivers.filter(d => d.is_online).length;
  const totalRevenue = mockDeliveries.filter(d => d.status === "completed").reduce((sum, d) => sum + d.value, 0);

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral do sistema">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Entregas Ativas"
          value={activeDeliveries.length}
          change="+3 na última hora"
          changeType="positive"
          icon={<Truck className="h-5 w-5 text-primary" />}
        />
        <StatsCard
          title="Finalizadas Hoje"
          value={completedToday}
          change="+12% vs ontem"
          changeType="positive"
          icon={<Package className="h-5 w-5 text-success" />}
          iconBg="bg-success/10"
        />
        <StatsCard
          title="Entregadores Online"
          value={`${onlineDrivers}/${mockDrivers.length}`}
          change={`${onlineDrivers} disponíveis`}
          changeType="neutral"
          icon={<Users className="h-5 w-5 text-info" />}
          iconBg="bg-info/10"
        />
        <StatsCard
          title="Faturamento Hoje"
          value={`R$ ${totalRevenue.toFixed(2)}`}
          change="+8% vs ontem"
          changeType="positive"
          icon={<DollarSign className="h-5 w-5 text-accent" />}
          iconBg="bg-accent/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent deliveries */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="font-display font-semibold text-foreground">Entregas Recentes</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Últimas movimentações</p>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {mockDeliveries.slice(0, 5).map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">#{delivery.id}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{delivery.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{delivery.customer_name} • {delivery.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <DeliveryStatusBadge status={delivery.status} />
                  <span className="text-sm font-semibold text-foreground hidden sm:block">
                    R$ {delivery.value.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Online drivers */}
        <div className="bg-card rounded-xl shadow-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="font-display font-semibold text-foreground">Entregadores</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Status em tempo real</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {mockDrivers.map((driver) => (
              <div key={driver.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold text-foreground">
                        {driver.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${driver.is_online ? "bg-success" : "bg-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{driver.vehicle} • ⭐ {driver.rating}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium ${driver.is_online ? "text-success" : "text-muted-foreground"}`}>
                  {driver.is_online ? "Online" : "Offline"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
