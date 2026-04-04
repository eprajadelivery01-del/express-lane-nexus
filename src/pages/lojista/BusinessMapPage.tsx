import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useRegions, useCitiesWithRegions } from "@/services/regions";
import { UnifiedMap } from "@/components/shared/UnifiedMap";
import { MapPin, DollarSign, Loader2, Mail, Send, LinkIcon, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CITY_STORAGE_KEY = "epj_selected_city";

// Removed manual Region type as we use the one from service hooks

export default function BusinessMapPage() {
  const { toast } = useToast();
  const [integratorEmail, setIntegratorEmail] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  // Shared city state
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Data hooks
  const { data: availableCities } = useCitiesWithRegions();
  const { data: regions, isLoading: loading } = useRegions(selectedCityName || undefined);

  // Load saved city on mount
  useEffect(() => {
    const stored = localStorage.getItem(CITY_STORAGE_KEY);
    if (stored) setSelectedCityName(stored);
  }, []);

  const selectCity = (cityName: string | null) => {
    setSelectedCityName(cityName);
    if (cityName) localStorage.setItem(CITY_STORAGE_KEY, cityName);
    else localStorage.removeItem(CITY_STORAGE_KEY);
    setShowCityDropdown(false);
  };


  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integratorEmail.trim()) return;
    setSendingRequest(true);
    await new Promise((res) => setTimeout(res, 1200));
    toast({
      title: "Solicitação enviada!",
      description: `Sua solicitação de integração foi enviada para o admin.`,
    });
    setIntegratorEmail("");
    setSendingRequest(false);
  };

  const activeRegions = regions?.filter((r) => r.is_active) ?? [];


  return (
    <BusinessLayout title="Mapa de Regiões">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Integration request banner */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <LinkIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Solicitar Integração com Painel Admin</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Envie sua solicitação ao administrador para vincular seu estabelecimento e liberar acesso completo às configurações de entrega.
              </p>
              <form onSubmit={handleSendRequest} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="email"
                    value={integratorEmail}
                    onChange={(e) => setIntegratorEmail(e.target.value)}
                    placeholder="E-mail do administrador"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingRequest || !integratorEmail.trim()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity"
                >
                  {sendingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-card rounded-2xl overflow-hidden shadow-card" style={{ height: 420 }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            
            {/* City selector dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className="w-full flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-1.5 hover:bg-muted transition-all"
              >
                <span className="text-sm font-bold text-foreground truncate">
                  {selectedCityName || "Todas as cidades"}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showCityDropdown ? "rotate-180" : ""}`} />
              </button>

              {showCityDropdown && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                  <button
                    onClick={() => selectCity(null)}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted transition-colors border-b border-border text-muted-foreground"
                  >
                    Mostrar todas
                  </button>
                  {availableCities?.map((city, i) => (
                    <button
                      key={i}
                      onClick={() => selectCity(city)}
                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-muted transition-colors border-b border-border last:border-0 font-medium"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground">
                {loading ? "..." : `${activeRegions.length} região${activeRegions.length !== 1 ? "ões" : ""}`}
              </span>
            </div>
          </div>

          <div className="w-full" style={{ height: "calc(100% - 53px)" }}>
            <UnifiedMap regions={activeRegions} centerCity={null} />
          </div>
        </div>

        {/* Regions list */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Tabela de preços por região
          </h3>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-card rounded-xl h-16" />
              ))}
            </div>
          ) : activeRegions.length === 0 ? (
            <div className="bg-card rounded-2xl p-6 text-center shadow-card border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Nenhuma região configurada nesta cidade ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRegions.map((region) => (
                <div
                  key={region.id}
                  className="bg-card rounded-xl px-4 py-3 shadow-card flex items-center gap-3 border border-border/50"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${region.color}22` }}
                  >
                    <MapPin className="h-4.5 w-4.5" style={{ color: region.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{region.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: region.color }} />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {selectedCityName || "Global"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-green-500/10 px-3 py-1.5 rounded-xl">
                    <DollarSign className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-sm font-bold text-green-500">
                      R$ {Number(region.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
}
