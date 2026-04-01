import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Power, MapPin, Truck } from "lucide-react";
import { useState } from "react";

export default function DriverHomePage() {
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState(false);

  return (
    <DriverLayout title="Início">
      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Olá, {profile?.full_name || "Entregador"} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isOnline ? "Você está online e recebendo corridas" : "Fique online para receber corridas"}
          </p>
        </div>

        {/* Online toggle */}
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`w-full py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-3 ${
            isOnline
              ? "bg-success/10 text-success border-2 border-success"
              : "bg-muted text-muted-foreground border-2 border-border"
          }`}
        >
          <Power className="h-6 w-6" />
          {isOnline ? "ONLINE" : "FICAR ONLINE"}
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* Pending deliveries placeholder */}
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
