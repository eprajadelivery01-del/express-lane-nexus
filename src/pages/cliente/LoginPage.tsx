import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error("Erro de Autenticação Supabase:", error.message);
      setLoading(false);
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      return;
    }

    const user = signInData.user;
    console.log("Usuário logado com sucesso:", user.id);

    // Check user approval status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.warn("Erro ao buscar perfil (usuário pode não ter perfil criado):", profileError);
    }
    
    console.log("Status do Perfil:", profile?.status);

    if (profile?.status === "pending") {
      await supabase.auth.signOut();
      setLoading(false);
      toast({
        title: "Aguardando aprovação",
        description: "Seu cadastro está pendente de aprovação pelo administrador. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    if (profile?.status === "rejected") {
      await supabase.auth.signOut();
      setLoading(false);
      toast({
        title: "Acesso negado",
        description: "Seu cadastro foi recusado pelo administrador.",
        variant: "destructive",
      });
      return;
    }

<<<<<<< HEAD
    const { data: roles, error: rolesError } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    
    if (rolesError) {
      console.error("Erro ao buscar papéis (roles):", rolesError);
    }

=======
    const { data: roles } = await supabase.from("user_roles").select("role").eq("id", user.id);
>>>>>>> 95ed552 (fix: compatibilidade do esquema de perfis (id vs user_id))
    const userRoles = roles?.map(r => r.role) || [];
    console.log("Papéis encontrados:", userRoles);
    
    setLoading(false);

    if (userRoles.includes("admin")) {
      console.log("Redirecionando para Admin...");
      navigate("/admin");
    } else if (userRoles.includes("company")) {
      console.log("Redirecionando para Lojista...");
      navigate("/business");
    } else if (userRoles.includes("driver")) {
      console.log("Redirecionando para Entregador...");
      navigate("/driver");
    } else {
      console.log("Nenhum papel encontrado. Tentando Admin por padrão...");
      navigate("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-lg p-2">
            <img src="/logo.png" alt="É Pra Já" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight">É Pra Já</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Delivery • Painel de Gestão</p>
        </div>

        <form onSubmit={handleLogin} className="bg-card rounded-2xl p-6 shadow-card space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
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

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso exclusivo por convite do administrador
        </p>
      </div>
    </div>
  );
}
