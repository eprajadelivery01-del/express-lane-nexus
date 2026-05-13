import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, uploadAvatar } from "@/services/users";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, Loader2, User, Phone, AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

export default function ProfilePage() {
  const { user, profile, deleteAccount, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      toast({ title: "Foto atualizada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { full_name: fullName, phone });
      toast({ title: "Perfil atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Perfil" subtitle="Seu perfil">
      <div className="max-w-md mx-auto space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-primary" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Camera className="h-4 w-4 text-primary-foreground" />}
            </button>
            <input ref={fileInputRef} type="file" capture="environment" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar alteraÃ§Ãµes"}
          </button>
        </form>

        {/* Legal Links */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button 
            onClick={() => navigate("/terms")}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:bg-muted transition-colors group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Termos de Uso</span>
          </button>
          <button 
            onClick={() => navigate("/privacy")}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:bg-muted transition-colors group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Privacidade</span>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="pt-8 border-t border-border mt-8">
          <div className="bg-destructive/5 rounded-2xl p-5 border border-destructive/20 space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-base font-bold">Zona de Perigo</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ao excluir sua conta, todo o seu histÃ³rico de pedidos, endereÃ§os salvos e dados de perfil serÃ£o permanentemente removidos. Esta aÃ§Ã£o nÃ£o pode ser desfeita.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full py-3 rounded-2xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-all flex items-center justify-center gap-2">
                  Excluir minha conta permanentemente
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-border bg-card mx-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">VocÃª tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Esta aÃ§Ã£o Ã© irreversÃ­vel. Todas as suas informaÃ§Ãµes de cliente serÃ£o deletadas imediatamente de nossos sistemas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="rounded-xl border-border text-muted-foreground">Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={async () => {
                      try {
                        await deleteAccount();
                        toast({ title: "Conta excluÃ­da", description: "Sentiremos sua falta!" });
                      } catch (err) {
                        toast({ title: "Erro na exclusÃ£o", description: "NÃ£o foi possÃ­vel remover sua conta agora.", variant: "destructive" });
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
    </AdminLayout>
  );
}

