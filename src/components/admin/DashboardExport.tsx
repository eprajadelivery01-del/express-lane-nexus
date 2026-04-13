import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { DeliveryWithRelations } from "@/services/deliveries";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Props {
  deliveries: DeliveryWithRelations[];
  period: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", broadcasted: "Enviado", accepted: "Aceito",
  collecting: "Coletando", in_transit: "Em Trânsito", delivered: "Entregue",
  cancelled: "Cancelado", returned: "Devolvido",
};

function exportCSV(deliveries: DeliveryWithRelations[], period: string) {
  const headers = ["ID", "Cliente", "Empresa", "Status", "Valor", "Criado em", "Entregue em"];
  const rows = deliveries.map(d => [
    d.id.slice(0, 8),
    d.customer_name || "",
    d.companies?.name || "",
    STATUS_LABELS[d.status] || d.status,
    Number(d.value ?? 0).toFixed(2),
    d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : "",
    d.delivered_at ? new Date(d.delivered_at).toLocaleString("pt-BR") : "",
  ]);

  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `dashboard_${period}_${new Date().toISOString().split("T")[0]}.csv`);
  toast.success("CSV exportado com sucesso!");
}

function exportPDF(deliveries: DeliveryWithRelations[], period: string) {
  const delivered = deliveries.filter(d => d.status === "delivered");
  const revenue = delivered.reduce((s, d) => s + Number(d.value ?? 0), 0);

  const content = `
    <html><head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
      .stats { display: flex; gap: 20px; margin-bottom: 24px; }
      .stat { background: #f5f5f5; padding: 16px 20px; border-radius: 10px; flex:1; }
      .stat-val { font-size: 24px; font-weight: bold; }
      .stat-lbl { font-size: 11px; color: #888; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #1a1a2e; color: white; padding: 8px 10px; text-align: left; }
      td { padding: 7px 10px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #fafafa; }
    </style></head><body>
      <h1>Relatório Dashboard</h1>
      <div class="sub">Período: ${period} · Gerado em ${new Date().toLocaleString("pt-BR")}</div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${deliveries.length}</div><div class="stat-lbl">Total Entregas</div></div>
        <div class="stat"><div class="stat-val">${delivered.length}</div><div class="stat-lbl">Entregues</div></div>
        <div class="stat"><div class="stat-val">R$ ${revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div><div class="stat-lbl">Faturamento</div></div>
      </div>
      <table>
        <tr><th>#</th><th>Cliente</th><th>Empresa</th><th>Status</th><th>Valor</th><th>Data</th></tr>
        ${deliveries.slice(0, 100).map((d, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${d.customer_name || "-"}</td>
            <td>${d.companies?.name || "-"}</td>
            <td>${STATUS_LABELS[d.status] || d.status}</td>
            <td>R$ ${Number(d.value ?? 0).toFixed(2)}</td>
            <td>${d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : "-"}</td>
          </tr>
        `).join("")}
      </table>
      ${deliveries.length > 100 ? `<p style="margin-top:12px;color:#888;font-size:11px;">Mostrando 100 de ${deliveries.length} entregas</p>` : ""}
    </body></html>
  `;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(content);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
    toast.success("PDF pronto para impressão!");
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DashboardExport({ deliveries, period }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(deliveries, period)}>
          📊 Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(deliveries, period)}>
          📄 Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
