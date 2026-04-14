import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Power, MapPin, Truck, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function DriverHomePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driverRecord, setDriverRecord] = useState<{ id: string } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch driver record
  useEffect(() => {
    if (!user) return;
    supabase
      .from("delivery_drivers")
      .select("id, is_online")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDriverRecord({ id: data.id });
          setIsOnline(data.is_online);
        }
      });
  }, [user]);

  const updateLocation = useCallback(async (driverId: string) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase
          .from("delivery_drivers")
          .update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          })
          .eq("id", driverId);
      },
      (err) => console.warn("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const startTracking = useCallback((driverId: string) => {
    // Immediate update
    updateLocation(driverId);
    // Update every 10 seconds
    intervalRef.current = setInterval(() => updateLocation(driverId), 10000);

    // Also watch for significant position changes
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          await supabase
            .from("delivery_drivers")
            .update({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            })
            .eq("id", driverId);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  }, [updateLocation]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  const handleToggle = async () => {
    if (!driverRecord) {
      toast({ title: "Erro", description: "Registro de entregador não encontrado", variant: "destructive" });
      return;
    }

    setLoading(true);
    const newStatus = !isOnline;

    const { error } = await supabase
      .from("delivery_drivers")
      .update({
        is_online: newStatus,
        ...(newStatus ? {} : { latitude: null, longitude: null }),
      })
      .eq("id", driverRecord.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (newStatus) {
      startTracking(driverRecord.id);
      toast({ title: "Você está online!", description: "Sua localização está sendo compartilhada" });
    } else {
      stopTracking();
      toast({ title: "Você está offline", description: "Localização desativada" });
    }

    setIsOnline(newStatus);
    setLoading(false);
  };

  return (
    <DriverLayout title="Início">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Olá, {profile?.full_name || "Entregador"} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isOnline ? "Você está online e recebendo corridas" : "Fique online para receber corridas"}
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading || !driverRecord}
          className={`w-full py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
            isOnline
              ? "bg-success/10 text-success border-2 border-success"
              : "bg-muted text-muted-foreground border-2 border-border"
          }`}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Power className="h-6 w-6" />
          )}
          {loading ? "Atualizando..." : isOnline ? "ONLINE" : "FICAR ONLINE"}
        </button>

        {isOnline && (
          <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-success" />
            <span className="text-xs text-success font-medium">Localização sendo compartilhada em tempo real</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">entregas</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Ganhos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">R$ 0</p>
            <p className="text-xs text-muted-foreground">hoje</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card text-center">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {isOnline ? "Aguardando novas corridas..." : "Fique online para ver corridas disponíveis"}
          </p>
        </div>
      </div>
    </DriverLayout>
  );
}
