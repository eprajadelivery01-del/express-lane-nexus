import { AdminLayout } from "@/components/admin/AdminLayout";
import { CityServiceList } from "@/components/admin/CityServiceList";
import { useCitiesWithRegions } from "@/services/regions";
import { Building2, Globe, MapPin } from "lucide-react";

export default function BasesPage() {
  const { data: cities, isLoading } = useCitiesWithRegions();

  return (
    <AdminLayout title="Bases" subtitle="Gestão das cidades de atendimento da plataforma">
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Bases</p>
                <p className="text-3xl font-black text-foreground">{cities?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/20">
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              Bases Ativas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cidades onde a plataforma possui operações e regiões de entrega cadastradas.
            </p>
          </div>
          
          <div className="p-6">
            <div className="max-w-xl">
              <CityServiceList />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
