import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, ShieldCheck } from "lucide-react";

interface LocationConsentDialogProps {
  open: boolean;
  onAccept: () => void;
}

export function LocationConsentDialog({ open, onAccept }: LocationConsentDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-[90vw] w-[400px] rounded-3xl p-6 border-border bg-card">
        <DialogHeader className="space-y-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary animate-bounce" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Encontrar lojas próximas
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            Para exibir as lojas mais próximas e calcular o tempo de entrega com precisão, o É Pra Já precisa acessar sua localização.
            <br /><br />
            Seus dados são utilizados exclusivamente para otimizar sua experiência de compra e acompanhamento de pedidos.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-2 mt-4">
          <Button 
            onClick={onAccept}
            className="w-full rounded-2xl py-6 bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="h-5 w-5" />
            Permitir Acesso
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Você pode alterar isso a qualquer momento nas configurações do seu celular.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
