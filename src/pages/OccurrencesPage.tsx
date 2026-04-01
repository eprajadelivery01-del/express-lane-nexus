import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const typeLabels: Record<string, string> = {
  motorcycle_issue: "Problema na Moto",
  accident: "Acidente",
  robbery: "Assalto",
  other: "Outro",
};

function useOccurrences() {
  return useQuery({
    queryKey: ["occurrences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("occurrences")
        .select("*, delivery_drivers!occurrences_driver_id_fkey(user_id, profiles:user_id(full_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function OccurrencesPage() {
  const { data: occurrences, isLoading } = useOccurrences();

  return (
    <AdminLayout title="Ocorrências" subtitle="Relatos e incidentes dos entregadores">
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {(occurrences ?? []).map((occ) => {
            const driverName = (occ as any).delivery_drivers?.profiles?.full_name || "—";
            return (
              <div key={occ.id} className="bg-card rounded-xl p-5 shadow-card border border-border">
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
                        <span className="text-sm font-bold text-foreground">{typeLabels[occ.type] || occ.type}</span>
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
                        Entregador: <span className="font-medium text-foreground">{driverName}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(occ.created_at), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            );
          })}
          {(occurrences ?? []).length === 0 && (
            <div className="p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
