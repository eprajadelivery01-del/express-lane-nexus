import { MapPin, Search, Navigation, Maximize2 } from "lucide-react";
import { useRegions } from "@/services/regions";
import { useCity } from "@/contexts/CityContext";
import { useNavigate } from "react-router-dom";
import { UnifiedMap } from "./UnifiedMap";

interface HeroMapSectionProps {
  title?: string;
  subtitle?: string;
}

export function HeroMapSection({ 
  title, 
  subtitle 
}: HeroMapSectionProps) {
  const { selectedCity } = useCity();
  const { data: regions } = useRegions(selectedCity || undefined);
  const navigate = useNavigate();

  return (
    <section 
      className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden bg-background border-b border-border transition-all"
    >
      {/* Background Interactive Map */}
      <div className="absolute inset-0 z-0">
        <UnifiedMap regions={regions ?? []} interactive={true} />
      </div>

      {/* Floating Controls */}
      <div className="absolute top-8 right-8 z-30 flex flex-col gap-3">
        <button 
          onClick={() => navigate("/admin/map")}
          className="p-4 rounded-2xl bg-background/80 backdrop-blur-xl border border-border shadow-2xl hover:scale-110 active:scale-95 transition-all group"
          title="Abrir Mapa em Tela Cheia"
        >
          <Maximize2 className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
        </button>
        
        <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-xl border border-border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="pr-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Localização</p>
            <p className="text-sm font-extrabold text-foreground leading-none">{selectedCity || "Global"}</p>
          </div>
        </div>
      </div>

      {/* Footer Indicators - Small & Discrete */}
      <div className="absolute bottom-6 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-6 bg-background/60 backdrop-blur-md px-4 py-2 rounded-full border border-border shadow-lg">
          <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />
             <span className="text-[10px] font-bold text-foreground">DRIVERS ONLINE</span>
          </div>
          <div className="flex items-center gap-2 opacity-60">
             <div className="w-2.5 h-2.5 rounded-full bg-primary/40 border border-primary" />
             <span className="text-[10px] font-bold text-foreground">REGIONS ACTIVE</span>
          </div>
        </div>
        
        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] animate-pulse bg-background/40 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50">
          Arraste e aproxime para explorar
        </div>
      </div>
    </section>
  );
}

