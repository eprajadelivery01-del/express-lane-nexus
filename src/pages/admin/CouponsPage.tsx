import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Ticket, Search } from "lucide-react";
import { CouponDialog } from "@/components/admin/CouponDialog";
import {
  AdminCoupon,
  useAdminCoupons,
  useDeleteCoupon,
} from "@/services/coupons";
import { toast } from "sonner";

function formatScope(c: AdminCoupon) {
  if (c.company_id) return "Loja específica";
  if (c.company_ids.length === 0) return "Global (todas as lojas)";
  return `${c.company_ids.length} loja(s)`;
}

function formatDiscount(c: AdminCoupon) {
  return c.discount_type === "percentage"
    ? `${Number(c.discount_value)}%`
    : `R$ ${Number(c.discount_value).toFixed(2)}`;
}

export default function CouponsPage() {
  const { data: coupons = [], isLoading } = useAdminCoupons();
  const deleteMut = useDeleteCoupon();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [toDelete, setToDelete] = useState<AdminCoupon | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return coupons;
    return coupons.filter(
      (c) =>
        c.code.toLowerCase().includes(s) ||
        (c.description ?? "").toLowerCase().includes(s),
    );
  }, [coupons, search]);

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (c: AdminCoupon) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteMut.mutateAsync(toDelete.id);
      toast.success("Cupom excluído");
      setToDelete(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao excluir");
    }
  };

  return (
    <AdminLayout title="Cupons" subtitle="Crie cupons globais ou para lojas selecionadas">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cupons</h1>
              <p className="text-sm text-muted-foreground">
                Crie cupons globais ou para lojas selecionadas
              </p>
            </div>
          </div>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo cupom
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum cupom cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>{formatDiscount(c)}</TableCell>
                    <TableCell>
                      <Badge variant={c.company_ids.length === 0 && !c.company_id ? "default" : "secondary"}>
                        {formatScope(c)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {c.used_count ?? 0}
                      {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "default" : "outline"}>
                        {c.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(c)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CouponDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        coupon={editing}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cupom{" "}
              <strong>{toDelete?.code}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
