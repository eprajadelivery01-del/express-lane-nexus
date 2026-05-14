import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, User, Mail, Lock, Phone, Truck, Store, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    companyName: "" // Only for lojistas
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      console.log("Validando token:", token);
      if (!token) {
        setError("Token não fornecido");
        setValidating(false);
        return;
      }

      try {
        const { data, error: fetchError } = await (supabase as any)
          .rpc("get_invitation_by_token", { _token: token });

        if (fetchError) throw fetchError;

        const inv = data as any;

        if (!inv || inv.status !== "pending") {
          setError("Este link de convite é inválido ou já foi utilizado.");
        } else {
          const expiresAt = new Date(inv.expires_at);
          if (expiresAt < new Date()) {
            setError("Este link de convite expirou.");
          } else {
            console.log("Convite válido:", inv);
            setInvitation(inv);
          }
        }
      } catch (err: any) {
        console.error("Erro na validação:", err);
        setError("Erro ao validar convite: " + err.message);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setFormError(null);
    if (formData.password !== formData.confirmPassword) {
      setFormError("As senhas não coincidem.");
      toast.error("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    console.log("Iniciando processo de cadastro para:", formData.email);

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            invitation_id: invitation.id,
            company_name: formData.companyName
          }
        }
      });

      if (authError) {
        console.error("Erro retornado pelo Supabase Auth:", authError);
        throw authError;
      }
      
      if (!authData.user) {
        console.warn("Auth concluído mas sem objeto user retornado");
        throw new Error("Não foi possível criar sua conta. Verifique se este email já está em uso.");
      }

      console.log("Cadastro realizado com sucesso, redirecionando...");
      toast.success("Cadastro realizado com sucesso!");
      
      // 2. Redirect to appropriate dashboard (same origin) after a short delay
      const redirectPath = invitation.role === "company" ? "/business" : "/";
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 3000);

    } catch (err: any) {
      console.error("Erro capturado no handleSubmit:", err);
      const errorMessage = err.message || "Erro ao realizar cadastro. Tente novamente.";
      setFormError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">Validando Convite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-md border-destructive/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-black">Link Inválido</CardTitle>
            <CardDescription className="text-base mt-2">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full h-12 rounded-xl" onClick={() => navigate("/login")}>
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompany = invitation.role === "company";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      
      <Card className="w-full max-w-xl border-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary via-primary/50 to-primary" />
        
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner">
            {isCompany ? (
              <Store className="h-10 w-10 text-primary" />
            ) : (
              <Truck className="h-10 w-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-3xl font-black tracking-tight mb-2">Seja bem-vindo! v2</CardTitle>
          <CardDescription className="text-base">
            Você foi convidado para se tornar um {isCompany ? "Lojista Parceiro" : "Entregador Parceiro"}.
            Sistema de Convites Ativo - Versão 14/05/2026.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{formError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all" 
                    placeholder="João Silva"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all" 
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>

            {isCompany && (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Empresa / Loja</Label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all" 
                    placeholder="Nome Fantasia"
                    value={formData.companyName}
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email de Acesso</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email"
                  className="pl-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all" 
                  placeholder="exemplo@email.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Criar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all" 
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    className="pl-10 pr-10 h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all" 
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    required
                    minLength={6}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full h-14 rounded-2xl text-base font-black shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Realizando Cadastro...</>
                ) : (
                  <><CheckCircle2 className="h-5 w-5 mr-2" /> Finalizar Cadastro e Entrar</>
                )}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest mt-6 opacity-50">
                Ao se cadastrar, você concorda com nossos Termos de Uso.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
