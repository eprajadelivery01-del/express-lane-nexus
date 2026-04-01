import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDrivers } from "@/services/drivers";
import { Star, Phone, Bike, Loader2, MoreHorizontal } from "lucide-react";

export default function DriversPage() {
  const { data: drivers, isLoading } = useDrivers();

  return (
    <AdminLayout title="Entregadores" subtitle="Gestão de motoboys e frota">
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(drivers ?? []).map((driver) => (
            <div key={driver.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all border border-border group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {driver.profiles?.avatar_url ? (
                        <img src={driver.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <Bike className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${driver.is_online ? "bg-success" : "bg-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{driver.profiles?.full_name || "—"}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${driver.is_online ? "text-success" : "text-muted-foreground"}`}>
                      {driver.is_online ? "● Online" : "● Offline"}
                    </span>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{driver.vehicle}</span>
                  {driver.license_plate && (
                    <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono text-foreground">{driver.license_plate}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-bold text-foreground">
                  <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                  {Number(driver.rating).toFixed(1)}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Comissão: {Number(driver.commission_rate)}%</span>
                {driver.profiles?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {driver.profiles.phone}
                  </span>
                )}
              </div>
            </div>
          ))}
          {(drivers ?? []).length === 0 && (
            <div className="col-span-full p-12 text-center">
              <Bike className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum entregador cadastrado</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
