import { useState, useEffect, useRef, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { CityServiceList } from "@/components/admin/CityServiceList";
import { useCity } from "@/contexts/CityContext";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Bike, Search, MapPin, Navigation, MessageSquare, Compass, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const escapeHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function TrackingPage() {
  const { data: allDrivers, isLoading: isLoadingDrivers } = useDrivers();
  const { data: companies } = useCompanies();
  const { selectedCity, selectedCityCoords } = useCity();
  
  const [search, setSearch] = useState("");
  const [centerCity, setCenterCity] = useState<{ name: string; lat: number; lng: number } | null>(() => {
    return selectedCityCoords ? { name: selectedCityCoords.name, lat: selectedCityCoords.lat, lng: selectedCityCoords.lng } : null;
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Filter online drivers that have valid coordinates
  const activeDrivers = useMemo(() => {
    return (allDrivers ?? []).filter(
      (d) => d.is_online === true && d.latitude != null && d.longitude != null
    );
  }, [allDrivers]);

  // Filter list based on search query
  const filteredDrivers = useMemo(() => {
    return activeDrivers.filter((d) =>
      !search || (d.full_name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [activeDrivers, search]);

  // Determine theme dynamically
  const isDarkTheme = useMemo(() => {
    return document.documentElement.classList.contains("dark");
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Determine initial map center based on: selected city context, first company, or default fallback
    let initialCenter: [number, number] = [-56.0974, -15.5989]; // Cuiabá fallback
    if (centerCity) {
      initialCenter = [centerCity.lng, centerCity.lat];
    } else if (selectedCityCoords) {
      initialCenter = [selectedCityCoords.lng, selectedCityCoords.lat];
    } else if (companies && companies.length > 0) {
      const companyWithLocation = companies.find(c => c.latitude != null && c.longitude != null);
      if (companyWithLocation) {
        initialCenter = [companyWithLocation.longitude!, companyWithLocation.latitude!];
      }
    }

    const mapInstance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: isDarkTheme
        ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: initialCenter,
      zoom: 12,
    });

    mapInstance.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapRef.current = mapInstance;

    // Use HTML5 Geolocation API to detect customer/admin current location and focus city automatically
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Only automatically focus current position if the user hasn't explicitly set a filter city
          if (!selectedCityCoords && !centerCity) {
            mapInstance.flyTo({
              center: [longitude, latitude],
              zoom: 13,
              duration: 1500
            });
          }
        },
        (error) => {
          console.warn("Geolocation API access error/denied:", error);
        }
      );
    }

    return () => {
      try {
        if (markersRef.current) {
          markersRef.current.forEach((m) => m.remove());
          markersRef.current = [];
        }
        if (mapInstance) {
          mapInstance.remove();
        }
      } catch (e) {
        console.warn("Maplibre remove error safely caught:", e);
      }
      mapRef.current = null;
    };
  }, [companies]); // eslint-disable-line react-hooks/exhaustive-deps

  // Center map on city changes (from overlay or city header filter)
  useEffect(() => {
    if (!mapRef.current) return;
    if (centerCity) {
      mapRef.current.flyTo({
        center: [centerCity.lng, centerCity.lat],
        zoom: 13,
        duration: 1500,
      });
    } else if (selectedCityCoords) {
      mapRef.current.flyTo({
        center: [selectedCityCoords.lng, selectedCityCoords.lat],
        zoom: 13,
        duration: 1500,
      });
    }
  }, [centerCity, selectedCityCoords]);

  // Render Markers (Drivers + Companies)
  useEffect(() => {
    const currentMap = mapRef.current;
    if (!currentMap) return;

    // Clean old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Render Driver Markers
    activeDrivers.forEach((driver) => {
      const lat = driver.latitude;
      const lng = driver.longitude;
      if (!lat || !lng) return;

      const el = document.createElement("div");
      el.className = "driver-marker-wrapper";

      // Premium marker markup with pulse animation and name bubble
      el.innerHTML = `
        <div class="pin-wrapper" style="
          position: relative;
          cursor: pointer;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          <!-- Pulse Effect -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
            background: #22c55e;
            border-radius: 50%;
            opacity: 0.6;
            animation: pinPulse 2s ease-out infinite;
          "></div>
          
          <!-- Outer Pin Circle -->
          <div style="
            width: 42px; 
            height: 42px; 
            border-radius: 50%; 
            background: #22c55e; 
            border: 3px solid white; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            position: relative;
            z-index: 2;
          ">
            <!-- Icon Core -->
            <div style="
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            ">
              <span style="font-size: 16px;">🏍️</span>
            </div>
          </div>
          
          <!-- Label Bubble below Pin -->
          <div style="
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: #f8fafc;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 800;
            white-space: nowrap;
            z-index: 3;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            border: 1px solid rgba(255, 255, 255, 0.1);
          ">${escapeHtml(driver.full_name?.split(" ")[0] || "Entregador")}</div>
        </div>
        
        <style>
          @keyframes pinPulse {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
          }
        </style>
      `;

      // Custom popup tooltip for map click
      const popupContent = `
        <div style="
          padding: 14px; 
          font-family: system-ui, -apple-system, sans-serif; 
          min-width: 180px;
          background: #ffffff;
          border-radius: 16px;
          color: #0f172a;
        ">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #f0fdf4; display: flex; align-items: center; justify-content: center; font-size: 20px;">
              🏍️
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${escapeHtml(driver.full_name || "Entregador")}</div>
              <div style="font-size: 11px; color: #22c55e; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #22c55e;"></span>
                Online
              </div>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; color: #475569;">
            <div><strong>Veículo:</strong> ${escapeHtml(driver.vehicle_type || "motorcycle")}</div>
            ${driver.vehicle_plate ? `<div><strong>Placa:</strong> ${escapeHtml(driver.vehicle_plate)}</div>` : ""}
            ${driver.phone ? `
              <a href="https://wa.me/55${driver.phone.replace(/\D/g, "")}" target="_blank" rel="noopener noreferrer" style="
                text-decoration: none;
                background: #25D366;
                color: white;
                padding: 6px 10px;
                border-radius: 8px;
                text-align: center;
                font-weight: 700;
                margin-top: 6px;
                display: block;
                font-size: 11px;
              ">WhatsApp Direct</a>
            ` : ""}
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(popupContent))
        .addTo(currentMap);

      markersRef.current.push(marker);
    });

    // Render Company Markers
    (companies ?? []).forEach((company) => {
      if (!company.latitude || !company.longitude) return;

      const el = document.createElement("div");
      const statusColor = company.is_active ? "#22c55e" : "#64748b";
      
      el.innerHTML = `
        <div style="
          width: 32px; height: 32px; border-radius: 8px;
          background: ${statusColor};
          border: 2px solid white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          font-size: 14px;
          cursor: pointer;
        ">🏪</div>
      `;

      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
        <div style="font-family: system-ui, sans-serif; padding: 4px; color: #0f172a;">
          <strong style="font-size: 12px;">${escapeHtml(company.name)}</strong>
          <div style="margin-top: 4px; font-size: 10px; color: #64748b;">
            ${escapeHtml(company.address || "Sem endereço")}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([company.longitude, company.latitude])
        .setPopup(popup)
        .addTo(currentMap);

      markersRef.current.push(marker);
    });

  }, [activeDrivers, companies]);

  // Center/Fly to selected driver
  const handleLocateDriver = (driver: any) => {
    if (driver.longitude && driver.latitude && mapRef.current) {
      mapRef.current.flyTo({
        center: [driver.longitude, driver.latitude],
        zoom: 16,
        duration: 1500,
      });
    }
  };

  return (
    <AdminLayout title="Rastreio em Tempo Real" subtitle="Monitore a localização da frota no mapa" fullHeight>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full w-full p-4 md:p-6 min-h-[500px] min-w-0 min-h-0 overflow-hidden">
        
        {/* Left Sidebar - Active Drivers List */}
        <div className="lg:col-span-1 bg-card border border-border/50 rounded-[2rem] p-5 flex flex-col h-full shadow-lg">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-warning" />
              <span className="text-base font-black text-foreground">Em campo</span>
            </div>
            <span className="bg-warning/15 text-warning px-2.5 py-0.5 rounded-full text-xs font-black">
              {activeDrivers.length}
            </span>
          </div>

          {/* Search box */}
          {activeDrivers.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar motoboy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-muted/40 border border-border/30 rounded-xl outline-none focus:border-warning/50 transition-colors placeholder:text-muted-foreground/60 text-foreground"
              />
            </div>
          )}

          {/* List Content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
            {isLoadingDrivers ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <div className="h-6 w-6 border-2 border-warning border-t-transparent animate-spin rounded-full"></div>
                <span className="text-xs font-bold uppercase tracking-wider">Carregando frota...</span>
              </div>
            ) : activeDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full py-10 px-4">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Compass className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                  Nenhum motoboy online com localização ativa no momento.
                </p>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                Nenhum entregador encontrado para "{search}"
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredDrivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => handleLocateDriver(driver)}
                    className="w-full text-left flex items-center justify-between p-3 rounded-2xl bg-muted/30 hover:bg-warning/10 border border-transparent hover:border-warning/20 transition-all group duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center overflow-hidden">
                          {driver.avatar_url ? (
                            <img src={driver.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-base">🏍️</span>
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-foreground truncate group-hover:text-warning transition-colors">
                          {driver.full_name}
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                          {driver.vehicle_type || "motorcycle"}
                        </p>
                      </div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-warning/10 text-warning opacity-0 group-hover:opacity-100 transition-all hover:bg-warning/20">
                      <Navigation className="h-3 w-3 fill-warning/25" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Map Area */}
        <div className="lg:col-span-3 relative bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-lg h-full">
          
          {/* Map Container */}
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* City Service overlay */}
          <div className="absolute top-4 left-4 right-4 z-10 max-w-sm">
            <CityServiceList
              variant="horizontal"
              selectedCity={centerCity?.name}
              onSelect={(name, [lng, lat]) => setCenterCity({ name, lat, lng })}
              className="bg-background/80 backdrop-blur-xl p-2.5 rounded-2xl border border-border/50 shadow-2xl max-w-full overflow-hidden"
            />
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

