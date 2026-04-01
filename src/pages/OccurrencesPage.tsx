import { AdminLayout } from "@/components/admin/AdminLayout";
import { mockOccurrences } from "@/data/mockData";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  motorcycle_issue: "Problema na Moto",
  accident: "Acidente",
  robbery: "Assalto",
};

export default function OccurrencesPage() {
  return (
    <AdminLayout title="Ocorrências" subtitle="Relatos e incidentes dos entregadores">
      <div className="space-y-4">
        {mockOccurrences.map((occ) => (
          <div key={occ.id} className="bg-card rounded-xl p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  occ.status === "open" ? "bg-destructive/10" : "bg-success/10"
                )}>
                  <AlertTriangle className={cn("h-5 w-5", occ.status === "open" ? "text-destructive" : "text-success")} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-foreground">{typeLabels[occ.type]}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      occ.status === "open" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                    )}>
                      {occ.status === "open" ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      {occ.status === "open" ? "Aberta" : "Resolvida"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{occ.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Entregador: <span className="font-medium text-foreground">{occ.driver_name}</span>
                    {occ.delivery_id && <> • OS #{occ.delivery_id}</>}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(occ.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
