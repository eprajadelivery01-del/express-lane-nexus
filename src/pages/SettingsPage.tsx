import { AdminLayout } from "@/components/admin/AdminLayout";
import { Settings, Bell, Shield, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <AdminLayout title="Configurações" subtitle="Preferências do sistema">
      <div className="max-w-2xl space-y-4">
        {[
          { icon: Settings, title: "Geral", desc: "Nome da empresa, fuso horário, idioma" },
          { icon: Bell, title: "Notificações", desc: "Alertas de novas corridas, ocorrências" },
          { icon: Shield, title: "Segurança", desc: "Senha, autenticação, permissões" },
          { icon: Palette, title: "Aparência", desc: "Tema, cores, personalização" },
        ].map((item, i) => (
          <div key={i} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
