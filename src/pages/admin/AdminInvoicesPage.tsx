import { AdminLayout } from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Edit2, Trash2, FileText, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit/Create Invoice Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [companyId, setCompanyId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
  const [deliveriesAmount, setDeliveriesAmount] = useState("0");
  const [subscriptionAmount, setSubscriptionAmount] = useState("0");
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");

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
    if (!companyId || !referenceMonth) return toast.error("Preencha a loja e o mês de referência");
    
    const dAmount = parseFloat(deliveriesAmount) || 0;
    const sAmount = parseFloat(subscriptionAmount) || 0;
    const tAmount = dAmount + sAmount;

    const payload = { 
      company_id: companyId,
      reference_month: referenceMonth,
      deliveries_amount: dAmount,
      subscription_amount: sAmount,
      total_amount: tAmount,
      status,
      notes
    };
    
    if (currentInvoice) {
      const { error } = await supabase.from("merchant_invoices").update(payload).eq("id", currentInvoice.id);
      if (error) {
        toast.error("Erro ao atualizar fatura");
        console.error(error);
        return;
      }
      toast.success("Fatura atualizada");
    } else {
      const { error } = await supabase.from("merchant_invoices").insert(payload);
      if (error) {
        toast.error("Erro ao criar fatura");
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
      setReferenceMonth(invoice.reference_month);
      setDeliveriesAmount(invoice.deliveries_amount?.toString() || "0");
      setSubscriptionAmount(invoice.subscription_amount?.toString() || "0");
      setStatus(invoice.status || "pending");
      setNotes(invoice.notes || "");
    } else {
      setCurrentInvoice(null);
      setCompanyId("");
      
      const now = new Date();
      const monthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      setReferenceMonth(monthStr);
      setDeliveriesAmount("0");
      setSubscriptionAmount("0");
      setStatus("pending");
      setNotes("");
    }
    setIsDialogOpen(true);
  };

  // Helper function to sum deliveries automatically for the selected month
  const autoCalculateDeliveries = async () => {
    if (!companyId || !referenceMonth) {
      toast.error("Selecione a loja e defina o mês primeiro para calcular.");
      return;
    }
    
    // Convert MM/YYYY to date range
    const parts = referenceMonth.split("/");
    if (parts.length !== 2) return toast.error("Mês deve estar no formato MM/YYYY");
    
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);
    
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString();

    setIsLoading(true);

    try {
      // Fetch company commission rate
      const { data: compData } = await supabase
        .from('companies')
        .select('commission_rate')
        .eq('id', companyId)
        .single();
        
      const commissionRate = Number(compData?.commission_rate || 0);

      // Fetch deliveries
      const { data: deliveriesData, error: delError } = await supabase
        .from('deliveries')
        .select('value')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      if (delError) throw delError;

      // Fetch marketplace orders
      const { data: ordersData, error: ordError } = await supabase
        .from('orders')
        .select('total, delivery_fee')
        .eq('company_id', companyId)
        .eq('status', 'delivered')
        .gte('created_at', startDate)
        .lt('created_at', endDate);

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

      for (const comp of companies) {
        const companyId = comp.id;
        
        // Fetch commission rate
        const { data: compData } = await supabase
          .from('companies')
          .select('commission_rate')
          .eq('id', companyId)
          .single();
        const commissionRate = Number(compData?.commission_rate || 0);

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

          // Only create invoice if there is some activity
          if (totalCombined > 0) {
            // Check if it already exists
            const { data: existing } = await supabase
              .from('merchant_invoices')
              .select('id')
              .eq('company_id', companyId)
              .eq('reference_month', period.label)
              .maybeSingle();

            if (!existing) {
               await supabase.from('merchant_invoices').insert({
                 company_id: companyId,
                 reference_month: period.label,
                 deliveries_amount: totalCombined,
                 subscription_amount: 0,
                 total_amount: totalCombined,
                 status: 'pending',
                 notes: 'Gerado automaticamente (Retroativo)'
               });
            }
          }
        }
      }
      toast.success("Faturas retroativas geradas com sucesso!");
    } catch(err: any) {
      console.error(err);
      toast.error("Erro ao gerar retroativos: " + err.message);
    } finally {
      setIsLoading(false);
      fetchData();
    }
  };

  return (
    <AdminLayout title="Faturas Lojistas" subtitle="Controle de mensalidades e repasses">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Todas as Faturas</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateRetroactive} disabled={isLoading}>
              Gerar Retroativos
            </Button>
            <Button onClick={() => openEdit()}><Plus className="w-4 h-4 mr-2" /> Nova Fatura</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : invoices.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p>Nenhuma fatura lançada ainda.</p>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left">Loja</th>
                  <th className="p-4 text-left">Referência</th>
                  <th className="p-4 text-right">Mensalidade</th>
                  <th className="p-4 text-right">Entregas</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-4 font-medium">{inv.companies?.name || "Loja Excluída"}</td>
                    <td className="p-4">{inv.reference_month}</td>
                    <td className="p-4 text-right text-muted-foreground">R$ {Number(inv.subscription_amount).toFixed(2)}</td>
                    <td className="p-4 text-right text-muted-foreground">R$ {Number(inv.deliveries_amount).toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-foreground">R$ {Number(inv.total_amount).toFixed(2)}</td>
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
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                value={companyId} 
                onChange={e => setCompanyId(e.target.value)}
              >
                <option className="bg-background text-foreground" value="">Selecione a loja...</option>
                {companies.map(c => <option className="bg-background text-foreground" key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label>Mês de Referência (MM/YYYY)</Label>
              <Input value={referenceMonth} onChange={e => setReferenceMonth(e.target.value)} placeholder="06/2026" />
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
