import { AdminLayout } from "@/components/admin/AdminLayout";
import { useCompanies } from "@/services/companies";
import { Building2, Phone, MapPin, MoreHorizontal, Loader2 } from "lucide-react";

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();

  return (
    <AdminLayout title="Empresas" subtitle="Gestão de lojas e estabelecimentos">
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(companies ?? []).map((company) => (
            <div key={company.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all border border-border group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    {company.logo_url ? (
                      <img src={company.logo_url} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{company.name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${company.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {company.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-2">
                {company.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{company.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {(companies ?? []).length === 0 && (
            <div className="col-span-full p-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
