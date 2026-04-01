import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useOnlineDrivers, type DriverWithProfile } from "@/services/drivers";
import { useRegions } from "@/services/regions";
import { useDeliveries } from "@/services/deliveries";

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const { data: drivers } = useOnlineDrivers();
  const { data: regions } = useRegions();
  const { data: deliveriesData } = useDeliveries({ status: "in_route" });

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-56.0974, -15.5989], // Cuiabá
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Render region polygons
  useEffect(() => {
    const m = map.current;
    if (!m || !regions) return;

    const render = () => {
      regions.forEach((region) => {
        const fillId = `region-fill-${region.id}`;
        const lineId = `region-line-${region.id}`;
        const srcId = `region-${region.id}`;

        if (m.getLayer(fillId)) m.removeLayer(fillId);
        if (m.getLayer(lineId)) m.removeLayer(lineId);
        if (m.getSource(srcId)) m.removeSource(srcId);

        if (!region.geometry) return;
        const geojson = region.geometry as any;
        if (geojson.type !== "Polygon") return;

        m.addSource(srcId, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: geojson },
        });

        m.addLayer({
          id: fillId,
          type: "fill",
          source: srcId,
          paint: { "fill-color": region.color, "fill-opacity": 0.15 },
        });

        m.addLayer({
          id: lineId,
          type: "line",
          source: srcId,
          paint: { "line-color": region.color, "line-width": 2 },
        });
      });
    };

    if (m.isStyleLoaded()) render();
    else m.on("load", render);
  }, [regions]);

  // Render driver markers
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // Clear old markers
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
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
