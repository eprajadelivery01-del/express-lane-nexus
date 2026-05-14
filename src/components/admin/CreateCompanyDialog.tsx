import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Store, Phone, Mail, Lock, User, MapPin, Building2, Plus } from "lucide-react";
import { useRegions } from "@/services/regions";

export function CreateCompanyDialog() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: regions } = useRegions();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
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

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Empresa cadastrada com sucesso!" });
      qc.invalidateQueries({ queryKey: ["companies"] });
      setOpen(false);
      reset();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setForm({
      companyName: "", responsibleName: "", email: "", password: "",
      phone: "", document: "", address: "", regionId: "",
    });
  };

  const steps = ["Acesso", "Responsável", "Localização"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" /> Cadastrar Empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Nova Empresa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-2 mb-6">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                  {s}
                </span>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Empresa</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 h-12 rounded-xl" placeholder="Ex: Pizzaria do Vale" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail de Acesso</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 h-12 rounded-xl" placeholder="empresa@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Senha Provisória</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" className="pl-10 h-12 rounded-xl" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => set("password", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome do Responsável</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 h-12 rounded-xl" placeholder="Nome Completo" value={form.responsibleName} onChange={(e) => set("responsibleName", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10 h-12 rounded-xl" placeholder="(65) 99999-0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CNPJ / CPF</Label>
                  <Input className="h-12 rounded-xl" placeholder="00.000.000/0001-00" value={form.document} onChange={(e) => set("document", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Endereço Completo</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 h-12 rounded-xl" placeholder="Rua, Número, Bairro, Cidade" value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Região Principal</Label>
                <select 
                  value={form.regionId} 
                  onChange={(e) => set("regionId", e.target.value)}
                  className="w-full h-12 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione uma região</option>
                  {(regions ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-border mt-6">
            {step > 0 && (
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            )}
            {step < 2 ? (
              <Button className="flex-1 h-12 rounded-xl font-bold" onClick={() => setStep(step + 1)} disabled={
                (step === 0 && (!form.companyName || !form.email || !form.password)) ||
                (step === 1 && (!form.responsibleName || !form.phone))
              }>
                Próximo Passo
              </Button>
            ) : (
              <Button className="flex-1 h-12 rounded-xl font-black bg-primary shadow-lg shadow-primary/20" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Finalizar Cadastro
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
