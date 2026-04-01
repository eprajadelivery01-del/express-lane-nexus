import { AdminLayout } from "@/components/admin/AdminLayout";
import { mockRegions } from "@/data/mockData";
import { MapPin, Plus, DollarSign } from "lucide-react";

export default function RegionsPage() {
  return (
    <AdminLayout title="Regiões" subtitle="Gestão de regiões e precificação">
      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Nova Região
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockRegions.map((region) => (
          <div key={region.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${region.color}18` }}
              >
                <MapPin className="h-5 w-5" style={{ color: region.color }} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{region.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: region.color }} />
                  <span className="text-xs text-muted-foreground">{region.color}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Valor da entrega
              </span>
              <span className="text-sm font-bold text-foreground">R$ {region.price.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
