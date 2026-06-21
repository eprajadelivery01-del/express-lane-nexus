import { AdminLayout } from "@/components/admin/AdminLayout";
import { useCompanies } from "@/services/companies";
import { EditCompanyDialog } from "@/components/admin/EditCompanyDialog";
import { CreateCompanyDialog } from "@/components/admin/CreateCompanyDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Power, Trash2, Edit2, Store, Search, X } from "lucide-react";
import { useState } from "react";
import { GenerateInviteDialog } from "@/components/admin/GenerateInviteDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCitiesWithRegions } from "@/services/regions";

export default function CompaniesPage() {
  const { data: companies, isLoading, error } = useCompanies();
  const qc = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const { data: dbCities } = useCitiesWithRegions();
  const cities = dbCities || [];

  if (error) {
    console.error("ERRO DO SUPABASE:", error);
    toast.error("Erro ao carregar empresas: " + (error as any).message);
  }

  const toggleActive = async (id: string, active: boolean) => {
    const newActive = !active;
    await supabase.from("companies").update({ active: newActive, is_active: newActive }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["companies"] });
    toast.success(newActive ? "Empresa ativada para aceitar pedidos" : "Empresa desativada (fechada)");
  };

  const toggleShowInMarketplace = async (id: string, currentShow: boolean) => {
    const newShow = !currentShow;
    await supabase.from("companies").update({ show_in_marketplace: newShow }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["companies"] });
    toast.success(newShow ? "Empresa será exibida no Marketplace" : "Empresa oculta do Marketplace");
  };

  const deleteCompany = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa? Esta ação também removerá permanentemente todos os produtos, cupons, pedidos, entregas e históricos de chat associados e não poderá ser desfeita!")) return;
    
    try {
      toast.loading("Excluindo registros associados...", { id: "delete-company-toast" });

      // 1. Clean up Deliveries and their dependencies
      const { data: companyDeliveries } = await supabase.from("deliveries").select("id").eq("company_id", id);
      const deliveryIds = companyDeliveries?.map(d => d.id) || [];

      if (deliveryIds.length > 0) {
        // Delete dependent records for these deliveries
        await supabase.from("delivery_ratings").delete().in("delivery_id", deliveryIds);
        await supabase.from("driver_earnings").delete().in("delivery_id", deliveryIds);
        await supabase.from("driver_location_history").delete().in("delivery_id", deliveryIds);
        await supabase.from("occurrences").delete().in("delivery_id", deliveryIds);
        await supabase.from("delivery_occurrences").delete().in("delivery_id", deliveryIds);
        // Delete the deliveries
        await supabase.from("deliveries").delete().in("id", deliveryIds);
      }

      // 2. Clean up Orders and their dependencies
      const { data: companyOrders } = await supabase.from("orders").select("id").eq("company_id", id);
      const orderIds = companyOrders?.map(o => o.id) || [];

      if (orderIds.length > 0) {
        // Delete payments referencing these orders
        await supabase.from("payments").delete().in("order_id", orderIds);
        // Delete user coupons referencing these orders
        await supabase.from("user_coupons").delete().in("order_id", orderIds);
        
        // Clean up messages and conversations related to these orders
        const { data: orderConvs } = await supabase.from("conversations").select("id").in("order_id", orderIds);
        const convIds = orderConvs?.map(c => c.id) || [];
        if (convIds.length > 0) {
          await supabase.from("messages").delete().in("conversation_id", convIds);
          await supabase.from("conversations").delete().in("id", convIds);
        }

        // Delete reviews referencing these orders
        await supabase.from("reviews").delete().in("order_id", orderIds);
        // Clean up order items referencing these orders
        await supabase.from("order_items").delete().in("order_id", orderIds);
        // Finally delete orders
        await supabase.from("orders").delete().in("id", orderIds);
      }

      // 3. Clean up Products and their options
      const { data: companyProducts } = await supabase.from("products").select("id").eq("company_id", id);
      const productIds = companyProducts?.map(p => p.id) || [];
      if (productIds.length > 0) {
        // Clean up order items referencing these products
        await supabase.from("order_items").delete().in("product_id", productIds);
        
        // Get option groups for these products
        const { data: optionGroups } = await supabase.from("product_option_groups").select("id").in("product_id", productIds);
        const groupIds = optionGroups?.map(g => g.id) || [];
        if (groupIds.length > 0) {
          // Delete product options first
          await supabase.from("product_options").delete().in("group_id", groupIds);
          // Delete option groups
          await supabase.from("product_option_groups").delete().in("product_id", productIds);
        }
        // Finally delete products
        await supabase.from("products").delete().in("id", productIds);
      }

      // 4. Clean up Coupons
      const { data: companyCoupons } = await supabase.from("coupons").select("id").eq("company_id", id);
      const couponIds = companyCoupons?.map(c => c.id) || [];
      if (couponIds.length > 0) {
        // Delete user coupons referencing these coupons
        await supabase.from("user_coupons").delete().in("coupon_id", couponIds);
        // Delete coupons
        await supabase.from("coupons").delete().in("id", couponIds);
      }

      // 5. Clean up Chat Sessions
      const { data: companySessions } = await supabase.from("chat_sessions").select("id").eq("company_id", id);
      const sessionIds = companySessions?.map(s => s.id) || [];
      if (sessionIds.length > 0) {
        // Delete chat message logs
        await supabase.from("chat_message_logs").delete().in("session_id", sessionIds);
        // Delete chat sessions
        await supabase.from("chat_sessions").delete().in("id", sessionIds);
      }

      // 6. Dissociate Drivers & Reviews directly linked to the company
      await supabase.from("delivery_drivers").update({ company_id: null }).eq("company_id", id);
      await supabase.from("reviews").delete().eq("company_id", id);

      // 7. Clean up any remaining deliveries or orders directly referencing company_id just in case
      await supabase.from("deliveries").delete().eq("company_id", id);
      await supabase.from("orders").delete().eq("company_id", id);
      await supabase.from("products").delete().eq("company_id", id);
      await supabase.from("coupons").delete().eq("company_id", id);

      // 8. Finally, delete the company record
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa excluída com sucesso!", { id: "delete-company-toast" });
    } catch (err: any) {
      console.error("Erro ao excluir empresa:", err);
      toast.error("Erro ao excluir empresa: " + (err.message || "Erro de integridade no banco de dados."), { id: "delete-company-toast" });
    }
  };

  const filteredCompanies = (companies ?? []).filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = c.name?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.address?.toLowerCase().includes(term);
    const matchesCity = selectedCity === "all" || c.city_id === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <AdminLayout title="Empresas" subtitle="Gerenciamento de empresas parceiras">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-card/50 p-4 rounded-2xl border border-border/50">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Gerenciamento</h2>
          <p className="text-xs text-muted-foreground">Convide novas empresas ou cadastre manualmente</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <GenerateInviteDialog fixedRole="company" triggerLabel="Gerar Link de Convite" />
          <CreateCompanyDialog />
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card rounded-xl px-3 py-2 border border-border/50 mb-4 max-w-md shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone, email ou endereço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground font-medium"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")}>
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-48 bg-card border-border/50 shadow-sm font-semibold text-sm">
            <SelectValue placeholder="Todas as Cidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Cidades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Endereço</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comissão</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center font-bold text-red-500">ERRO DO BANCO: {(error as any).message}</td></tr>
              ) : filteredCompanies.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma empresa encontrada</td></tr>
              ) : (
                filteredCompanies.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                          {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-primary">{c.name[0]}</span>}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
                    <td className="px-4 py-3">{c.email || "—"}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{c.address || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{Number(c.commission_percentage ?? 10.00).toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <button 
                          onClick={() => toggleActive(c.id, !!c.active)}
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${c.active ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {c.active ? "Ativa (Aceita Pedidos)" : "Inativa"}
                        </button>
                        {c.show_in_marketplace === false && (
                          <span className="text-[10px] text-muted-foreground font-semibold">Oculta do Market</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCompany(c)}>
                            <Edit2 className="h-4 w-4 mr-2" />Editar Informações
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleShowInMarketplace(c.id, c.show_in_marketplace !== false)}>
                            <Store className="h-4 w-4 mr-2" />{c.show_in_marketplace !== false ? "Ocultar do Marketplace" : "Exibir no Marketplace"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteCompany(c.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {editingCompany && (
        <EditCompanyDialog
          company={editingCompany}
          open={!!editingCompany}
          onOpenChange={(open) => !open && setEditingCompany(null)}
        />
      )}
    </AdminLayout>
  );
}

