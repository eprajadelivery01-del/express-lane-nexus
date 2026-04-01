import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useInvitations, useCreateInvitation } from "@/services/users";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Building2, Bike, Plus, Star, Mail, Copy, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Tab = "drivers" | "companies" | "invitations";

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>("drivers");
  const { data: drivers, isLoading: loadingDrivers } = useDrivers();
  const { data: companies, isLoading: loadingCompanies } = useCompanies();
  const { data: invitations, isLoading: loadingInvites } = useInvitations();

  return (
    <AdminLayout title="Usuários" subtitle="Gestão de entregadores, empresas e convites">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit">
          {([
            { key: "drivers", icon: Bike, label: "Entregadores" },
            { key: "companies", icon: Building2, label: "Empresas" },
            { key: "invitations", icon: Mail, label: "Convites" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tab === t.key ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
        <InviteDialog />
      </div>

      {tab === "drivers" && (
        loadingDrivers ? <LoadingGrid /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(drivers ?? []).map((driver) => (
              <div key={driver.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {driver.profiles?.avatar_url ? (
                        <img src={driver.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {(driver.profiles?.full_name || "?").split(" ").map(n => n[0]).join("")}
                        </span>
                      )}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${driver.is_online ? "bg-success" : "bg-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{driver.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{driver.profiles?.phone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{driver.vehicle}</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-3.5 w-3.5 text-warning fill-warning" /> {Number(driver.rating).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
            {(drivers ?? []).length === 0 && <EmptyState text="Nenhum entregador cadastrado" />}
          </div>
        )
      )}

      {tab === "companies" && (
        loadingCompanies ? <LoadingGrid /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(companies ?? []).map((company) => (
              <div key={company.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.phone || "—"}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{company.address || "—"}</p>
              </div>
            ))}
            {(companies ?? []).length === 0 && <EmptyState text="Nenhuma empresa cadastrada" />}
          </div>
        )
      )}

      {tab === "invitations" && (
        loadingInvites ? <LoadingGrid /> : (
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground p-4">Email</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-4">Role</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-4">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-4">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(invitations ?? []).map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="p-4 text-sm text-foreground">{inv.email}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{inv.role}</span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        inv.status === "pending" && "bg-warning/10 text-warning",
                        inv.status === "accepted" && "bg-success/10 text-success",
                        inv.status === "expired" && "bg-muted text-muted-foreground"
                      )}>{inv.status}</span>
                    </td>
                    <td className="p-4">
                      {inv.status === "pending" && <CopyLinkButton token={inv.token} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(invitations ?? []).length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm text-muted-foreground">Nenhum convite enviado</p>
              </div>
            )}
          </div>
        )
      )}
    </AdminLayout>
  );
}

function InviteDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const createInvite = useCreateInvitation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"company" | "driver">("driver");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await createInvite.mutateAsync({ email, role, invitedBy: user.id });
      toast({ title: "Convite criado!" });
      setEmail("");
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Convidar Usuário
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tipo</label>
            <div className="flex gap-2">
              {(["driver", "company"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                    role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  {r === "driver" ? "Entregador" : "Empresa"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={createInvite.isPending}
            className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createInvite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar Convite
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/invite/${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-primary hover:underline">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-xl p-5 shadow-card animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full p-12 text-center">
      <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
