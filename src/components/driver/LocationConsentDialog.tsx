import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, ShieldCheck, CheckCircle2 } from "lucide-react";

interface LocationConsentDialogProps {
  open: boolean;
  onAccept: () => void;
}

export function LocationConsentDialog({ open, onAccept }: LocationConsentDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-[90vw] sm:max-w-md rounded-3xl border-none shadow-2xl">
        <DialogHeader className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary animate-bounce" />
          </div>
          <DialogTitle className="text-xl font-extrabold tracking-tight">
            Acesso à Localização
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Para receber corridas próximas e permitir que o cliente acompanhe sua entrega, o É Pra Já precisa acessar sua localização <strong>mesmo quando o app estiver em segundo plano</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/50 border border-border">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Privacidade Garantida</p>
              <p className="text-xs text-muted-foreground">Seus dados são usados exclusivamente para fins de logística.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/50 border border-border">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Monitoramento Ativo</p>
              <p className="text-xs text-muted-foreground">Você só será rastreado enquanto estiver em modo "Online".</p>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <button
            onClick={onAccept}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            ENTENDI E ACEITO
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
