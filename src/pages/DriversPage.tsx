import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDrivers } from "@/services/drivers";
import { EditDriverDialog } from "@/components/admin/EditDriverDialog";
import { CreateDriverDialog } from "@/components/admin/CreateDriverDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Power, Trash2, UserCheck, UserX, Edit2, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { GenerateInviteDialog } from "@/components/admin/GenerateInviteDialog";
import { RefreshCw } from "lucide-react";

export default function DriversPage() {
  const { data: drivers, isLoading } = useDrivers();
  const qc = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const syncMissingDrivers = async () => {
    setSyncing(true);
    toast.loading("Sincronizando cadastros...", { id: "sync" });
    try {
      // Get all drivers from user_roles
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "driver");
      if (!roles || roles.length === 0) {
        toast.success("Nenhum entregador para sincronizar", { id: "sync" });
        return;
      }

      // Get existing drivers
      const { data: existing } = await supabase.from("delivery_drivers").select("user_id");
      const existingIds = new Set(existing?.map(d => d.user_id) || []);

      const missingIds = roles.filter(r => !existingIds.has(r.user_id)).map(r => r.user_id);
      
      if (missingIds.length === 0) {
        toast.success("Todos os cadastros já estão sincronizados!", { id: "sync" });
        return;
      }

      // Get profiles for missing ids
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", missingIds);
      
      if (profiles && profiles.length > 0) {
        const inserts = profiles.map(p => ({
          user_id: p.user_id,
          full_name: p.full_name || "Entregador Sincronizado",
          phone: p.phone || null,
          vehicle_type: "motorcycle" as const,
          commission_rate: 15,
          status: "active" as const
        }));

        const { error } = await supabase.from("delivery_drivers").insert(inserts);
        if (error) throw error;
      }
      
      qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success(`${missingIds.length} entregadores sincronizados com sucesso!`, { id: "sync" });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao sincronizar: " + err.message, { id: "sync" });
    } finally {
      setSyncing(false);
    }
  };

  const toggleOnline = async (id: string, isOnline: boolean) => {
    const { error } = await supabase
      .from("delivery_drivers")
      .update({ is_online: !isOnline } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao alterar status online: " + error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["drivers"] });
    toast.success(isOnline ? "Entregador ficou offline" : "Entregador ficou online");
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    const { error } = await supabase
      .from("delivery_drivers")
      .update({ status: newStatus } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao alterar status: " + error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["drivers"] });
    toast.success(newStatus === "active" ? "Entregador ativado" : "Entregador suspenso");
  };

  const deleteDriver = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este entregador? Todos os dados serão removidos permanentemente!")) return;
    
    toast.loading("Excluindo entregador...", { id: "delete-driver-toast" });
    
    const { error } = await (supabase as any).rpc("safe_delete_driver", { p_driver_id: id });
    
    if (error) {
      console.error("Erro ao excluir entregador:", error);
      toast.error("Erro ao excluir: " + error.message, { id: "delete-driver-toast" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["drivers"] });
    toast.success("Entregador excluído com sucesso!", { id: "delete-driver-toast" });
  };

  const vehicleLabel: Record<string, string> = {
    motorcycle: "🏍️ Moto", bicycle: "🚲 Bicicleta", car: "🚗 Carro", van: "🚐 Van", truck: "🚛 Caminhão",
  };

  const filteredDrivers = (drivers ?? []).filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.full_name?.toLowerCase().includes(term) ||
      d.phone?.toLowerCase().includes(term) ||
      d.vehicle_plate?.toLowerCase().includes(term)
    );
  });

  return (
    <AdminLayout title="Entregadores" subtitle="Gerenciamento de motoboys">
      <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-card/50 p-4 rounded-2xl border border-border/50">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Gerenciamento</h2>
          <p className="text-xs text-muted-foreground">Convide novos parceiros ou cadastre manualmente</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={syncMissingDrivers} disabled={syncing} className="hidden sm:flex">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Cadastros
          </Button>
          <GenerateInviteDialog fixedRole="driver" triggerLabel="Gerar Link de Convite" />
          <CreateDriverDialog 
            open={showNewForm} 
            onOpenChange={setShowNewForm} 
          />
          <Button onClick={() => setShowNewForm(true)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Novo Entregador
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card rounded-xl px-3 py-2 border border-border/50 mb-4 max-w-md shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou placa..."
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

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entregador</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Veículo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Placa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comissão</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rating</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Online</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filteredDrivers.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum entregador encontrado</td></tr>
              ) : (
                filteredDrivers.map((d) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {d.avatar_url ? <img src={d.avatar_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-primary">{(d.full_name || "?")[0]}</span>}
                        </div>
                        <span className="font-medium">{d.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{vehicleLabel[d.vehicle_type || "motorcycle"] || d.vehicle_type}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.vehicle_plate || "—"}</td>
                    <td className="px-4 py-3">{d.phone || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-primary">R$ {Number(d.commission_rate ?? 0.40).toFixed(2).replace('.', ',')}</td>
                    <td className="px-4 py-3">⭐ {Number(d.rating || 0).toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${d.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {d.status === "active" ? "Ativo" : d.status === "suspended" ? "Suspenso" : d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${d.is_online ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        <span className={`w-2 h-2 rounded-full ${d.is_online ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                        {d.is_online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDriver(d)}>
                            <Edit2 className="h-4 w-4 mr-2" />Editar Informações
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleOnline(d.id, !!d.is_online)}>
                            <Power className="h-4 w-4 mr-2" />{d.is_online ? "Colocar Offline" : "Colocar Online"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(d.id, d.status || "active")}>
                            {d.status === "active" ? <><UserX className="h-4 w-4 mr-2" />Suspender</> : <><UserCheck className="h-4 w-4 mr-2" />Ativar</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteDriver(d.id)}>
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
      {editingDriver && (
        <EditDriverDialog
          driver={editingDriver}
          open={!!editingDriver}
          onOpenChange={(open) => !open && setEditingDriver(null)}
        />
      )}
      </>
    </AdminLayout>
  );
}

