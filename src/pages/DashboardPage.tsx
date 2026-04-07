import { AdminLayout } from "@/components/admin/AdminLayout";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { MapView } from "@/components/admin/MapView";
import { useDeliveryStats, useDeliveries } from "@/services/deliveries";
import { useOnlineDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useRegions, useCitiesWithRegions } from "@/services/regions";
import { useAllRealtime } from "@/services/realtime";
import { useCity } from "@/contexts/CityContext";
import { HeroMapSection } from "@/components/shared/HeroMapSection";
import { useState } from "react";
import {
  Package, Bike, Building2, DollarSign, TrendingUp, Clock, CheckCircle, ChevronDown, MapPin, Loader2
} from "lucide-react";

export default function DashboardPage() {
  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers } = useOnlineDrivers();
  const { data: companies } = useCompanies();
  const { data: inRouteData } = useDeliveries({ status: "in_route" });
  const { data: completedData } = useDeliveries({ status: "completed" });
  
  const { selectedCity, setCity, selectedCityCoords } = useCity();
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // New: Get cities that have drawings
  const { data: availableCities } = useCitiesWithRegions();

  const inRouteCount = inRouteData?.count ?? 0;
  const completedCount = completedData?.count ?? 0;

  // Load regions for selected city
  const { data: regions } = useRegions(selectedCity || undefined);

  const selectCity = (cityName: string | null) => {
    setCity(cityName);
    setShowCityDropdown(false);
  };

  return (
    <AdminLayout title="Dashboard">
      <HeroMapSection 
        title="Painel de Monitoramento" 
        subtitle="Gerencie suas entregas e acompanhe os motoboys em tempo real." 
      />
      <div className="flex flex-col lg:flex-row gap-0 p-4 md:p-6 min-h-[calc(100vh-400px)]">
        {/* Left Panel - Motoboys */}
        <div className="hidden xl:block w-64 shrink-0">
          <MotoboysSidebar />
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* City Selector */}
          <div className="px-4 pt-3 pb-1">
            <div className="relative">
              <button
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className="w-full flex items-center justify-between gap-2 bg-card rounded-xl border border-border px-4 py-2.5 hover:bg-muted transition-all shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-bold text-foreground truncate">
                    {selectedCity || "Selecionar cidade..."}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCityDropdown ? "rotate-180" : ""}`} />
              </button>

              {showCityDropdown && (
                <div className="absolute z-50 top-full mt-2 left-0 right-0 bg-card rounded-2xl border border-border shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => selectCity(null)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border text-muted-foreground"
                  >
                    Todas as regiões
                  </button>
                  {(availableCities ?? []).length > 0 ? (
                    availableCities?.map((city, i) => (
                      <button
                        key={i}
                        onClick={() => selectCity(city)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border last:border-0 font-medium"
                      >
                        {city}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground italic">
                      Nenhuma cidade com regiões desenhadas
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 p-4">
            <StatCard
              icon={<Package className="h-5 w-5" />}
              label="Corridas Hoje"
              value={stats?.today ?? 0}
              iconBg="bg-warning/10"
              iconColor="text-warning"
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Em Andamento"
              value={inRouteCount}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              pulse
            />
            <StatCard
              icon={<Bike className="h-5 w-5" />}
              label="Motoboys Online"
              value={onlineDrivers?.length ?? 0}
              iconBg="bg-success/10"
              iconColor="text-success"
              pulse
            />
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Faturamento"
              value={`R$ ${(stats?.todayRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              iconBg="bg-info/10"
              iconColor="text-info"
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-3 px-4 pb-3">
            <MiniStat icon={<CheckCircle className="h-3.5 w-3.5 text-success" />} label="Finalizadas" value={completedCount} />
            <MiniStat icon={<Building2 className="h-3.5 w-3.5 text-accent" />} label="Empresas" value={companies?.length ?? 0} />
            <MiniStat icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />} label="Total Geral" value={stats?.total ?? 0} />
          </div>

          {/* Map moved to Hero */}
        </div>

        {/* Right Panel - Notifications */}
        <div className="hidden xl:block w-72 shrink-0">
          <NotificationsPanel />
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  icon, label, value, iconBg, iconColor, pulse,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  iconBg: string; iconColor: string; pulse?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} ${pulse ? "animate-pulse" : ""}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-display font-extrabold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground ml-auto">{value}</span>
    </div>
  );
}
