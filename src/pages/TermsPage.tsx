import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        
        <h1 className="text-3xl font-black tracking-tighter uppercase">Termos de Uso - Lojista</h1>
        
        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold text-foreground">1. Aceitação dos Termos</h2>
            <p>Ao utilizar o painel de lojista do É Pra Já, você concorda em cumprir estes termos de serviço...</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">2. Uso do Serviço</h2>
            <p>O lojista é responsável por manter a precisão das informações de seus estabelecimentos e pedidos...</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">3. Taxas e Pagamentos</h2>
            <p>As comissões e taxas de serviço serão aplicadas conforme acordado no momento do cadastro...</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">4. Cancelamento</h2>
            <p>Você pode excluir sua conta a qualquer momento através das configurações de perfil, o que resultará na remoção de todos os dados do estabelecimento.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
