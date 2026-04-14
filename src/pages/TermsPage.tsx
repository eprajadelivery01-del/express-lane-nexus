import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 text-foreground">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        
        <h1 className="text-3xl font-black tracking-tighter uppercase">Termos de Uso - Cliente</h1>
        
        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold text-foreground">1. Objeto</h2>
            <p>O É Pra Já é uma plataforma de delivery que conecta clientes a estabelecimentos locais...</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">2. Uso da Localização</h2>
            <p>Para o funcionamento do serviço, o aplicativo solicita acesso à sua localização para exibir lojas próximas e calcular fretes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">3. Pagamentos</h2>
            <p>Os pagamentos são processados de forma segura através de nossos parceiros financeiros...</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">4. Exclusão de Conta</h2>
            <p>Conforme exigido pelas normas da Apple e Google, o usuário pode solicitar a exclusão permanente de seus dados através do menu de Perfil.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
