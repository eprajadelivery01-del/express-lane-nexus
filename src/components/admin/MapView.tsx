import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useOnlineDrivers } from "@/services/drivers";
import { useRegions } from "@/services/regions";
import { useDeliveries } from "@/services/deliveries";

interface MapViewProps {
  centerCity?: { name: string; lat: number; lng: number } | null;
}

export function MapView({ centerCity }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const regionsRenderedRef = useRef<string[]>([]); // track which regions are on map

  const { data: drivers } = useOnlineDrivers();
  const { data: regions } = useRegions();
  const { data: deliveriesData } = useDeliveries({ status: "in_route" });

  // Default center (Cuiabá-MT) or persisted city
  const defaultCenter: [number, number] = centerCity
    ? [centerCity.lng, centerCity.lat]
    : [-56.0974, -15.5989];

  // Init map ONCE — never destroy on city change
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: defaultCenter,
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to city when it changes (without recreating the map)
  useEffect(() => {
    if (!map.current || !centerCity) return;
    map.current.flyTo({ center: [centerCity.lng, centerCity.lat], zoom: 13, duration: 1500 });
  }, [centerCity?.lat, centerCity?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render region polygons whenever regions change
  useEffect(() => {
    const m = map.current;
    if (!m || !regions) return;

    const render = () => {
      // Remove previously rendered regions that are no longer in the list
      regionsRenderedRef.current.forEach((id) => {
        if (m.getLayer(`region-fill-${id}`)) m.removeLayer(`region-fill-${id}`);
        if (m.getLayer(`region-line-${id}`)) m.removeLayer(`region-line-${id}`);
        if (m.getSource(`region-src-${id}`)) m.removeSource(`region-src-${id}`);
      });
      regionsRenderedRef.current = [];

      regions.forEach((region) => {
        if (!region.geometry) return;
        const geojson = region.geometry as any;
        if (geojson.type !== "Polygon") return;

        const srcId = `region-src-${region.id}`;
        const fillId = `region-fill-${region.id}`;
        const lineId = `region-line-${region.id}`;

        // If source already exists (e.g. second render), update data
        if (m.getSource(srcId)) {
          (m.getSource(srcId) as maplibregl.GeoJSONSource).setData({
            type: "Feature",
            properties: { name: region.name, price: region.price },
            geometry: geojson,
          });
        } else {
          m.addSource(srcId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: { name: region.name, price: region.price },
              geometry: geojson,
            },
          });
        }

        if (!m.getLayer(fillId)) {
          m.addLayer({
            id: fillId,
            type: "fill",
            source: srcId,
            paint: { "fill-color": region.color, "fill-opacity": 0.18 },
          });
        } else {
          m.setPaintProperty(fillId, "fill-color", region.color);
        }

        if (!m.getLayer(lineId)) {
          m.addLayer({
            id: lineId,
            type: "line",
            source: srcId,
            paint: { "line-color": region.color, "line-width": 2.5, "line-opacity": 0.8 },
          });
        } else {
          m.setPaintProperty(lineId, "line-color", region.color);
        }

        // Popup on hover
        m.on("mouseenter", fillId, (e) => {
          m.getCanvas().style.cursor = "pointer";
          m.setPaintProperty(fillId, "fill-opacity", 0.36);
          new maplibregl.Popup({ closeButton: false, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:sans-serif;padding:4px 2px">
                <strong>${region.name}</strong><br/>
                <span style="color:#888">R$ ${Number(region.price).toFixed(2)}</span>
              </div>`
            )
            .addTo(m);
        });
        m.on("mouseleave", fillId, () => {
          m.getCanvas().style.cursor = "";
          m.setPaintProperty(fillId, "fill-opacity", 0.18);
        });

        regionsRenderedRef.current.push(region.id);
      });
    };

    if (m.isStyleLoaded()) render();
    else m.once("load", render);
  }, [regions]);

  // Render driver markers (realtime)
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current = [];

    (drivers ?? []).forEach((driver) => {
      if (!driver.latitude || !driver.longitude) return;

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width: 36px; height: 36px; border-radius: 50%;
          background: #22c55e;
          border: 3px solid white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          font-size: 14px;
        ">🏍️</div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([driver.longitude, driver.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong>${driver.profiles?.full_name || "Entregador"}</strong><br/>
              <span style="color: #22c55e">● Online</span><br/>
              <small>${driver.vehicle} • ⭐ ${Number(driver.rating).toFixed(1)}</small>
            </div>
          `)
        )
        .addTo(m);

      markersRef.current.push(marker);
    });
  }, [drivers]);

  return (
    <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />
  );
}
