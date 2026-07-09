import { AdminLayout } from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Edit2, Trash2, Settings, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function PricingTablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Table Dialog
  const [isEditTableOpen, setIsEditTableOpen] = useState(false);
  const [currentTable, setCurrentTable] = useState<any>(null);
  const [tableName, setTableName] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Rules Dialog
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [activeTableId, setActiveTableId] = useState("");
  const [rules, setRules] = useState<any[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);

  // New Rule Form
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [baseValue, setBaseValue] = useState("");
  const [returnValue, setReturnValue] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: t }, { data: r }, { data: c }] = await Promise.all([
      supabase.from("pricing_tables").select("*").order("created_at"),
      supabase.from("regions").select("*").order("name"),
      supabase.from("companies").select("id, name, pricing_table_id, is_active").order("name")
    ]);
    if (t) setTables(t);
    if (r) setRegions(r);
    if (c) setCompanies(c);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveTable = async () => {
    if (!tableName.trim()) return toast.error("Nome é obrigatório");
    const payload = { name: tableName, is_default: false };
    
    let tableId = currentTable?.id;
    if (currentTable) {
      await supabase.from("pricing_tables").update(payload).eq("id", currentTable.id);
      toast.success("Tabela atualizada");
    } else {
      const { data, error } = await supabase.from("pricing_tables").insert(payload).select().single();
      if (error) {
        return toast.error("Erro ao criar tabela");
      }
      tableId = data.id;
      toast.success("Tabela criada");
    }

    if (tableId) {
      // Find companies that were linked
      const oldLinked = companies.filter(c => c.pricing_table_id === tableId).map(c => c.id);
      const toLink = selectedCompanies.filter(id => !oldLinked.includes(id));
      const toUnlink = oldLinked.filter(id => !selectedCompanies.includes(id));

      if (toLink.length > 0) {
        await supabase.from("companies").update({ pricing_table_id: tableId }).in("id", toLink);
      }
      if (toUnlink.length > 0) {
        await supabase.from("companies").update({ pricing_table_id: null }).in("id", toUnlink);
      }
    }

    setIsEditTableOpen(false);
    fetchData();
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm("Remover esta tabela?")) return;
    await supabase.from("pricing_tables").delete().eq("id", id);
    fetchData();
  };

  const openEditTable = (table?: any) => {
    setSearchQuery("");
    if (table) {
      setCurrentTable(table);
      setTableName(table.name);
      const linked = companies.filter(c => c.pricing_table_id === table.id).map(c => c.id);
      setSelectedCompanies(linked);
    } else {
      setCurrentTable(null);
      setTableName("");
      setSelectedCompanies([]);
    }
    setIsEditTableOpen(true);
  };

  const openRules = async (tableId: string) => {
    setActiveTableId(tableId);
    setIsRulesOpen(true);
    fetchRules(tableId);
  };

  const fetchRules = async (tableId: string) => {
    setIsLoadingRules(true);
    const { data } = await supabase.from("pricing_rules").select("*").eq("pricing_table_id", tableId);
    if (data) setRules(data);
    setIsLoadingRules(false);
  };

  const handleSaveRule = async () => {
    if (regions.length === 0) return toast.error("Você precisa cadastrar Regiões no sistema primeiro.");
    if (!originId || !destinationId || !baseValue) return toast.error("Preencha origem, destino e valor base");
    
    const payload = {
      pricing_table_id: activeTableId,
      origin_region_id: originId,
      destination_region_id: destinationId,
      base_value: parseFloat(baseValue),
      return_value: parseFloat(returnValue || "0")
    };

    const existing = rules.find(r => r.origin_region_id === originId && r.destination_region_id === destinationId);
    
    if (existing) {
      await supabase.from("pricing_rules").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("pricing_rules").insert(payload);
    }
    toast.success("Regra salva");
    setOriginId("");
    setDestinationId("");
    setBaseValue("");
    setReturnValue("");
    fetchRules(activeTableId);
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Remover regra?")) return;
    await supabase.from("pricing_rules").delete().eq("id", id);
    fetchRules(activeTableId);
  };

  return (
    <AdminLayout title="Tabelas de Preço" subtitle="Matriz de precificação de Origem x Destino">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Tabelas Disponíveis</h2>
          <Button onClick={() => openEditTable()}><Plus className="w-4 h-4 mr-2" /> Nova Tabela</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map(table => (
              <Card key={table.id} className="p-6 flex flex-col justify-between hover:border-primary transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {table.name}
                      {table.is_default && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Padrão</span>}
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditTable(table)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTable(table.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">Configure a matriz de preços entre bairros e regiões para as empresas que usam esta tabela.</p>
                </div>
                <Button className="w-full" onClick={() => openRules(table.id)} variant="secondary">
                  <Settings className="w-4 h-4 mr-2" /> Gerenciar Regras ({rules.length})
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Table Dialog */}
      <Dialog open={isEditTableOpen} onOpenChange={setIsEditTableOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{currentTable ? "Editar Tabela" : "Nova Tabela"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Nome da Tabela</Label>
              <Input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="Ex: Tabela VIP" />
            </div>
            <div>
              <Label className="mb-2 block">Empresas (Selecione quais lojas usarão esta tabela)</Label>
              <Input 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Buscar empresa..." 
                className="mb-3"
              />
              <div className="border border-border rounded-md max-h-[300px] overflow-y-auto p-2 bg-muted/10 space-y-2">
                {companies.filter(c => c.is_active !== false && c.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">Nenhuma empresa encontrada.</p>
                ) : (
                  companies.filter(c => c.is_active !== false && c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(comp => (
                    <div key={comp.id} className="flex items-center space-x-2 p-1 hover:bg-muted/30 rounded">
                      <Checkbox 
                        id={`comp-${comp.id}`} 
                        checked={selectedCompanies.includes(comp.id)} 
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCompanies(prev => [...prev, comp.id]);
                          } else {
                            setSelectedCompanies(prev => prev.filter(id => id !== comp.id));
                          }
                        }} 
                      />
                      <Label htmlFor={`comp-${comp.id}`} className="cursor-pointer flex-1">{comp.name}</Label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditTableOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveTable}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rules Dialog */}
      <Dialog open={isRulesOpen} onOpenChange={setIsRulesOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Matriz de Valores: Origem x Destino</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 pt-4">
            
            {/* New Rule Form */}
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <h4 className="font-semibold mb-3">Adicionar / Atualizar Regra</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-xs">Origem</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={originId} onChange={e => setOriginId(e.target.value)}>
                    <option className="bg-background text-foreground" value="">Selecione...</option>
                    {regions.map(r => <option className="bg-background text-foreground" key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-xs">Destino</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={destinationId} onChange={e => setDestinationId(e.target.value)}>
                    <option className="bg-background text-foreground" value="">Selecione...</option>
                    {regions.map(r => <option className="bg-background text-foreground" key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Valor Base (R$)</Label>
                  <Input type="number" step="0.01" value={baseValue} onChange={e => setBaseValue(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-xs">Taxa Retorno (R$)</Label>
                  <Input type="number" step="0.01" value={returnValue} onChange={e => setReturnValue(e.target.value)} placeholder="0.00" />
                </div>
                <Button onClick={handleSaveRule} className="w-full">Adicionar</Button>
              </div>
            </div>

            {/* List of Rules */}
            <div>
              <h4 className="font-semibold mb-3">Regras Definidas</h4>
              {isLoadingRules ? <p className="text-sm text-muted-foreground">Carregando...</p> : rules.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma regra definida ainda.</p> : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left">Trajeto</th>
                        <th className="p-3 text-right">Valor Entrega</th>
                        <th className="p-3 text-right">Valor Retorno</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map(r => {
                        const origin = regions.find(reg => reg.id === r.origin_region_id)?.name || "Desconhecido";
                        const dest = regions.find(reg => reg.id === r.destination_region_id)?.name || "Desconhecido";
                        return (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 font-medium flex items-center gap-2">
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{origin}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{dest}</span>
                            </td>
                            <td className="p-3 text-right font-bold text-success">R$ {Number(r.base_value).toFixed(2)}</td>
                            <td className="p-3 text-right text-muted-foreground">R$ {Number(r.return_value).toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRule(r.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
