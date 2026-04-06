import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Phone, MapPin, User, Mail, Edit2, Save, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Company = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
};

export default function BusinessProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [editingCompany, setEditingCompany] = useState(false);

  // Form
  const [compName, setCompName] = useState("");
  const [compPhone, setCompPhone] = useState("");
  const [compAddress, setCompAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingCompany(true);
    supabase
      .from("companies")
      .select("id, name, phone, address, logo_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCompany(data as Company);
          setCompName(data.name);
          setCompPhone(data.phone ?? "");
          setCompAddress(data.address ?? "");
        }
        setLoadingCompany(false);
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ name: compName.trim(), phone: compPhone.trim() || null, address: compAddress.trim() || null })
      .eq("id", company.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      setCompany((prev) => prev ? { ...prev, name: compName, phone: compPhone, address: compAddress } : prev);
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
          className="w-full py-3 rounded-2xl border-2 border-red-500/30 text-red-500 text-sm font-semibold hover:bg-red-500/5 transition-colors"
        >
          Sair da Conta
        </button>
      </div>
    </BusinessLayout>
  );
}
