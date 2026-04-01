import { useState, useEffect, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRegions, useCreateRegion, useUpdateRegion, useDeleteRegion } from "@/services/regions";
import type { RegionRow } from "@/services/regions";
import { MapPin, Plus, Trash2, Save, Pencil, Loader2, DollarSign, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function RegionsPage() {
  const { data: regions, isLoading } = useRegions();
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const deleteRegion = useDeleteRegion();
  const { toast } = useToast();

  const [selectedRegion, setSelectedRegion] = useState<RegionRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#3B82F6");
  const [editPrice, setEditPrice] = useState("0");
  const [editCity, setEditCity] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);

  // City search
  const [citySearch, setCitySearch] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const m = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-56.0974, -15.5989],
      zoom: 12,
    });
    m.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, []);

  // Render regions
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !regions) return;
    const handleLoad = () => {
      regions.forEach((r) => {
        if (m.getLayer(`region-fill-${r.id}`)) m.removeLayer(`region-fill-${r.id}`);
        if (m.getLayer(`region-line-${r.id}`)) m.removeLayer(`region-line-${r.id}`);
        if (m.getSource(`region-${r.id}`)) m.removeSource(`region-${r.id}`);
      });
      regions.forEach((region) => {
        if (!region.geometry) return;
        const geojson = region.geometry as any;
        if (geojson.type !== "Polygon") return;
        m.addSource(`region-${region.id}`, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: geojson },
        });
        m.addLayer({
          id: `region-fill-${region.id}`,
          type: "fill",
          source: `region-${region.id}`,
          paint: {
            "fill-color": region.color,
            "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.4, 0.2],
          },
        });
        m.addLayer({
          id: `region-line-${region.id}`,
          type: "line",
          source: `region-${region.id}`,
          paint: { "line-color": region.color, "line-width": 2.5 },
        });
        m.on("click", `region-fill-${region.id}`, () => {
          setSelectedRegion(region);
          setEditName(region.name);
          setEditColor(region.color);
          setEditPrice(String(region.price));
          setIsDrawing(false);
          setDrawnPoints([]);
        });
        m.on("mouseenter", `region-fill-${region.id}`, () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", `region-fill-${region.id}`, () => { if (!isDrawing) m.getCanvas().style.cursor = ""; });
      });
      if (m.getLayer("draw-line")) m.removeLayer("draw-line");
      if (m.getLayer("draw-points")) m.removeLayer("draw-points");
      if (m.getSource("draw")) m.removeSource("draw");
    };
    if (m.isStyleLoaded()) handleLoad();
    else m.on("load", handleLoad);
  }, [regions]);

  // Drawing mode
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawing) return;
      setDrawnPoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };
    m.on("click", handleClick);
    if (isDrawing) m.getCanvas().style.cursor = "crosshair";
    else m.getCanvas().style.cursor = "";
    return () => { m.off("click", handleClick); };
  }, [isDrawing]);

  // Drawing visualization
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !m.isStyleLoaded()) return;
    if (m.getLayer("draw-line")) m.removeLayer("draw-line");
    if (m.getLayer("draw-points")) m.removeLayer("draw-points");
    if (m.getSource("draw")) m.removeSource("draw");
    if (drawnPoints.length === 0) return;
    const coords = [...drawnPoints];
    if (coords.length > 2) coords.push(coords[0]);
    m.addSource("draw", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: coords.length > 2
              ? { type: "Polygon", coordinates: [coords] }
              : { type: "LineString", coordinates: coords },
          },
          ...drawnPoints.map((p) => ({
            type: "Feature" as const,
            properties: {},
            geometry: { type: "Point" as const, coordinates: p },
          })),
        ],
      },
    });
    if (coords.length > 2) {
      m.addLayer({
        id: "draw-line",
        type: "fill",
        source: "draw",
        filter: ["==", "$type", "Polygon"],
        paint: { "fill-color": editColor, "fill-opacity": 0.3 },
      });
    } else {
      m.addLayer({
        id: "draw-line",
        type: "line",
        source: "draw",
        filter: ["==", "$type", "LineString"],
        paint: { "line-color": editColor, "line-width": 2, "line-dasharray": [2, 2] },
      });
    }
    m.addLayer({
      id: "draw-points",
      type: "circle",
      source: "draw",
      filter: ["==", "$type", "Point"],
      paint: { "circle-radius": 6, "circle-color": editColor, "circle-stroke-width": 2, "circle-stroke-color": "#fff" },
    });
  }, [drawnPoints, editColor]);

  // City search via Nominatim
  const searchCity = useCallback((query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) { setCitySuggestions([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingCity(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br`);
        const data = await res.json();
        setCitySuggestions(data);
      } catch { setCitySuggestions([]); }
      setSearchingCity(false);
    }, 400);
  }, []);

  const selectCity = (item: any) => {
    const m = mapRef.current;
    if (m) {
      m.flyTo({ center: [parseFloat(item.lon), parseFloat(item.lat)], zoom: 13, duration: 1500 });
    }
    setCitySearch(item.display_name.split(",")[0]);
    setEditCity(item.display_name.split(",")[0]);
    setCitySuggestions([]);
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawnPoints([]);
    setSelectedRegion(null);
    setEditName("");
    setEditColor("#3B82F6");
    setEditPrice("0");
    setEditCity("");
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawnPoints([]);
  };

  const undoLastPoint = () => {
    setDrawnPoints((prev) => prev.slice(0, -1));
  };

  const saveNewRegion = async () => {
    if (drawnPoints.length < 3) {
      toast({ title: "Desenhe pelo menos 3 pontos", variant: "destructive" });
      return;
    }
    if (!editName.trim()) {
      toast({ title: "Digite um nome para a região", variant: "destructive" });
      return;
    }
    const coords = [...drawnPoints, drawnPoints[0]];
    const geometry = { type: "Polygon", coordinates: [coords] };
    try {
      await createRegion.mutateAsync({
        name: editName,
        color: editColor,
        price: parseFloat(editPrice) || 0,
        geometry: geometry as any,
      });
      toast({ title: "Região criada!" });
      setIsDrawing(false);
      setDrawnPoints([]);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const saveEditRegion = async () => {
    if (!selectedRegion) return;
    try {
      await updateRegion.mutateAsync({
        id: selectedRegion.id,
        updates: { name: editName, color: editColor, price: parseFloat(editPrice) || 0 },
      });
      toast({ title: "Região atualizada!" });
      setSelectedRegion(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRegion.mutateAsync(id);
      toast({ title: "Região excluída" });
      setSelectedRegion(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout title="Regiões" subtitle="Gestão de regiões e precificação">
      <div className="flex flex-col lg:flex-row gap-0 -m-4 md:-m-6 h-[calc(100vh-73px)]">
        {/* Map */}
        <div className="flex-1 relative min-h-[300px]">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* City search */}
          <div className="absolute top-4 right-4 w-72 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={citySearch}
                onChange={(e) => { setCitySearch(e.target.value); searchCity(e.target.value); }}
                placeholder="Buscar cidade..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:border-primary shadow-md"
              />
              {citySearch && (
                <button onClick={() => { setCitySearch(""); setCitySuggestions([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {citySuggestions.length > 0 && (
              <div className="mt-1 bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                {citySuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectCity(s)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                  >
                    <p className="font-medium text-foreground truncate">{s.display_name.split(",")[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.display_name}</p>
                  </button>
                ))}
              </div>
            )}
            {searchingCity && (
              <div className="mt-1 bg-card rounded-xl border border-border shadow-lg p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Buscando...</span>
              </div>
            )}
          </div>

          {/* Drawing controls */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            {!isDrawing ? (
              <button
                onClick={startDrawing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-md hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Desenhar Região
              </button>
            ) : (
              <>
                <button
                  onClick={saveNewRegion}
                  disabled={drawnPoints.length < 3 || createRegion.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-md disabled:opacity-50"
                >
                  {createRegion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
                {drawnPoints.length > 0 && (
                  <button
                    onClick={undoLastPoint}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card text-foreground text-sm font-medium shadow-md"
                  >
                    Desfazer
                  </button>
                )}
                <button
                  onClick={cancelDrawing}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card text-foreground text-sm font-medium shadow-md"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>

          {isDrawing && (
            <div className="absolute bottom-4 left-4 bg-card rounded-xl p-3 shadow-md text-xs text-muted-foreground z-10">
              Clique no mapa para adicionar pontos • {drawnPoints.length} ponto(s) • Mínimo 3
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-card border-l border-border overflow-y-auto">
          {(selectedRegion || isDrawing) && (
            <div className="p-4 border-b border-border space-y-3">
              <h3 className="font-display font-bold text-foreground text-sm">
                {isDrawing ? "Nova Região" : "Editar Região"}
              </h3>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome da região"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Cor</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <input value={editColor} onChange={(e) => setEditColor(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none" />
                  </div>
                </div>
                <div className="w-28">
                  <label className="text-xs text-muted-foreground mb-1 block">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              {selectedRegion && (
                <div className="flex gap-2">
                  <button
                    onClick={saveEditRegion}
                    disabled={updateRegion.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {updateRegion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar
                  </button>
                  <button
                    onClick={() => handleDelete(selectedRegion.id)}
                    disabled={deleteRegion.isPending}
                    className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Regiões ({regions?.length ?? 0})
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-xl bg-muted h-20" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(regions ?? []).map((region) => (
                  <button
                    key={region.id}
                    onClick={() => {
                      setSelectedRegion(region);
                      setEditName(region.name);
                      setEditColor(region.color);
                      setEditPrice(String(region.price));
                      setIsDrawing(false);
                      setDrawnPoints([]);
                      // Fly to region center
                      const geo = region.geometry as any;
                      if (geo?.type === "Polygon" && geo.coordinates?.[0]) {
                        const coords = geo.coordinates[0] as [number, number][];
                        const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
                        const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
                        mapRef.current?.flyTo({ center: [avgLng, avgLat], zoom: 14, duration: 1000 });
                      }
                    }}
                    className={`w-full text-left rounded-xl p-3 transition-all ${
                      selectedRegion?.id === region.id
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-muted/50 hover:bg-muted border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${region.color}20` }}
                      >
                        <MapPin className="h-4 w-4" style={{ color: region.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{region.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: region.color }} />
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> R$ {Number(region.price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
