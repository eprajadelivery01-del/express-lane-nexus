import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useCompanies } from "@/services/companies";
import { useRegions } from "@/services/regions";
import { Building2, Phone, MapPin, Loader2, Plus, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AdminLayout title="Empresas" subtitle="Gestão de lojas e estabelecimentos">
      <div className="flex items-center justify-between mb-6">
        <div />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Cadastrar Empresa
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Empresa</DialogTitle>
            </DialogHeader>
            <CreateCompanyForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(companies ?? []).map((company) => (
            <div key={company.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all border border-border group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    {company.logo_url ? (
                      <img src={company.logo_url} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{company.name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${company.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {company.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {company.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> <span>{company.phone}</span>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> <span className="truncate">{company.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {(companies ?? []).length === 0 && (
            <div className="col-span-full p-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

function CreateCompanyForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: regions } = useRegions();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    companyName: "",
    responsibleName: "",
    email: "",
    password: "",
    phone: "",
    document: "",
    address: "",
    regionId: "",
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const canNext = () => {
    if (step === 0) return form.companyName && form.email && form.password;
    if (step === 1) return form.responsibleName && form.phone;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.responsibleName,
          phone: form.phone,
          document: form.document,
          role: "company",
          companyName: form.companyName,
          address: form.address,
          regionId: form.regionId || null,
        },
      });

      if (res.error) throw new Error(res.error.message);
      const data = res.data as any;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Empresa cadastrada com sucesso!" });
      qc.invalidateQueries({ queryKey: ["companies"] });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const steps = ["Dados de Acesso", "Responsável", "Endereço e Região"];

  return (
    <div className="space-y-5 mt-2">
      {/* Stepper */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            <span className={`text-xs truncate ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s}
            </span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <FieldInput label="Nome da empresa *" value={form.companyName} onChange={(v) => set("companyName", v)} placeholder="Lanchonete do João" />
          <FieldInput label="Email de acesso *" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="empresa@email.com" />
          <FieldInput label="Senha *" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="Mínimo 8 caracteres" />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <FieldInput label="Nome do responsável *" value={form.responsibleName} onChange={(v) => set("responsibleName", v)} placeholder="João da Silva" />
          <FieldInput label="Telefone *" value={form.phone} onChange={(v) => set("phone", v)} placeholder="(65) 99999-0000" />
          <FieldInput label="CNPJ ou CPF" value={form.document} onChange={(v) => set("document", v)} placeholder="00.000.000/0001-00" />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <FieldInput label="Endereço completo" value={form.address} onChange={(v) => set("address", v)} placeholder="Rua X, 123 - Bairro" />
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">Região padrão</label>
            <select
              value={form.regionId}
              onChange={(e) => set("regionId", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
            >
              <option value="">Sem região</option>
              {(regions ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.name} — R$ {Number(r.price).toFixed(2)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Voltar
          </button>
        )}
        {step < 2 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Próximo
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Cadastrar Empresa
          </button>
        )}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block text-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}
