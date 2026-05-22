import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, User, Phone, Bike, Mail, Lock, FileText, Percent } from "lucide-react";

interface CreateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDriverDialog({ open, onOpenChange }: CreateDriverDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    document: "",
    vehicle: "motorcycle",
    licensePlate: "",
    commissionRate: "15",
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Create Auth User via Edge Function
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone,
          document: form.document,
          role: "driver",
          vehicle: form.vehicle,
          licensePlate: form.licensePlate,
          commissionRate: parseFloat(form.commissionRate) || 15,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // CORREÇÃO IMEDIATA: A Edge Function `create-admin` não consegue preencher placa e veículo
      // corretamente porque utiliza nomes de colunas errados (`vehicle` e `license_plate`).
      // Forçamos a correção via RPC imediatamente após a criação para garantir os dados na tabela.
      if (data?.userId) {
        await supabase.rpc("admin_update_driver_by_user_id", {
          p_user_id: data.userId,
          p_full_name: form.fullName,
          p_phone: form.phone,
          p_document: form.document,
          p_vehicle_type: form.vehicle,
          p_vehicle_plate: form.licensePlate,
          p_commission_rate: parseFloat(form.commissionRate) || 15
        });
      }

      toast({ title: "Entregador cadastrado com sucesso!" });
      qc.invalidateQueries({ queryKey: ["drivers"] });
      onOpenChange(false);
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
      fullName: "", email: "", password: "", phone: "",
      document: "", vehicle: "motorcycle", licensePlate: "", commissionRate: "15",
    });
  };

  const steps = ["Acesso", "Pessoal", "Veículo"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Bike className="w-6 h-6 text-primary" />
            Novo Entregador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Steps */}
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail de Acesso</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 h-12 rounded-xl" placeholder="entregador@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10 h-12 rounded-xl" placeholder="João da Silva" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10 h-12 rounded-xl" placeholder="(65) 99999-0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10 h-12 rounded-xl" placeholder="000.000.000-00" value={form.document} onChange={(e) => set("document", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Veículo</Label>
                <Select value={form.vehicle} onValueChange={(v) => set("vehicle", v)}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motorcycle">🏍️ Moto</SelectItem>
                    <SelectItem value="bicycle">🚲 Bicicleta</SelectItem>
                    <SelectItem value="car">🚗 Carro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Placa</Label>
                  <Input className="h-12 rounded-xl uppercase font-mono" placeholder="ABC-1234" value={form.licensePlate} onChange={(e) => set("licensePlate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Comissão (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-10 h-12 rounded-xl" value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} />
                  </div>
                </div>
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
                (step === 0 && (!form.email || !form.password)) ||
                (step === 1 && (!form.fullName || !form.phone || !form.document))
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
