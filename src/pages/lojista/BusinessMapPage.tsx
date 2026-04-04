import { useState, useEffect, useRef, useCallback } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, DollarSign, Loader2, Mail, Send, LinkIcon, RefreshCw, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const CITY_STORAGE_KEY = "epj_selected_city";

type Region = {
  id: string;
  name: string;
  color: string;
  price: number;
  geometry: any;
  is_active: boolean;
};

export default function BusinessMapPage() {
  const { toast } = useToast();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [integratorEmail, setIntegratorEmail] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  // City persistence (shared key with admin dashboard)
  const [selectedCity, setSelectedCity] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Load saved city on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CITY_STORAGE_KEY);
      if (stored) setSelectedCity(JSON.parse(stored));
    } catch {}
  }, []);

  // Load regions
  const loadRegions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("regions")
      .select("id, name, color, price, geometry, is_active")
      .eq("is_active", true)
      .order("name");
    setRegions((data as Region[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadRegions(); }, []);

  // City search
  const searchCity = useCallback((query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setCitySuggestions([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingCity(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
        const data = await res.json();
        setCitySuggestions(data.map((r: any) => ({
          name: r.display_name.split(",").slice(0, 3).join(","),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })));
      } catch {}
      setSearchingCity(false);
    }, 400);
  }, []);

  const selectCity = (city: { name: string; lat: number; lng: number }) => {
    setSelectedCity(city);
    try { localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city)); } catch {}
    setCitySuggestions([]);
    setCityQuery("");
    // Fly to city if map is ready
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [city.lng, city.lat], zoom: 13, duration: 1500 });
    }
  };

  const clearCity = () => {
    setSelectedCity(null);
    try { localStorage.removeItem(CITY_STORAGE_KEY); } catch {}
  };

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const center: [number, number] = selectedCity
      ? [selectedCity.lng, selectedCity.lat]
      : [-56.0974, -15.5989];
    const m = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center,
      zoom: 11,
    });
    m.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render regions
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !regions.length) return;

    const renderRegions = () => {
      // Remove old layers/sources
      regions.forEach((r) => {
        [`rfill-${r.id}`, `rline-${r.id}`, `rlabel-${r.id}`].forEach((l) => {
          if (m.getLayer(l)) m.removeLayer(l);
        });
        if (m.getSource(`region-${r.id}`)) m.removeSource(`region-${r.id}`);
      });

      regions.forEach((region) => {
        if (!region.geometry || region.geometry.type !== "Polygon") return;

        m.addSource(`region-${region.id}`, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { name: region.name, price: region.price, color: region.color },
            geometry: region.geometry,
          },
        });

        m.addLayer({
          id: `rfill-${region.id}`,
          type: "fill",
          source: `region-${region.id}`,
          paint: { "fill-color": region.color, "fill-opacity": 0.22 },
        });

        m.addLayer({
          id: `rline-${region.id}`,
          type: "line",
          source: `region-${region.id}`,
          paint: { "line-color": region.color, "line-width": 2.5 },
        });

        // Hover
        m.on("mouseenter", `rfill-${region.id}`, (e) => {
          m.getCanvas().style.cursor = "pointer";
          m.setPaintProperty(`rfill-${region.id}`, "fill-opacity", 0.45);
          if (popupRef.current) popupRef.current.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:sans-serif;padding:4px 2px">
                <strong style="font-size:13px">${region.name}</strong><br/>
                <span style="color:#aaa;font-size:12px">R$ ${Number(region.price).toFixed(2)}</span>
              </div>`
            )
            .addTo(m);
        });

        m.on("mouseleave", `rfill-${region.id}`, () => {
          m.getCanvas().style.cursor = "";
          m.setPaintProperty(`rfill-${region.id}`, "fill-opacity", 0.22);
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        });
      });

      // Fit to regions
      if (regions.length > 0) {
        const allCoords: [number, number][] = [];
        regions.forEach((r) => {
          if (r.geometry?.coordinates?.[0]) {
            (r.geometry.coordinates[0] as [number, number][]).forEach((c) => allCoords.push(c));
          }
        });
        if (allCoords.length > 1) {
          const lngs = allCoords.map((c) => c[0]);
          const lats = allCoords.map((c) => c[1]);
          m.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 40, duration: 1000 }
          );
        }
      }
    };

    if (m.isStyleLoaded()) renderRegions();
    else m.on("load", renderRegions);
  }, [regions]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integratorEmail.trim()) return;
    setSendingRequest(true);
    // Simulate sending (in production, send via Supabase edge function or email)
    await new Promise((res) => setTimeout(res, 1200));
    toast({
      title: "Solicitação enviada!",
      description: `Sua solicitação de integração foi enviada para o admin.`,
    });
    setIntegratorEmail("");
    setSendingRequest(false);
  };

  const activeRegions = regions.filter((r) => r.is_active);

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
            {/* City selector */}
            <div className="relative flex-1">
              {selectedCity ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{selectedCity.name}</span>
                  <button onClick={clearCity} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={(e) => { setCityQuery(e.target.value); searchCity(e.target.value); }}
                    placeholder="Fixar cidade no mapa..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {searchingCity && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
                </div>
              )}
              {citySuggestions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                  {citySuggestions.map((city, i) => (
                    <button
                      key={i}
                      onClick={() => selectCity(city)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border last:border-0"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground">
                {loading ? "..." : `${activeRegions.length} região${activeRegions.length !== 1 ? "ões" : ""}`}
              </span>
              <button
                onClick={loadRegions}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-1"
              >
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {activeRegions.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-[calc(100%-53px)] text-center px-6">
              <MapPin className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">0 regiões ativas</p>
              <p className="text-xs text-muted-foreground mt-1">
                As regiões desenhadas pelo admin aparecerão aqui com seus respectivos valores.
              </p>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full" style={{ height: "calc(100% - 53px)" }} />
          )}
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
            <div className="bg-card rounded-2xl p-6 text-center shadow-card">
              <p className="text-sm text-muted-foreground">Nenhuma região configurada pelo admin ainda.</p>
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
                      <span className="text-xs text-muted-foreground">Região de entrega ativa</span>
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
