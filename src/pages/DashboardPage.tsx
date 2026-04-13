import { AdminLayout } from "@/components/admin/AdminLayout";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { useDeliveryStats, useDeliveries } from "@/services/deliveries";
import { useOnlineDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useAllRealtime } from "@/services/realtime";
import React, { useState } from "react";
import { useCity } from "@/contexts/CityContext";
import { useRegions } from "@/services/regions";
import { HeroMapSection } from "@/components/shared/HeroMapSection";
import { cn } from "@/lib/utils";
import {
  Package, Bike, Building2, DollarSign, TrendingUp, Clock, CheckCircle, MapPin, Navigation, ChevronRight
} from "lucide-react";

export default function DashboardPage() {
  const { data: stats } = useDeliveryStats();
  const { data: onlineDrivers } = useOnlineDrivers();
  const { data: companies } = useCompanies();
  const { data: inTransitData } = useDeliveries({ status: "in_transit" });
  const { data: deliveredData } = useDeliveries({ status: "delivered" });

  const { selectedCity, setCity } = useCity();
  const { data: regions } = useRegions(selectedCity || undefined);

  const inTransitCount = inTransitData?.count ?? 0;
  const deliveredCount = deliveredData?.count ?? 0;

  return (
    <AdminLayout title="Dashboard">
      <HeroMapSection 
        title="Central de Comando Operacional" 
        subtitle="Gestão inteligente de frota e demanda regional." 
      />
      
      <div className="p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* SECTION 1: UNIFIED OPERATIONAL OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard 
            icon={<Clock className="h-6 w-6" />} 
            label="Em Trânsito" 
            value={inTransitCount} 
            color="primary"
            trend={stats?.today ? `Hoje: ${stats.today}` : undefined}
            pulse 
          />
          <OverviewCard 
            icon={<Bike className="h-6 w-6" />} 
            label="Frota Online" 
            value={onlineDrivers?.length ?? 0} 
            color="success"
            trend="Prontos para entrega"
            pulse 
          />
          <OverviewCard 
            icon={<DollarSign className="h-6 w-6" />} 
            label="Faturamento" 
            value={`R$ ${(stats?.todayRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} 
            color="info"
            trend="Receita confirmada"
          />
          <OverviewCard 
            icon={<TrendingUp className="h-6 w-6" />} 
            label="Volume Total" 
            value={stats?.total ?? 0} 
            color="accent"
            trend={`${deliveredCount} entregues`}
          />
        </div>

        {/* SECTION 2: COMMAND CENTER LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Fleet Management */}
          <div className="xl:col-span-3 space-y-6">
            <MotoboysSidebar />
          </div>

          {/* Center Column: Regional Context */}
          <div className="xl:col-span-6 space-y-6">
            <div className="bg-card border border-border/60 rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground">Cidades de Atendimento</h3>
                    <p className="text-xs text-muted-foreground font-medium tracking-tight">Seleção de foco regional e monitoramento.</p>
                  </div>
                </div>
                <div className="bg-muted/50 px-4 py-2 rounded-2xl border border-border/40">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {Array.from(new Set(regions?.map(r => r.city) || [])).length} Ativas
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from(new Set(regions?.map(r => r.city) || [])).sort().map(city => {
                  const cityRegions = regions?.filter(r => r.city === city) || [];
                  const isActive = selectedCity === city;
                  return (
                    <button
                      key={city}
                      onClick={() => setCity(city)}
                      className={cn(
                        "flex items-center justify-between p-5 rounded-3xl border transition-all duration-500 group relative overflow-hidden",
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.02]" 
                          : "bg-background border-border/40 hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          isActive ? "bg-white/20 backdrop-blur-md" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          <Navigation className={cn("h-6 w-6", isActive && "animate-pulse")} />
                        </div>
                        <div className="text-left">
                          <p className={cn("text-base font-black tracking-tight", isActive ? "text-white" : "text-foreground")}>{city}</p>
                          <p className={cn("text-[11px] font-bold opacity-70 uppercase tracking-wider", isActive ? "text-white/80" : "text-muted-foreground")}>
                            {cityRegions.length} Regiões
                          </p>
                        </div>
                      </div>
                      {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 animate-shimmer" />}
                    </button>
                  );
                })}
              </div>

              {/* Mini Indicators Bar */}
              <div className="mt-10 pt-8 border-t border-border/40 flex flex-wrap gap-6 justify-center lg:justify-start">
                <MiniIndicator icon={<CheckCircle className="text-success" />} label="Entregues" value={deliveredCount} />
                <div className="w-1 h-1 rounded-full bg-border mt-3 hidden sm:block" />
                <MiniIndicator icon={<Building2 className="text-primary" />} label="Empresas" value={companies?.length ?? 0} />
                <div className="w-1 h-1 rounded-full bg-border mt-3 hidden sm:block" />
                <MiniIndicator icon={<TrendingUp className="text-accent" />} label="Crescimento" value={`${Math.round((deliveredCount/Math.max(stats?.total || 1, 1))*100)}%`} />
              </div>
            </div>
          </div>

          {/* Right Column: Activity Feed */}
          <div className="xl:col-span-3 h-full min-h-[500px] border border-border/60 rounded-[2.5rem] overflow-hidden bg-card shadow-xl shadow-black/5">
            <NotificationsPanel />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function OverviewCard({ icon, label, value, color, trend, pulse }: {
  icon: React.ReactNode; label: string; value: string | number;
  color: "primary" | "success" | "info" | "accent" | "warning"; 
  trend?: string;
  pulse?: boolean;
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    info: "bg-info/10 text-info border-info/20",
    accent: "bg-accent/10 text-accent border-accent/20",
    warning: "bg-warning/10 text-warning border-warning/20",
  };

  return (
    <div className="group rounded-[2rem] bg-card p-6 border border-border/60 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
      <div className={cn(
        "absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity",
        color === "primary" ? "bg-primary" : color === "success" ? "bg-success" : "bg-info"
      )} />
      
      <div className="flex flex-col gap-4">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:rotate-12",
          colorMap[color],
          pulse && "animate-pulse"
        )}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-black text-foreground mt-1 tracking-tighter">{value}</p>
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", colorMap[color].split(" ")[1])} />
              <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight">{trend}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniIndicator({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center border border-border/40">
        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight leading-none mb-1">{label}</p>
        <p className="text-sm font-black text-foreground leading-none">{value}</p>
      </div>
    </div>
  );
}
