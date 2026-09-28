import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingBag, Search, Filter, Loader2, Calendar, 
  Store, User, Clock, DollarSign, CheckCircle2, XCircle, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const isGenericCustomerName = (val: string | null | undefined): boolean => {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === "" ||
    s === "cliente marketplace" ||
    s === "consumidor" ||
    s === "cliente" ||
    s === "usuário" ||
    s === "usuario" ||
    s === "visitante" ||
    s === "null" ||
    s === "undefined" ||
    s === "não informado" ||
    s === "nao informado"
  );
};

export const getOrderCustomerName = (order: any): string => {
  if (!order) return "Cliente";

  // 1. Tenta nome gravado diretamente no pedido (customer_name)
  if (order.customer_name && !isGenericCustomerName(order.customer_name)) {
    return order.customer_name.trim();
  }

  // 2. Tenta nome do cadastro de clientes (customers.name) se não for genérico
  if (order.customers?.name && !isGenericCustomerName(order.customers.name)) {
    return order.customers.name.trim();
  }

  // 3. Tenta nome do perfil do usuário vinculado (profiles)
  if (order.profile?.full_name && !isGenericCustomerName(order.profile.full_name)) {
    return order.profile.full_name.trim();
  }
  if (order.profiles?.full_name && !isGenericCustomerName(order.profiles.full_name)) {
    return order.profiles.full_name.trim();
  }

  // 4. Se tiver customer_name mesmo sendo genérico ou customers.name
  if (order.customer_name && order.customer_name.trim() && !isGenericCustomerName(order.customer_name)) {
    return order.customer_name.trim();
  }
  if (order.customers?.name && order.customers.name.trim() && !isGenericCustomerName(order.customers.name)) {
    return order.customers.name.trim();
  }
  if (order.customer_name && order.customer_name.trim()) {
    return order.customer_name.trim();
  }
  if (order.customers?.name && order.customers.name.trim()) {
    return order.customers.name.trim();
  }

  return "Cliente";
};

export const getOrderCustomerPhone = (order: any): string => {
  if (!order) return "Não informado";
  const candidates = [
    order.customer_phone,
    order.customers?.phone,
    order.profile?.phone,
    order.profiles?.phone,
    order.deliveries?.customer_phone,
  ];
  for (const c of candidates) {
    if (c && typeof c === "string") {
      const clean = c.trim();
      if (clean && clean !== "Não informado" && clean !== "nao informado" && clean !== "null") {
        return clean;
      }
    }
  }
  return "Não informado";
};

