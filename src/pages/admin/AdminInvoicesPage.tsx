import { AdminLayout } from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Edit2, Trash2, FileText, CheckCircle, Clock, Send, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrintableInvoiceDialog } from "@/components/admin/PrintableInvoiceDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit/Create Invoice Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  
  // Print Dialog
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<any>(null);

  const [companyId, setCompanyId] = useState("");
  const [openCompanyCombobox, setOpenCompanyCombobox] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [deliveriesAmount, setDeliveriesAmount] = useState("0");
  const [subscriptionAmount, setSubscriptionAmount] = useState("0");
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");

  // Filters
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [hideZero, setHideZero] = useState(false);
  const [sortField, setSortField] = useState<"company" | "month" | "total">("total");
  const [sortAsc, setSortAsc] = useState(false);

  // Selection for sending
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: invs }, { data: comps }] = await Promise.all([
      supabase.from("merchant_invoices").select("*, companies(name)").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name")
    ]);
    if (invs) setInvoices(invs);
    if (comps) setCompanies(comps);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!companyId || !periodStart || !periodEnd) return toast.error("Preencha a loja e o período (data início e fim)");
    if (periodStart > periodEnd) return toast.error("A data de início deve ser anterior à data final");
    
    const dAmount = parseFloat(deliveriesAmount) || 0;
    const sAmount = parseFloat(subscriptionAmount) || 0;
    const tAmount = dAmount + sAmount;

    // Generate a readable reference label
    const refLabel = formatPeriodLabel(periodStart, periodEnd);

    const payload = { 
      company_id: companyId,
      reference_month: refLabel,
      period_start: periodStart,
      period_end: periodEnd,
      deliveries_amount: dAmount,
      subscription_amount: sAmount,
      total_amount: tAmount,
      status,
      notes
    } as any;
    
    if (currentInvoice) {
      const { error } = await supabase.from("merchant_invoices").update(payload).eq("id", currentInvoice.id);
      if (error) {
        toast.error("Erro ao atualizar fatura: " + error.message);
        console.error(error);
        return;
      }
      toast.success("Fatura atualizada");
    } else {
      const { error } = await supabase.from("merchant_invoices").insert(payload);
      if (error) {
        toast.error("Erro ao criar fatura: " + error.message);
        console.error(error);
        return;
      }
      toast.success("Fatura criada");
    }
    setIsDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta fatura?")) return;
    await supabase.from("merchant_invoices").delete().eq("id", id);
    fetchData();
  };

  const openEdit = (invoice?: any) => {
    if (invoice) {
      setCurrentInvoice(invoice);
      setCompanyId(invoice.company_id);
      setPeriodStart(invoice.period_start || "");
      setPeriodEnd(invoice.period_end || "");
      setDeliveriesAmount(invoice.deliveries_amount?.toString() || "0");
      setSubscriptionAmount(invoice.subscription_amount?.toString() || "0");
      setStatus(invoice.status || "pending");
      setNotes(invoice.notes || "");
    } else {
      setCurrentInvoice(null);
      setCompanyId("");
      
      // Default: first day of current month to today
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      setPeriodStart(`${y}-${m}-01`);
      setPeriodEnd(`${y}-${m}-${d}`);
      setDeliveriesAmount("0");
      setSubscriptionAmount("0");
      setStatus("pending");
      setNotes("");
    }
    setIsDialogOpen(true);
  };

  // Format period label for display
  const formatPeriodLabel = (start: string, end: string) => {
    if (!start || !end) return "";
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    return `${fmt(s)} - ${fmt(e)}`;
  };

  // Helper function to sum deliveries automatically for the selected period
  const autoCalculateDeliveries = async () => {
    if (!companyId || !periodStart || !periodEnd) {
      toast.error("Selecione a loja e defina o período para calcular.");
      return;
    }
    
    const startDate = new Date(periodStart + "T00:00:00").toISOString();
    const endDate = new Date(periodEnd + "T23:59:59").toISOString();

    setIsLoading(true);

    try {
      // Fetch company commission rate
      const { data: compData } = await supabase
        .from('companies')
        .select('commission_percentage')
        .eq('id', companyId)
        .single();
        
      const commissionRate = Number(compData?.commission_percentage || 0);

      // Fetch deliveries
      const { data: deliveriesData, error: delError } = await supabase
        .from('deliveries')
        .select('value')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (delError) throw delError;

      // Fetch marketplace orders
      const { data: ordersData, error: ordError } = await supabase
        .from('orders')
        .select('total, delivery_fee')
        .eq('company_id', companyId)
        .eq('status', 'delivered')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (ordError) throw ordError;

      const totalDeliveriesValue = (deliveriesData || []).reduce((sum, del) => sum + (Number(del.value) || 0), 0);
      
      // Comissões = soma do (total do pedido - delivery_fee) * (commissionRate / 100)
      const totalCommissionsValue = (ordersData || []).reduce((sum, ord) => {
        const orderValue = (Number(ord.total) || 0) - (Number(ord.delivery_fee) || 0);
        return sum + (orderValue * (commissionRate / 100));
      }, 0);

      const combinedTotal = totalDeliveriesValue + totalCommissionsValue;
      setDeliveriesAmount(combinedTotal.toFixed(2));
      toast.success(`Cálculo: Entregas R$ ${totalDeliveriesValue.toFixed(2)} + Comissões R$ ${totalCommissionsValue.toFixed(2)}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao calcular: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRetroactive = async () => {
    if (!confirm("Deseja gerar as faturas retroativas (Abril, Maio e Junho de 2026)? Isso vai varrer todos os pedidos e entregas das lojas. Pode demorar alguns segundos.")) return;
    setIsLoading(true);
    
    try {
      const monthsToProcess = [
        { month: 4, year: 2026, label: "04/2026" },
        { month: 5, year: 2026, label: "05/2026" },
        { month: 6, year: 2026, label: "06/2026" }
      ];

      let generatedCount = 0;

      for (const comp of companies) {
        const companyId = comp.id;
        
        // Fetch commission rate
        const { data: compData, error: compErr } = await supabase
          .from('companies')
          .select('commission_percentage')
          .eq('id', companyId)
          .single();
        
        if (compErr) console.error("Error fetching company", compErr);

        const commissionRate = Number(compData?.commission_percentage || 0);

        for (const period of monthsToProcess) {
          const startDate = new Date(period.year, period.month - 1, 1).toISOString();
          const endDate = new Date(period.year, period.month, 1).toISOString();

          // Fetch deliveries
          const { data: deliveriesData } = await supabase
            .from('deliveries')
            .select('value')
            .eq('company_id', companyId)
            .eq('status', 'completed')
            .gte('created_at', startDate)
            .lt('created_at', endDate);

          // Fetch marketplace orders
          const { data: ordersData } = await supabase
            .from('orders')
            .select('total, delivery_fee')
            .eq('company_id', companyId)
            .eq('status', 'delivered')
            .gte('created_at', startDate)
            .lt('created_at', endDate);

          const totalDeliveriesValue = (deliveriesData || []).reduce((sum, del) => sum + (Number(del.value) || 0), 0);
          
          const totalCommissionsValue = (ordersData || []).reduce((sum, ord) => {
            const orderValue = (Number(ord.total) || 0) - (Number(ord.delivery_fee) || 0);
            return sum + (orderValue * (commissionRate / 100));
          }, 0);

          const totalCombined = totalDeliveriesValue + totalCommissionsValue;

          // Create invoice even if 0, so the admin sees the retroactives were checked
          // Check if it already exists
          const { data: existing } = await supabase
            .from('merchant_invoices')
            .select('id')
            .eq('company_id', companyId)
            .eq('reference_month', period.label)
            .maybeSingle();

          if (!existing) {
             const { error: insertErr } = await supabase.from('merchant_invoices').insert({
               company_id: companyId,
               reference_month: period.label,
               deliveries_amount: totalCombined,
               subscription_amount: 0,
               total_amount: totalCombined,
               status: 'pending',
               notes: 'Gerado automaticamente (Retroativo)'
             });
             if (insertErr) throw new Error(insertErr.message);
             generatedCount++;
          }
        }
      }
      
      if (generatedCount > 0) {
        toast.success(`${generatedCount} faturas retroativas geradas com sucesso!`);
      } else {
        toast.info("Nenhuma fatura nova precisou ser gerada (todas já existem).");
      }
    } catch(err: any) {
      console.error(err);
      toast.error("Erro ao gerar retroativos: " + err.message);
    } finally {
      setIsLoading(false);
      fetchData();
    }
  };

  // Send invoices to merchants
  const handleSendInvoices = async (ids: string[]) => {
    if (ids.length === 0) return toast.error("Nenhuma fatura selecionada.");
    
    const now = new Date().toISOString();
    let sentCount = 0;
    
    for (const id of ids) {
      const { error } = await supabase
        .from('merchant_invoices')
        .update({ sent_at: now } as any)
        .eq('id', id);
      if (!error) sentCount++;
    }
    
    if (sentCount > 0) {
      toast.success(`${sentCount} fatura(s) enviada(s) para os lojistas!`);
      setSelectedIds(new Set());
      fetchData();
    } else {
      toast.error("Erro ao enviar faturas.");
    }
  };

  const handleSendAll = () => {
    const unsent = filteredInvoices.filter(i => !i.sent_at).map(i => i.id);
    if (unsent.length === 0) return toast.info("Todas as faturas visíveis já foram enviadas.");
    if (!confirm(`Enviar ${unsent.length} fatura(s) pendentes de envio para os lojistas?`)) return;
    handleSendInvoices(unsent);
  };

  const handleSendSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return toast.error("Selecione pelo menos uma fatura.");
    if (!confirm(`Enviar ${ids.length} fatura(s) selecionada(s) para os lojistas?`)) return;
    handleSendInvoices(ids);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
    }
  };

  // Compute unique months from invoices
  const uniqueMonths = [...new Set(invoices.map(i => i.reference_month))].sort((a, b) => {
    const [mA, yA] = a.split("/").map(Number);
    const [mB, yB] = b.split("/").map(Number);
    return yB - yA || mB - mA;
  });

  // Filter & sort invoices
  const filteredInvoices = invoices
    .filter(inv => {
      if (filterMonth !== "all" && inv.reference_month !== filterMonth) return false;
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (hideZero && Number(inv.total_amount) === 0) return false;
      if (filterSearch) {
        const name = (inv.companies?.name || "").toLowerCase();
        if (!name.includes(filterSearch.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "company") {
        cmp = (a.companies?.name || "").localeCompare(b.companies?.name || "");
      } else if (sortField === "month") {
        const [mA, yA] = (a.reference_month || "").split("/").map(Number);
        const [mB, yB] = (b.reference_month || "").split("/").map(Number);
        cmp = (yA - yB) || (mA - mB);
      } else if (sortField === "total") {
        cmp = Number(a.total_amount) - Number(b.total_amount);
      }
      return sortAsc ? cmp : -cmp;
    });

  // Summary
  const totalPendente = filteredInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPago = filteredInvoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0);
  const totalGeral = filteredInvoices.reduce((s, i) => s + Number(i.total_amount), 0);

  const handleSort = (field: "company" | "month" | "total") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortIcon = (field: string) => sortField === field ? (sortAsc ? " ▲" : " ▼") : "";

  return (
    <AdminLayout title="Faturas Lojistas" subtitle="Controle de mensalidades e repasses">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold">Todas as Faturas</h2>
          <div className="flex flex-wrap gap-2">
            {selectedIds.size > 0 && (
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={handleSendSelected}>
                <Send className="w-4 h-4 mr-2" /> Enviar {selectedIds.size} Selecionada(s)
              </Button>
            )}
            <Button variant="outline" onClick={handleSendAll} disabled={isLoading}>
              <SendHorizonal className="w-4 h-4 mr-2" /> Enviar Todas
            </Button>
            <Button variant="outline" onClick={generateRetroactive} disabled={isLoading}>
              Gerar Retroativos
            </Button>
            <Button onClick={() => openEdit()}><Plus className="w-4 h-4 mr-2" /> Nova Fatura</Button>
          </div>
        </div>

        {/* Summary Cards */}
        {!isLoading && invoices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-warning">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pendente</p>
              <p className="text-2xl font-bold text-warning">R$ {totalPendente.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{filteredInvoices.filter(i => i.status !== "paid").length} faturas</p>
            </Card>
            <Card className="p-4 border-l-4 border-l-green-500">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pago</p>
              <p className="text-2xl font-bold text-green-500">R$ {totalPago.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{filteredInvoices.filter(i => i.status === "paid").length} faturas</p>
            </Card>
            <Card className="p-4 border-l-4 border-l-primary">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Geral</p>
              <p className="text-2xl font-bold text-primary">R$ {totalGeral.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{filteredInvoices.length} faturas exibidas</p>
            </Card>
          </div>
        )}

        {/* Filters Bar */}
        {!isLoading && invoices.length > 0 && (
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Buscar Loja</Label>
                <Input
                  placeholder="Nome da loja..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Mês</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                >
                  <option value="all">Todos os meses</option>
                  {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                </select>
              </div>
              <div className="flex items-center gap-2 h-9">
                <input
                  type="checkbox"
                  id="hideZero"
                  checked={hideZero}
                  onChange={e => setHideZero(e.target.checked)}
                  className="rounded border-input accent-primary"
                />
                <Label htmlFor="hideZero" className="text-xs cursor-pointer">Ocultar R$ 0,00</Label>
              </div>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs w-full"
                  onClick={() => {
                    setFilterMonth("all");
                    setFilterStatus("all");
                    setFilterSearch("");
                    setHideZero(false);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : invoices.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p>Nenhuma fatura lançada ainda.</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p>Nenhuma fatura encontrada com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 w-10">
                    <Checkbox
                      checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("company")}>
                    Loja{sortIcon("company")}
                  </th>
                  <th className="p-4 text-left cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("month")}>
                    Referência{sortIcon("month")}
                  </th>
                  <th className="p-4 text-right">Mensalidade</th>
                  <th className="p-4 text-right">Entregas</th>
                  <th className="p-4 text-right cursor-pointer select-none hover:text-primary transition-colors" onClick={() => handleSort("total")}>
                    Total{sortIcon("total")}
                  </th>
                  <th className="p-4 text-center">Envio</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${selectedIds.has(inv.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-3 w-10">
                      <Checkbox
                        checked={selectedIds.has(inv.id)}
                        onCheckedChange={() => toggleSelect(inv.id)}
                      />
                    </td>
                    <td className="p-4 font-medium">{inv.companies?.name || "Loja Excluída"}</td>
                    <td className="p-4">{inv.reference_month}</td>
                    <td className="p-4 text-right text-muted-foreground">R$ {Number(inv.subscription_amount).toFixed(2)}</td>
                    <td className="p-4 text-right text-muted-foreground">R$ {Number(inv.deliveries_amount).toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-foreground">R$ {Number(inv.total_amount).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      {inv.sent_at ? (
                        <span className="inline-flex items-center bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full text-xs font-semibold">
                          <Send className="w-3 h-3 mr-1" /> Enviada
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-muted-foreground hover:text-blue-500"
                          onClick={() => handleSendInvoices([inv.id])}
                        >
                          <Send className="w-3 h-3 mr-1" /> Enviar
                        </Button>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center bg-success/10 text-success px-2 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3 mr-1" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-warning/10 text-warning px-2 py-1 rounded-full text-xs font-semibold">
                          <Clock className="w-3 h-3 mr-1" /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" title="Ver Detalhes / Imprimir" onClick={() => { setInvoiceToPrint(inv); setIsPrintDialogOpen(true); }}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(inv)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(inv.id)}><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{currentInvoice ? "Editar Fatura" : "Nova Fatura"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="col-span-2 md:col-span-1">
              <Label>Loja</Label>
              <div className="relative mt-1">
                <Popover open={openCompanyCombobox} onOpenChange={setOpenCompanyCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCompanyCombobox}
                      className="w-full justify-between font-normal text-left h-10 px-3"
                    >
                      {companyId ? companies.find((c) => c.id === companyId)?.name : "Pesquisar loja..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar loja pelo nome..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                        <CommandGroup>
                          {companies.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setCompanyId(c.id);
                                setOpenCompanyCombobox(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  companyId === c.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="col-span-2">
              <Label>Período de Cobrança</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <Label className="text-xs text-muted-foreground">Data Início</Label>
                  <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Fim</Label>
                  <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Escolha o período: diário, semanal, quinzenal ou mensal.</p>
            </div>
            
            <div className="col-span-2 md:col-span-1">
              <Label>Valor da Mensalidade (R$)</Label>
              <Input type="number" step="0.01" value={subscriptionAmount} onChange={e => setSubscriptionAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label>Valor devido por Entregas e Comissões (R$)</Label>
              <div className="flex gap-2">
                <Input type="number" step="0.01" value={deliveriesAmount} onChange={e => setDeliveriesAmount(e.target.value)} placeholder="0.00" />
                <Button variant="outline" size="icon" title="Auto calcular entregas concluídas" onClick={autoCalculateDeliveries}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1">
              <Label>Status do Pagamento</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                value={status} 
                onChange={e => setStatus(e.target.value)}
              >
                <option className="bg-background text-foreground" value="pending">Aberto / Pendente</option>
                <option className="bg-background text-foreground" value="paid">Pago</option>
              </select>
            </div>
            
            <div className="col-span-2">
              <Label>Observações Internas</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações sobre a cobrança (opcional)" />
            </div>
            
            <div className="col-span-2 flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar Fatura</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrintableInvoiceDialog 
        isOpen={isPrintDialogOpen} 
        onClose={() => setIsPrintDialogOpen(false)} 
        invoice={invoiceToPrint} 
      />
    </AdminLayout>
  );
}

// Inline missing icon
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
