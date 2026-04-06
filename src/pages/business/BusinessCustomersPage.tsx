import { useState, useEffect, useRef, useCallback } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, User, Phone, CreditCard, Plus, Edit2, Truck,
  X, Loader2, ChevronRight, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Customer = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  created_at: string;
};

type CustomerWithCount = Customer & { delivery_count: number };

export default function BusinessCustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Edit / create
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetchCustomers = useCallback(async (query?: string) => {
    setSearching(!!query);
    if (!query) setLoading(true);

    let q = supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .order("full_name") as any;

    if (query) {
      const isCpf = /^\d/.test(query);
      const isPhone = /^\+?[\d\s()-]{6,}/.test(query);
      if (isPhone) q = q.ilike("phone", `%${query}%`);
      else q = q.ilike("full_name", `%${query}%`);
    }

    const { data } = await q.limit(50);

    // Count deliveries per customer
    const result: CustomerWithCount[] = await Promise.all(
      (data ?? []).map(async (c: any) => {
        const { count } = await supabase
          .from("deliveries")
          .select("id", { count: "exact", head: true })
          .eq("customer_name", c.full_name);
        return { id: c.id, name: c.full_name || "Sem nome", cpf: null, phone: c.phone, created_at: c.created_at, delivery_count: count ?? 0 };
      })
    );

    setCustomers(result);
    setLoading(false);
    setSearching(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchCustomers(searchQuery.trim() || undefined);
    }, 350);
  }, [searchQuery, fetchCustomers]);

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setFormName(c.name);
    setFormCpf(c.cpf ?? "");
    setFormPhone(c.phone ?? "");
    setShowForm(true);
  };

  const openNew = () => {
    setEditCustomer(null);
    setFormName("");
    setFormCpf("");
    setFormPhone("");
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);

    if (editCustomer) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: formName.trim(), phone: formPhone.trim() || null } as any)
        .eq("id", editCustomer.id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Cliente atualizado!" });
        setShowForm(false);
        fetchCustomers(searchQuery || undefined);
      }
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: formName.trim(), phone: formPhone.trim() || null } as any)
        .eq("id", "placeholder");
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Cliente cadastrado!" });
        setShowForm(false);
        fetchCustomers(searchQuery || undefined);
      }
    }
    setSaving(false);
  };

  return (
    <BusinessLayout title="Clientes">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Search + Add */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, CPF ou telefone..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:border-primary shadow-sm"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {searchQuery && !searching && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={openNew}
            className="px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 shrink-0 shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>

        {/* Customer form */}
        {showForm && (
          <div className="bg-card rounded-2xl p-5 shadow-card border border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {editCustomer ? "Editar Cliente" : "Novo Cliente"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome completo *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nome do cliente"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">CPF</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formCpf}
                      onChange={(e) => setFormCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Salvando..." : editCustomer ? "Atualizar" : "Cadastrar Cliente"}
              </button>
            </form>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {loading ? "Carregando..." : `${customers.length} ${customers.length === 1 ? "cliente" : "clientes"}`}
          </span>
          {searchQuery && (
            <span className="text-xs text-muted-foreground">para "{searchQuery}"</span>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-card rounded-2xl h-20" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 shadow-card text-center">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </p>
            {!searchQuery && (
              <button
                onClick={openNew}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c.id} className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-base shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {c.cpf && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> {c.cpf}
                      </span>
                    )}
                    {c.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Truck className="h-3 w-3" /> {c.delivery_count} {c.delivery_count === 1 ? "pedido" : "pedidos"}
                  </span>
                </div>
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
