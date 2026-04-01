import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Truck, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function BusinessHomePage() {
  const { profile } = useAuth();

  return (
    <BusinessLayout title="Início">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Olá, {profile?.full_name || "Lojista"} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas entregas</p>
        </div>

        {/* Quick action */}
        <Link
          to="/business/new-delivery"
          className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-3"
        >
          <Plus className="h-6 w-6" />
          Nova Entrega
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <Clock className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">0</p>
            <p className="text-[10px] text-muted-foreground">Pendentes</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <Truck className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">0</p>
            <p className="text-[10px] text-muted-foreground">Em rota</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <CheckCircle className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">0</p>
            <p className="text-[10px] text-muted-foreground">Concluídas</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card text-center">
          <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma entrega recente</p>
        </div>
      </div>
    </BusinessLayout>
  );
}
