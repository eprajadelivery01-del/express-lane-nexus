import { AdminLayout } from "@/components/admin/AdminLayout";
import { BarChart3, Download } from "lucide-react";

export default function ReportsPage() {
  return (
    <AdminLayout title="Relatórios" subtitle="Análise de dados e exportação">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Entregas por Empresa", desc: "Relatório detalhado por empresa" },
          { title: "Entregas por Entregador", desc: "Performance individual" },
          { title: "Faturamento por Período", desc: "Análise financeira" },
          { title: "Regiões mais Ativas", desc: "Distribuição geográfica" },
          { title: "Avaliações", desc: "Satisfação dos clientes" },
          { title: "Ocorrências", desc: "Incidentes e resoluções" },
        ].map((report, i) => (
          <div key={i} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow group cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{report.title}</h3>
            <p className="text-xs text-muted-foreground">{report.desc}</p>
            <div className="flex gap-2 mt-3">
              <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">Excel</span>
              <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">PDF</span>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