export default function StoreSalesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-store-sales", dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          companies (name),
          customers (*)
        `)
        .order("created_at", { ascending: false });

      if (dateFilter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte("created_at", today.toISOString());
      } else if (dateFilter === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte("created_at", yesterday.toISOString()).lt("created_at", today.toISOString());
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        query = query.gte("created_at", weekAgo.toISOString());
      } else if (dateFilter === "month") {
        const firstDay = new Date();
        firstDay.setDate(1);
        firstDay.setHours(0, 0, 0, 0);
        query = query.gte("created_at", firstDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const ordersList = data || [];
      const userIds = [...new Set(ordersList.map((o: any) => o.user_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        try {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, phone, document")
            .in("id", userIds);
          if (profs) {
            profs.forEach((p: any) => {
              profilesMap[p.id] = p;
            });
          }
        } catch (e) {
          console.error("Erro ao enriquecer perfis dos pedidos:", e);
        }
      }

      return ordersList.map((order: any) => ({
        ...order,
        profile: profilesMap[order.user_id] || null,
      }));
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      // Status Filter
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      
      // Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const storeName = order.companies?.name?.toLowerCase() || "";
        const customerName = getOrderCustomerName(order).toLowerCase();
        const customerPhone = getOrderCustomerPhone(order).toLowerCase();
        const idStr = order.id.toLowerCase();
        if (!storeName.includes(term) && !customerName.includes(term) && !customerPhone.includes(term) && !idStr.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    if (!filteredOrders) return { total: 0, revenue: 0, delivered: 0 };
    return {
      total: filteredOrders.length,
      revenue: filteredOrders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0),
      delivered: filteredOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length,
    };
  }, [filteredOrders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit"><Clock className="w-3.5 h-3.5" /> Pendente</span>;
      case "preparing":
      case "ready":
      case "in_route":
      case "in_transit":
        return <span className="bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Em Andamento</span>;
      case "delivered":
      case "completed":
        return <span className="bg-success/10 text-success px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Entregue</span>;
      case "cancelled":
        return <span className="bg-destructive/10 text-destructive px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 w-fit"><XCircle className="w-3.5 h-3.5" /> Cancelado</span>;
      default:
        return <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-lg text-xs font-bold w-fit">{status}</span>;
    }
  };

  const { data: profile } = useQuery({
    queryKey: ["admin-store-sales-profile", selectedOrder?.user_id],
    queryFn: async () => {
      if (!selectedOrder?.user_id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", selectedOrder.user_id)
        .maybeSingle();
      if (error) {
        console.error("Erro ao buscar profile", error);
        return null;
      }
      return data;
    },
    enabled: !!selectedOrder?.user_id,
  });

  return (
    <AdminLayout title="Vendas das Lojas" subtitle="Acompanhe os pedidos do marketplace em tempo real">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Total de Pedidos</p>
          </div>
          <h3 className="text-3xl font-black text-foreground">{stats.total}</h3>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Pedidos Entregues</p>
          </div>
          <h3 className="text-3xl font-black text-foreground">{stats.delivered}</h3>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Receita Bruta (Entregues)</p>
          </div>
          <h3 className="text-3xl font-black text-foreground">
            {stats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por Loja, Cliente ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary appearance-none outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="preparing">Em Andamento</option>
              <option value="delivered">Entregues</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary appearance-none outline-none"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Este Mês</option>
              <option value="all">Todo o Período</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground">Pedido / Data</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Loja (Vendedor)</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Cliente</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">Status</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-right">Valor Total</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Carregando vendas...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Nenhum pedido encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">#{order.id.split('-')[0].toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-primary" />
                        <span className="font-bold">{order.companies?.name || 'Loja Desconhecida'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{getOrderCustomerName(order)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-foreground">
                        {(order.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)} title="Ver Detalhes do Cliente">
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido e Cliente</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 pt-4">
              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <h4 className="font-bold text-foreground mb-3 border-b border-border pb-2">Informações do Cliente</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold text-muted-foreground">ID do Cliente:</span> {selectedOrder.customer_id || selectedOrder.user_id || 'Não informado'}</p>
                  <p><span className="font-semibold text-muted-foreground">Nome:</span> {getOrderCustomerName(selectedOrder)}</p>
                  <p><span className="font-semibold text-muted-foreground">Telefone:</span> {getOrderCustomerPhone(selectedOrder)}</p>
                  <p><span className="font-semibold text-muted-foreground">CPF/Documento:</span> {selectedOrder.customers?.cpf || selectedOrder.profile?.document || profile?.document || 'Não informado'}</p>
                </div>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <h4 className="font-bold text-foreground mb-3 border-b border-border pb-2">Endereço de Entrega</h4>
                <div className="space-y-2 text-sm">
                  {selectedOrder.delivery_address || selectedOrder.deliveries?.delivery_address || selectedOrder.deliveries?.address ? (
                    <p className="font-medium text-foreground">
                      {selectedOrder.delivery_address || selectedOrder.deliveries?.delivery_address || selectedOrder.deliveries?.address}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Este pedido não possui endereço de entrega registrado na tabela.
                    </p>
                  )}
                  {selectedOrder.deliveries?.pickup_address && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="font-semibold text-muted-foreground mb-1">Endereço de Coleta (Loja):</p>
                      <p className="font-medium text-foreground">{selectedOrder.deliveries.pickup_address}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <h4 className="font-bold text-foreground mb-3 border-b border-border pb-2">Detalhes Adicionais</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold text-muted-foreground">Método de Pagamento:</span> {selectedOrder.payment_method || 'Não informado'}</p>
                  <p><span className="font-semibold text-muted-foreground">Observações:</span> {selectedOrder.notes || selectedOrder.deliveries?.notes || 'Nenhuma'}</p>
                </div>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border">
                <h4 className="font-bold text-foreground mb-3 border-b border-border pb-2">Resumo</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold text-muted-foreground">Pedido ID:</span> {selectedOrder.id}</p>
                  <p><span className="font-semibold text-muted-foreground">Data:</span> {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}</p>
                  <p><span className="font-semibold text-muted-foreground">Total:</span> {(selectedOrder.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
