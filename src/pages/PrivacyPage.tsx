import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPage() {
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
        
        <h1 className="text-3xl font-black tracking-tighter uppercase">Política de Privacidade - Cliente</h1>
        
        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold text-foreground">1. Informações Coletadas</h2>
            <p>Coletamos seu nome, e-mail, telefone e localização geográfica para fornecer o serviço de delivery...</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">2. Uso da Localização</h2>
            <p>Sua localização é utilizada exclusivamente para encontrar estabelecimentos parceiros e permitir o rastreio da sua entrega em tempo real.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">3. Seus Direitos</h2>
            <p>Você tem total controle sobre seus dados. A exclusão da conta pode ser solicitada diretamente no aplicativo conforme diretrizes da LGPD, Apple App Store e Google Play.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
