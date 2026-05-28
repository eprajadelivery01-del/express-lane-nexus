import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Phone, MapPin, User, Mail, Edit2, Save, Loader2, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Company = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  delivery_fee: number | null;
};

export default function BusinessProfilePage() {
  const { user, profile, signOut, deleteAccount } = useAuth();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [editingCompany, setEditingCompany] = useState(false);

  // Form
  const [compName, setCompName] = useState("");
  const [compPhone, setCompPhone] = useState("");
  const [compAddress, setCompAddress] = useState("");
  const [compDeliveryFee, setCompDeliveryFee] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingCompany(true);
    const init = async () => {
      let { data } = await supabase
        .from("companies")
        .select("id, name, phone, address, logo_url, delivery_fee")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.role === "admin") {
          const { data: fallback } = await supabase
            .from("companies")
            .select("id, name, phone, address, logo_url, delivery_fee")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          data = fallback;
        }
      }

      if (data) {
        setCompany(data as Company);
        setCompName(data.name);
        setCompPhone(data.phone ?? "");
        setCompAddress(data.address ?? "");
        setCompDeliveryFee(String(data.delivery_fee ?? 0));
      }
      setLoadingCompany(false);
    };
    init();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ 
        name: compName.trim(), 
        phone: compPhone.trim() || null, 
        address: compAddress.trim() || null,
        delivery_fee: parseFloat(compDeliveryFee) || 0
      })
      .eq("id", company.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      setCompany((prev) => prev ? { 
        ...prev, 
        name: compName, 
        phone: compPhone, 
        address: compAddress,
        delivery_fee: parseFloat(compDeliveryFee) || 0 
      } : prev);
      setEditingCompany(false);
    }
    setSaving(false);
  };

  return (
    <BusinessLayout title="Perfil">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Company card */}
        <div className="bg-card rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Estabelecimento
            </p>
            {!editingCompany && company && (
              <button
                onClick={() => setEditingCompany(true)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {loadingCompany ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-muted rounded-lg h-10" />)}
            </div>
          ) : !company ? (
            <p className="text-sm text-muted-foreground text-center py-4">Empresa não encontrada</p>
          ) : editingCompany ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome do estabelecimento</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={compPhone}
                    onChange={(e) => setCompPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={compAddress}
                    onChange={(e) => setCompAddress(e.target.value)}
                    placeholder="Rua, número, bairro..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Taxa de Entrega (Padrão para Clientes)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={compDeliveryFee}
                    onChange={(e) => setCompDeliveryFee(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCompany(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {/* Company avatar */}
              <div className="flex items-center gap-4 pb-3 border-b border-border">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-xl font-bold shadow-glow">
                  {company.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">{company.name}</p>
                  <p className="text-xs text-muted-foreground">Estabelecimento</p>
                </div>
              </div>

              {[
                { icon: Phone, label: "Telefone", value: company.phone || "Não informado" },
                { icon: MapPin, label: "Endereço", value: company.address || "Não informado" },
                { 
                  icon: Building2, 
                  label: "Taxa de Entrega", 
                  value: company.delivery_fee !== null ? `R$ ${Number(company.delivery_fee).toFixed(2).replace('.', ',')}` : "Não configurada" 
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm text-foreground font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User info card */}
        <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Minha Conta
          </p>
          <div className="space-y-3">
            {[
              { icon: User, label: "Nome", value: profile?.full_name || "—" },
              { icon: Mail, label: "E-mail", value: user?.email || "—" },
              { icon: Phone, label: "Telefone", value: profile?.phone || "Não informado" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm text-foreground font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-2xl border-2 border-border text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors"
        >
          Sair da Conta
        </button>

        {/* Danger Zone */}
        <div className="pt-6 border-t border-border">
          <div className="bg-destructive/5 rounded-2xl p-5 border border-destructive/20 space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-base font-bold">Zona de Perigo</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ao excluir sua conta, todos os seus dados de estabelecimento, histórico de vendas e faturamento serão permanentemente removidos. Esta ação não pode ser desfeita.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full py-3 rounded-2xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-all flex items-center justify-center gap-2">
                  Excluir minha conta permanentemente
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-border bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Esta ação é irreversível. Todos os dados da sua empresa e acesso ao painel do lojista serão deletados imediatamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="rounded-xl border-border text-muted-foreground">Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={async () => {
                      try {
                        await deleteAccount();
                        toast({ title: "Conta excluída", description: "Sentiremos sua falta!" });
                      } catch (err) {
                        toast({ title: "Erro na exclusão", description: "Não foi possível remover sua conta agora.", variant: "destructive" });
                      }
                    }}
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, excluir agora
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}
