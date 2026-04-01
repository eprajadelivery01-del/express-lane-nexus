import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { mockDrivers, mockCompanies } from "@/data/mockData";
import { Users, Building2, Bike, Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "drivers" | "companies";

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>("drivers");

  return (
    <AdminLayout title="Usuários" subtitle="Gestão de entregadores e empresas">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("drivers")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "drivers" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
          )}
        >
          <Bike className="h-4 w-4" /> Entregadores
        </button>
        <button
          onClick={() => setTab("companies")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "companies" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
          )}
        >
          <Building2 className="h-4 w-4" /> Empresas
        </button>
      </div>

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          {tab === "drivers" ? "Novo Entregador" : "Nova Empresa"}
        </button>
      </div>

      {tab === "drivers" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockDrivers.map((driver) => (
            <div key={driver.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {driver.name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${driver.is_online ? "bg-success" : "bg-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{driver.name}</p>
                  <p className="text-xs text-muted-foreground">{driver.phone}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{driver.vehicle}</span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Star className="h-3.5 w-3.5 text-warning fill-warning" /> {driver.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockCompanies.map((company) => (
            <div key={company.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{company.name}</p>
                  <p className="text-xs text-muted-foreground">{company.phone}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{company.address}</p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
