import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPage() {
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
        
        <h1 className="text-3xl font-black tracking-tighter uppercase">Política de Privacidade - Lojista</h1>
        
        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold text-foreground">1. Coleta de Dados</h2>
            <p>Coletamos informações necessárias para a operação comercial, incluindo dados do estabelecimento, pedidos e informações de contato...</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">2. Uso de Localização</h2>
            <p>A localização do seu estabelecimento é utilizada para fins de cálculo de distância de entrega e visibilidade para os clientes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">3. Seus Direitos</h2>
            <p>Conforme exigido pelas plataformas iOS e Android, você tem o direito de solicitar a exclusão de seus dados a qualquer momento através do painel de perfil.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
