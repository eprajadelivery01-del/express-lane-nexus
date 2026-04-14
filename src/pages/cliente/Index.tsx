import { HeroMapSection } from "@/components/shared/HeroMapSection";
import { BusinessLayout } from "@/components/business/BusinessLayout";

export default function Index() {
  return (
    <BusinessLayout title="NexusPro">
      <HeroMapSection />
      
      {/* Additional sections can be added here */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-display font-black text-foreground mb-12">Como Funciona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <FeatureCard 
             title="1. Escolha o Local" 
             description="Veja no mapa quais regiões são atendidas pelo seu estabelecimento favorito."
           />
           <FeatureCard 
             title="2. Peça o Delivery" 
             description="Simule o frete em tempo real baseado na sua geolocalização exata."
           />
           <FeatureCard 
             title="3. Acompanhe no Mapa" 
             description="Veja o entregador se deslocando em tempo real até o seu endereço."
           />
        </div>
      </div>
    </BusinessLayout>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 rounded-3xl bg-card border border-border shadow-card hover:shadow-card-hover transition-all">
      <h3 className="text-xl font-bold text-foreground mb-4">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
