import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCitiesWithRegions } from "@/services/regions";

interface EditDriverDialogProps {
  driver: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDriverDialog({ driver, open, onOpenChange }: EditDriverDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { data: dbCities } = useCitiesWithRegions();
  const cities = dbCities || [];

  const [form, setForm] = useState({
    fullName: driver?.full_name || "",
    phone: driver?.phone || "",
    document: driver?.document || "",
    vehicleType: driver?.vehicle_type || "motorcycle",
    vehiclePlate: driver?.vehicle_plate || "",
    cityId: driver?.city_id || "",
    commission: driver?.commission_rate !== undefined && driver?.commission_rate !== null ? driver.commission_rate.toString() : "0.40",
  });

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.fullName || !form.phone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      // Update delivery_drivers directly — it has full_name, phone, document, vehicle_type, vehicle_plate
      const { error } = await supabase
        .from("delivery_drivers")
        .update({
          full_name: form.fullName,
          phone: form.phone,
          document: form.document,
          vehicle: form.vehicleType,
          license_plate: form.vehiclePlate,
          city_id: form.cityId || null,
          commission_rate: parseFloat(form.commission) || 0.40,
        } as any)
        .eq("id", driver.id);

      if (error) throw error;

      // Also sync profile table
      await supabase
        .from("profiles")
        .update({
          full_name: form.fullName,
          phone: form.phone,
          document: form.document,
        })
        .eq("user_id", driver.user_id);

      toast.success("Dados do entregador atualizados!");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar entregador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Entregador: {driver?.full_name}</DialogTitle>
          <DialogDescription className="sr-only">Formulário para editar as informações do entregador selecionado.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Nome completo</Label>
              <Input value={form.fullName} onChange={e => set("fullName", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
              <div>
                <Label>Documento (CPF/CNPJ)</Label>
                <Input value={form.document} onChange={e => set("document", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de veículo</Label>
                <Select value={form.vehicleType} onValueChange={v => set("vehicleType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motorcycle">🏍️ Moto</SelectItem>
                    <SelectItem value="bicycle">🚲 Bicicleta</SelectItem>
                    <SelectItem value="car">🚗 Carro</SelectItem>
                    <SelectItem value="van">🚐 Van</SelectItem>
                    <SelectItem value="truck">🚛 Caminhão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Placa</Label>
                <Input value={form.vehiclePlate} onChange={e => set("vehiclePlate", e.target.value.toUpperCase())} />
              </div>
            </div>
            <div>
              <Label>Comissão por Corrida (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                <Input type="number" step="0.01" className="pl-10" value={form.commission} onChange={e => set("commission", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Base do Motoboy (Cidade)</Label>
              <Select value={form.cityId} onValueChange={v => set("cityId", v)}>
                <SelectTrigger className="mt-1.5 border-primary/20 bg-primary/5 text-primary font-bold">
                  <SelectValue placeholder="Selecionar Cidade..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as Cidades</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
