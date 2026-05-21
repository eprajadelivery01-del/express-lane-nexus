import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Copy, Check } from "lucide-react";
import { buildInviteLink } from "@/lib/invites";

interface GenerateInviteDialogProps {
  fixedRole?: "driver" | "company";
  triggerLabel?: string;
}

export function GenerateInviteDialog({ fixedRole, triggerLabel }: GenerateInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"driver" | "company">(fixedRole || "driver");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await (supabase as any).from("invitations").insert({
        token,
        role: fixedRole || role,
        email: `pending_${token.slice(0, 8)}@nexus.pro`,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      const inviteRole = fixedRole || role;
      const link = buildInviteLink(token, inviteRole);
      setInviteLink(link);
      toast.success("Link de convite gerado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar convite");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setInviteLink(null);
    setCopied(false);
  };

  const roleLabel = (fixedRole || role) === "driver" ? "Entregador" : "Empresa (Lojista)";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
          <UserPlus className="h-4 w-4" />{triggerLabel || "Gerar Link de Convite"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle>Gerar Link de Convite</DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4 py-2">
            {!fixedRole && (
              <div className="space-y-2">
                <Label>Tipo de parceiro</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">🏍️ Entregador</SelectItem>
                    <SelectItem value="company">🏪 Empresa (Lojista)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full mt-2" onClick={generateLink} disabled={loading}>
              {loading ? "Gerando..." : "Gerar Link de Convite"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted rounded-xl border border-border">
              <p className="text-sm font-mono break-all select-all text-foreground mb-3">{inviteLink}</p>
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="w-full gap-2">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                {copied ? "Link copiado!" : "Copiar link"}
              </Button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}>Gerar outro</Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>Concluído</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
