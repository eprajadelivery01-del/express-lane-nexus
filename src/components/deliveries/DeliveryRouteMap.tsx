import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/client";
import type { DeliveryWithRelations } from "@/services/deliveries";
import { Loader2, MapPin } from "lucide-react";

interface DeliveryRouteMapProps {
  delivery: DeliveryWithRelations;
  height?: number;
}

type LngLat = [number, number];

export function DeliveryRouteMap({ delivery, height = 300 }: DeliveryRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pickupMarker = useRef<maplibregl.Marker | null>(null);
  const dropoffMarker = useRef<maplibregl.Marker | null>(null);
  const driverMarker = useRef<maplibregl.Marker | null>(null);

  const [driverPos, setDriverPos] = useState<LngLat | null>(null);
  const [routeCoords, setRouteCoords] = useState<LngLat[] | null>(null);
  const [loading, setLoading] = useState(true);

  const pickup: LngLat | null =
    delivery.pickup_latitude && delivery.pickup_longitude
      ? [delivery.pickup_longitude, delivery.pickup_latitude]
      : null;

  const dropoff: LngLat | null =
    delivery.dropoff_latitude && delivery.dropoff_longitude
      ? [delivery.dropoff_longitude, delivery.dropoff_latitude]
      : delivery.delivery_latitude && delivery.delivery_longitude
      ? [delivery.delivery_longitude, delivery.delivery_latitude]
      : null;

  // Buscar posição do entregador + realtime
  useEffect(() => {
    if (!delivery.driver_id) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchDriver = async () => {
      const { data } = await supabase
        .from("delivery_drivers")
        .select("latitude,longitude")
        .eq("id", delivery.driver_id!)
        .maybeSingle();
      if (!mounted) return;
      if (data?.latitude && data?.longitude) {
        setDriverPos([Number(data.longitude), Number(data.latitude)]);
      }
    };
    fetchDriver();

    const channel = supabase
      .channel(`driver-pos-${delivery.driver_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_drivers",
          filter: `id=eq.${delivery.driver_id}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row?.latitude && row?.longitude) {
            setDriverPos([Number(row.longitude), Number(row.latitude)]);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [delivery.driver_id]);

  // Buscar rota via OSRM
  useEffect(() => {
    const origin = driverPos || pickup;
    if (!origin || !dropoff) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${dropoff[0]},${dropoff[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        const coords = json?.routes?.[0]?.geometry?.coordinates as LngLat[] | undefined;
        setRouteCoords(coords ?? null);
      } catch {
        if (!cancelled) setRouteCoords(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverPos?.[0], driverPos?.[1], pickup?.[0], pickup?.[1], dropoff?.[0], dropoff?.[1]]);

  // Init mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center = driverPos || pickup || dropoff || [-56.0974, -15.5989];
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center,
      zoom: 13,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    return () => {
      try {
        pickupMarker.current?.remove();
        dropoffMarker.current?.remove();
        driverMarker.current?.remove();
        mapRef.current?.remove();
      } catch {}
      pickupMarker.current = null;
      dropoffMarker.current = null;
      driverMarker.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcadores
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const makePin = (color: string, label: string) => {
      const el = document.createElement("div");
      el.style.cssText = `
        width:28px;height:28px;border-radius:50%;
        background:${color};border:3px solid white;
        box-shadow:0 3px 8px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:900;font-size:11px;font-family:sans-serif;
      `;
      el.textContent = label;
      return el;
    };

    if (pickup) {
      pickupMarker.current?.remove();
      pickupMarker.current = new maplibregl.Marker({ element: makePin("#3b82f6", "L") })
        .setLngLat(pickup)
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText("Loja / Coleta"))
        .addTo(map);
    }
    if (dropoff) {
      dropoffMarker.current?.remove();
      dropoffMarker.current = new maplibregl.Marker({ element: makePin("#ef4444", "C") })
        .setLngLat(dropoff)
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText("Cliente / Entrega"))
        .addTo(map);
    }
    if (driverPos) {
      const el = document.createElement("div");
      el.style.cssText = `
        width:34px;height:34px;border-radius:50%;
        background:#22c55e;border:3px solid white;
        box-shadow:0 4px 10px rgba(0,0,0,.4);
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:900;font-size:14px;font-family:sans-serif;
      `;
      el.textContent = "🏍";
      if (!driverMarker.current) {
        driverMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat(driverPos)
          .setPopup(new maplibregl.Popup({ offset: 20 }).setText("Entregador (ao vivo)"))
          .addTo(map);
      } else {
        driverMarker.current.setLngLat(driverPos);
      }
    }

    // Ajustar bounds
    const pts: LngLat[] = [pickup, dropoff, driverPos].filter(Boolean) as LngLat[];
    if (pts.length >= 2) {
      const bounds = pts.reduce(
        (b, p) => b.extend(p as [number, number]),
        new maplibregl.LngLatBounds(pts[0], pts[0]),
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
    }
  }, [pickup?.[0], pickup?.[1], dropoff?.[0], dropoff?.[1], driverPos?.[0], driverPos?.[1]]);

  // Linha da rota
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => {
      const m = mapRef.current;
      if (!m) return;
      if (m.getLayer("route-line")) m.removeLayer("route-line");
      if (m.getSource("route-src")) m.removeSource("route-src");
      if (!routeCoords || routeCoords.length < 2) return;
      m.addSource("route-src", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: routeCoords },
        },
      });
      m.addLayer({
        id: "route-line",
        type: "line",
        source: "route-src",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ff851b", "line-width": 5, "line-opacity": 0.85 },
      });
    };
    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [routeCoords]);

  if (!pickup && !dropoff && !driverPos) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted/40 border border-border rounded-xl text-xs text-muted-foreground">
        <MapPin className="h-4 w-4" />
        Sem coordenadas disponíveis para exibir a rota.
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute top-2 left-2 flex items-center gap-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold shadow">
          <Loader2 className="h-3 w-3 animate-spin" /> Traçando rota…
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex gap-2 text-[10px] font-bold">
        <span className="bg-background/90 backdrop-blur px-2 py-1 rounded shadow">🔵 Loja</span>
        <span className="bg-background/90 backdrop-blur px-2 py-1 rounded shadow">🔴 Cliente</span>
        {driverPos && (
          <span className="bg-background/90 backdrop-blur px-2 py-1 rounded shadow">🟢 Entregador</span>
        )}
      </div>
    </div>
  );
}
