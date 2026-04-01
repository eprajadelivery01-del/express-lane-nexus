import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DeliveryStatusBadge } from "@/components/admin/DeliveryStatusBadge";
import { useDeliveries, useUpdateDeliveryStatus, useReassignDelivery } from "@/services/deliveries";
import { useCompanies } from "@/services/companies";
import { useDrivers } from "@/services/drivers";
import { useDeliveriesRealtime } from "@/services/realtime";
import { Search, Filter, Eye, MoreHorizontal, X as XIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusFilters = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Aceitas", value: "accepted" },
  { label: "Em Coleta", value: "collecting" },
  { label: "Em Rota", value: "in_route" },
  { label: "Finalizadas", value: "completed" },
  { label: "Canceladas", value: "cancelled" },
];

export default function DeliveriesPage() {
  useDeliveriesRealtime();

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = useDeliveries({
    status: activeFilter,
    search: search || undefined,
    companyId: companyFilter || undefined,
    driverId: driverFilter || undefined,
    page,
    pageSize,
  });

  const { data: companies } = useCompanies();
  const { data: drivers } = useDrivers();
  const updateStatus = useUpdateDeliveryStatus();
  const reassign = useReassignDelivery();

  const deliveries = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminLayout title="Entregas" subtitle="Gestão de corridas e ordens de serviço">
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 shadow-card flex-1 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por cliente ou endereço..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")}><XIcon className="h-3.5 w-3.5 text-muted-foreground" /></button>
            )}
          </div>

          {/* Company filter */}
          <select
            value={companyFilter}
            onChange={(e) => { setCompanyFilter(e.target.value); setPage(0); }}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">Todas empresas</option>
            {(companies ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Driver filter */}
          <select
            value={driverFilter}
            onChange={(e) => { setDriverFilter(e.target.value); setPage(0); }}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">Todos entregadores</option>
            {(drivers ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.profiles?.full_name || "—"}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setActiveFilter(f.value); setPage(0); }}
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
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4">Cliente</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4 hidden md:table-cell">Empresa</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4 hidden lg:table-cell">Endereço</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4 hidden sm:table-cell">Valor</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4 hidden lg:table-cell">Data</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-medium text-foreground">{delivery.customer_name}</p>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <p className="text-sm text-foreground">{(delivery as any).companies?.name || "—"}</p>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">{delivery.address}</p>
                      </td>
                      <td className="p-4">
                        <DeliveryStatusBadge status={delivery.status} />
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="text-sm font-semibold text-foreground">R$ {Number(delivery.value).toFixed(2)}</span>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(delivery.created_at), "dd/MM HH:mm")}
                        </span>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-muted transition-colors">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {delivery.status === "pending" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: delivery.id, status: "accepted" })}>
                                Aceitar
                              </DropdownMenuItem>
                            )}
                            {delivery.status === "accepted" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: delivery.id, status: "collecting" })}>
                                Iniciar Coleta
                              </DropdownMenuItem>
                            )}
                            {delivery.status === "collecting" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: delivery.id, status: "in_route" })}>
                                Em Rota
                              </DropdownMenuItem>
                            )}
                            {delivery.status === "in_route" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: delivery.id, status: "completed" })}>
                                Finalizar
                              </DropdownMenuItem>
                            )}
                            {!["completed", "cancelled"].includes(delivery.status) && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => updateStatus.mutate({ id: delivery.id, status: "cancelled" })}
                              >
                                Cancelar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {deliveries.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-muted-foreground text-sm">Nenhuma entrega encontrada</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
