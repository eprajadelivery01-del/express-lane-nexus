import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mockDrivers, mockCompanies } from "@/data/mockData";

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-46.6388, -23.5489], // São Paulo
      zoom: 13,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    // Add driver markers
    mockDrivers.forEach((driver, i) => {
      const offsets = [
        [-46.645, -23.545],
        [-46.635, -23.550],
        [-46.630, -23.555],
        [-46.650, -23.560],
      ];
      const [lng, lat] = offsets[i] || [-46.640, -23.550];

      const el = document.createElement("div");
      el.className = "driver-marker";
      el.innerHTML = `
        <div style="
          width: 36px; height: 36px; border-radius: 50%;
          background: ${driver.is_online ? "#22c55e" : "#94a3b8"};
          border: 3px solid white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          font-size: 14px;
        ">🏍️</div>
      `;

      new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong>${driver.name}</strong><br/>
              <span style="color: ${driver.is_online ? '#22c55e' : '#94a3b8'}">
                ${driver.is_online ? "● Online" : "● Offline"}
              </span><br/>
              <small>${driver.vehicle} • ⭐ ${driver.rating}</small>
            </div>
          `)
        )
        .addTo(map.current!);
    });

    // Add company markers
    mockCompanies.forEach((company, i) => {
      const offsets = [
        [-46.642, -23.548],
        [-46.632, -23.558],
        [-46.652, -23.542],
        [-46.625, -23.552],
      ];
      const [lng, lat] = offsets[i] || [-46.640, -23.555];

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          background: white; border-radius: 8px; padding: 4px 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          display: flex; align-items: center; gap: 6px;
          font-family: sans-serif; font-size: 13px; font-weight: 600;
          white-space: nowrap;
        ">
          📍 ${company.name}
        </div>
      `;

      new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong>${company.name}</strong><br/>
              <small>${company.address}</small><br/>
              <small>${company.phone}</small>
            </div>
          `)
        )
        .addTo(map.current!);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />
  );
}
