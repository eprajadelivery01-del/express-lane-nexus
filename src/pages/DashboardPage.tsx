import { AdminLayout } from "@/components/admin/AdminLayout";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { MapView } from "@/components/admin/MapView";
import { useDeliveryStats } from "@/services/deliveries";
import { useOnlineDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useAllRealtime } from "@/services/realtime";
import { Search, Bell, Settings, Camera } from "lucide-react";

export default function DashboardPage() {
  useAllRealtime();

  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers } = useOnlineDrivers();
  const { data: companies } = useCompanies();

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral do sistema">
      <div className="flex flex-col lg:flex-row gap-0 -m-4 md:-m-6 h-[calc(100vh-73px)]">
        {/* Left Panel */}
        <div className="hidden xl:block w-64 shrink-0">
          <MotoboysSidebar />
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Camera className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
            <DashStatCard
              icon="📦"
              label="Pedidos do Dia"
              value={stats?.today ?? 0}
              color="bg-warning/10 border-warning/30"
            />
            <DashStatCard
              icon="🏍️"
              label="Motoboys Ativos"
              value={onlineDrivers?.length ?? 0}
              color="bg-success/10 border-success/30"
              highlight
            />
            <DashStatCard
              icon="🏪"
              label="Locais Ativos"
              value={companies?.length ?? 0}
              color="bg-info/10 border-info/30"
            />
            <DashStatCard
              icon="💰"
              label="Carteira"
              value={`R$ ${(stats?.todayRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              color="bg-destructive/10 border-destructive/30"
            />
          </div>

          {/* Map */}
          <div className="flex-1 px-4 pb-4 min-h-[300px]">
            <MapView />
          </div>
        </div>

        {/* Right Panel */}
        <div className="hidden xl:block w-72 shrink-0">
          <NotificationsPanel />
        </div>
      </div>
    </AdminLayout>
  );
}

function DashStatCard({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${color} transition-all hover:shadow-md cursor-pointer`}>
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-display font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
