import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DeliveryStatusBadge } from "@/components/admin/DeliveryStatusBadge";
import { mockDeliveries } from "@/data/mockData";
import { DeliveryStatus } from "@/types/models";
import { Search, Filter, Eye } from "lucide-react";

const statusFilters: { label: string; value: DeliveryStatus | "all" }[] = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Em Coleta", value: "collecting" },
  { label: "Em Rota", value: "in_route" },
  { label: "Finalizadas", value: "completed" },
  { label: "Canceladas", value: "cancelled" },
];

export default function DeliveriesPage() {
  const [activeFilter, setActiveFilter] = useState<DeliveryStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = mockDeliveries.filter((d) => {
    const matchesFilter = activeFilter === "all" || d.status === activeFilter;
    const matchesSearch = search === "" ||
      d.company_name.toLowerCase().includes(search.toLowerCase()) ||
      d.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      d.id.includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <AdminLayout title="Entregas" subtitle="Gestão de corridas e ordens de serviço">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 shadow-card flex-1 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por empresa, cliente ou OS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">OS</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Empresa</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4 hidden md:table-cell">Cliente</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4 hidden lg:table-cell">Entregador</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4 hidden sm:table-cell">Valor</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <span className="text-sm font-bold text-primary">#{delivery.id}</span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground">{delivery.company_name}</p>
                    <p className="text-xs text-muted-foreground">{delivery.region_name}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="text-sm text-foreground">{delivery.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{delivery.address}</p>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <p className="text-sm text-foreground">{delivery.driver_name || "—"}</p>
                  </td>
                  <td className="p-4">
                    <DeliveryStatusBadge status={delivery.status} />
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <span className="text-sm font-semibold text-foreground">R$ {delivery.value.toFixed(2)}</span>
                  </td>
                  <td className="p-4">
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma entrega encontrada</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
