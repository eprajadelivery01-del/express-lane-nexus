import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { APP_TYPE, APP_PROJECT_ID, APP_COLOR } from "@/constants/app-config";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, rolesLoaded, hasRole, roles, userStatus } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;
    
    if (!rolesLoaded) return;

    if (userStatus === "pending") {
      navigate("/pending-approval", { replace: true });
    } else if (hasRole("admin")) {
      navigate("/admin", { replace: true });
    } else {
      toast({
        title: "Portal Restrito",
        description: "Sua conta não possui permissões administrativas. Acesse o Painel do Lojista.",
        variant: "destructive"
      });

      setTimeout(() => {
        supabase.auth.signOut().then(() => {
          window.location.reload();
        });
      }, 3000);
    }
  }, [user, authLoading, rolesLoaded, roles, userStatus, hasRole, navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
        // Log brute-force tracking
        await supabase.rpc("log_failed_login", { p_email: email, p_app_name: "Central de Comando (Admin)" } as any).catch(() => {});
      }
    } catch (error: any) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      await supabase.rpc("log_failed_login", { p_email: email, p_app_name: "Central de Comando (Admin)" } as any).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6 rounded-2xl bg-card p-8 shadow-card">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.png" alt="É Pra Já Delivery" className="h-20 w-auto rounded-xl" />
          <p className="text-sm text-muted-foreground font-black text-primary uppercase">Painel Administrativo Central</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </div>

        {user && !authLoading && rolesLoaded && roles.length === 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-[11px] text-destructive text-center font-bold uppercase leading-tight">
              Acesso Negado: Seu perfil não possui permissões. Contate o administrador.
            </p>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? "Entrando..." : "Entrar"}</span>
        </button>

        <div className="space-y-4">
          <p className="text-center text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Acesso exclusivo por convite do administrador
          </p>
          <div className="flex justify-center gap-4">
            <button 
              type="button"
              onClick={() => navigate("/privacy")}
              className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
            >
              Privacidade
            </button>
            <button 
              type="button"
              onClick={() => navigate("/terms")}
              className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
            >
              Termos de Uso
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
