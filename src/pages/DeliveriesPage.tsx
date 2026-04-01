import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DeliveryStatusBadge } from "@/components/admin/DeliveryStatusBadge";
import { useDeliveries, useUpdateDeliveryStatus, useReassignDelivery, type DeliveryWithRelations } from "@/services/deliveries";
import { useCompanies } from "@/services/companies";
import { useDrivers } from "@/services/drivers";
import { useDeliveriesRealtime } from "@/services/realtime";
import { Search, Filter, Eye, MoreHorizontal, X as XIcon, ChevronLeft, ChevronRight, Loader2, Printer, UserCheck, Package } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [detailDelivery, setDetailDelivery] = useState<DeliveryWithRelations | null>(null);
  const [reassignDelivery, setReassignDelivery] = useState<DeliveryWithRelations | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");

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
  const reassignMut = useReassignDelivery();

  const deliveries = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleReassign = async () => {
    if (!reassignDelivery) return;
    try {
      await reassignMut.mutateAsync({ id: reassignDelivery.id, driverId: selectedDriverId || null });
      toast({ title: "Entregador reatribuído!" });
      setReassignDelivery(null);
      setSelectedDriverId("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handlePrint = (delivery: DeliveryWithRelations) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>OS #${delivery.id.slice(0, 8)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 13px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .label { color: #666; font-size: 11px; text-transform: uppercase; margin-top: 12px; }
        .value { font-weight: bold; margin-bottom: 8px; }
        hr { border: none; border-top: 1px dashed #ccc; margin: 16px 0; }
        .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; }
      </style></head><body>
        <h1>É Pra Já Delivery</h1>
        <p style="color:#666;margin-top:0">Ordem de Serviço</p>
        <hr/>
        <div class="label">OS</div>
        <div class="value">#${delivery.id.slice(0, 8).toUpperCase()}</div>
        <div class="label">Cliente</div>
        <div class="value">${delivery.customer_name}</div>
        <div class="label">Endereço</div>
        <div class="value">${delivery.address}</div>
        <div class="label">Empresa</div>
        <div class="value">${(delivery as any).companies?.name || "—"}</div>
        <div class="label">Status</div>
        <div class="value">${delivery.status}</div>
        <div class="label">Valor</div>
        <div class="value">R$ ${Number(delivery.value).toFixed(2)}</div>
        <div class="label">Comissão</div>
        <div class="value">R$ ${Number(delivery.commission).toFixed(2)}</div>
        <div class="label">Data</div>
        <div class="value">${format(new Date(delivery.created_at), "dd/MM/yyyy HH:mm")}</div>
        ${delivery.notes ? `<div class="label">Observações</div><div class="value">${delivery.notes}</div>` : ""}
        <hr/>
        <div class="footer">Impresso em ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailDelivery(delivery)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-muted transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailDelivery(delivery)}>
                                <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(delivery)}>
                                <Printer className="h-4 w-4 mr-2" /> Imprimir OS
                              </DropdownMenuItem>
                              {!["completed", "cancelled"].includes(delivery.status) && (
                                <DropdownMenuItem onClick={() => { setReassignDelivery(delivery); setSelectedDriverId(delivery.driver_id || ""); }}>
                                  <UserCheck className="h-4 w-4 mr-2" /> Reatribuir
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
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
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => updateStatus.mutate({ id: delivery.id, status: "cancelled" })}
                                  >
                                    Cancelar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {deliveries.length === 0 && (
              <div className="p-12 text-center">
                <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma entrega encontrada</p>
              </div>
            )}

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

      {/* Detail Modal */}
      <Dialog open={!!detailDelivery} onOpenChange={(open) => !open && setDetailDelivery(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              OS #{detailDelivery?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {detailDelivery && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <DeliveryStatusBadge status={detailDelivery.status} />
                <button
                  onClick={() => handlePrint(detailDelivery)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  <Printer className="h-4 w-4" /> Imprimir
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Cliente" value={detailDelivery.customer_name} />
                <DetailField label="Empresa" value={(detailDelivery as any).companies?.name || "—"} />
                <DetailField label="Valor" value={`R$ ${Number(detailDelivery.value).toFixed(2)}`} />
                <DetailField label="Comissão" value={`R$ ${Number(detailDelivery.commission).toFixed(2)}`} />
                <DetailField label="Região" value={(detailDelivery as any).regions?.name || "—"} />
                <DetailField label="Criado em" value={format(new Date(detailDelivery.created_at), "dd/MM/yyyy HH:mm")} />
              </div>

              <DetailField label="Endereço" value={detailDelivery.address} />
              
              {detailDelivery.notes && (
                <DetailField label="Observações" value={detailDelivery.notes} />
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                {detailDelivery.accepted_at && <span>Aceita: {format(new Date(detailDelivery.accepted_at), "dd/MM HH:mm")}</span>}
                {detailDelivery.collected_at && <span>Coletada: {format(new Date(detailDelivery.collected_at), "dd/MM HH:mm")}</span>}
                {detailDelivery.completed_at && <span>Finalizada: {format(new Date(detailDelivery.completed_at), "dd/MM HH:mm")}</span>}
                {detailDelivery.cancelled_at && <span>Cancelada: {format(new Date(detailDelivery.cancelled_at), "dd/MM HH:mm")}</span>}
              </div>

              {!["completed", "cancelled"].includes(detailDelivery.status) && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => { setReassignDelivery(detailDelivery); setSelectedDriverId(detailDelivery.driver_id || ""); setDetailDelivery(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80"
                  >
                    <UserCheck className="h-4 w-4" /> Reatribuir
                  </button>
                  <button
                    onClick={() => { updateStatus.mutate({ id: detailDelivery.id, status: "cancelled" }); setDetailDelivery(null); }}
                    className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reassign Modal */}
      <Dialog open={!!reassignDelivery} onOpenChange={(open) => !open && setReassignDelivery(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reatribuir Entregador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Selecione o entregador para a OS #{reassignDelivery?.id.slice(0, 8).toUpperCase()}
            </p>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
            >
              <option value="">Sem entregador</option>
              {(drivers ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.profiles?.full_name || "—"} {d.is_online ? "● Online" : ""}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setReassignDelivery(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleReassign}
                disabled={reassignMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reassignMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
