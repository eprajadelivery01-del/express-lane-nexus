import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsManager } from "@/services/stores-products";
import { 
  Plus, Search, Edit2, Trash2, MoreHorizontal, 
  Image as ImageIcon, Loader2, X, AlertCircle, ShoppingBag,
  CheckCircle2, AlertTriangle, UploadCloud
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BusinessProductsPage() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const productsManager = useProductsManager(companyId || "");
  const { data: products, isLoading, createProduct } = productsManager;
  const updateProduct = (productsManager as any).updateProduct;
  const deleteProduct = (productsManager as any).deleteProduct;
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Fetch company
  useEffect(() => {
    if (!user) return;
    supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setCompanyId(data.id); });
  }, [user]);

  const filteredProducts = (products || []).filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteProduct.mutateAsync(id);
    } catch (err) {
      // Handled by mutation toast
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  return (
    <BusinessLayout title="Cardápio">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header tools */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-3xl shadow-card">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <button
            onClick={handleCreate}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Novo Produto
          </button>
        </div>

        {/* Product List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Carregando seus produtos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-card rounded-[40px] p-12 shadow-card text-center border-2 border-dashed border-border">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Nenhum produto encontrado</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              {search ? "Não encontramos produtos para sua busca." : "Comece a vender adicionando seu primeiro produto ao cardápio."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group relative bg-card rounded-[32px] overflow-hidden shadow-card border border-border hover:shadow-card-hover transition-all duration-300">
                {/* Image Placeholder/Preview */}
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  {(product.image_urls && (product.image_urls as any[]).length > 0) ? (
                    <img 
                      src={(product.image_urls as any[])[0]} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                  
                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg ${product.is_active ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {product.is_active ? "Ativo" : "Pausado"}
                    </span>
                  </div>

                  {/* Quick Actions overlay */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-foreground hover:bg-white transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 border-border">
                        <DropdownMenuItem onClick={() => handleEdit(product)} className="rounded-xl flex items-center gap-2 cursor-pointer">
                          <Edit2 className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(product.id)} className="rounded-xl flex items-center gap-2 text-destructive cursor-pointer">
                          <Trash2 className="h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-foreground text-lg truncate flex-1">{product.name}</h4>
                    <span className="font-black text-primary text-lg">R$ {product.price?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                    {product.description || "Sem descrição informada."}
                  </p>
                  
                  <div className="pt-2 flex items-center gap-2">
                     <div className="flex -space-x-2">
                         {((product.image_urls || []) as any[]).slice(0, 3).map((url: string, i: number) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-card bg-muted overflow-hidden">
                               <img src={url} className="w-full h-full object-cover" />
                            </div>
                         ))}
                         {((product.image_urls || []) as any[]).length > 3 && (
                            <div className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                               +{((product.image_urls || []) as any[]).length - 3}
                            </div>
                         )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold italic">
                         {((product.image_urls || []) as any[]).length} { ((product.image_urls || []) as any[]).length === 1 ? "foto" : "fotos" }
                     </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product Dialog (Create/Edit) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent 
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="sm:max-w-2xl bg-card rounded-[40px] border-border overflow-hidden p-0"
          >
            <DialogHeader className="p-6 border-b border-border">
              <DialogTitle className="text-2xl font-display font-bold">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
               <ProductForm 
                  initialData={editingProduct} 
                  companyId={companyId} 
                  onSuccess={() => {
                    setIsDialogOpen(false);
                    setEditingProduct(null);
                  }}
               />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </BusinessLayout>
  );
}

function ProductForm({ initialData, companyId, onSuccess }: { initialData?: any, companyId: string | null, onSuccess: () => void }) {
  const { toast } = useToast();
  const pm = useProductsManager(companyId || "");
  const createProduct = pm.createProduct;
  const updateProduct = (pm as any).updateProduct;
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price?.toString() || "",
    category: initialData?.category || "outro",
    is_active: initialData?.is_active ?? true,
    image_url: initialData?.image_url || null,
    image_urls: initialData?.image_urls || []
  });

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !companyId) return;
    
    // Check limit
    if (form.image_urls.length + files.length > 10) {
      toast({ title: "Limite excedido", description: "Você pode adicionar até 10 imagens por produto.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [...form.image_urls];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${companyId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("products")
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setForm(prev => ({ 
        ...prev, 
        image_urls: newUrls,
        image_url: newUrls[0] // Primary image is first one
      }));
      
      toast({ title: "Upload concluído", description: `${files.length} imagens adicionadas.` });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newUrls = [...form.image_urls];
    newUrls.splice(index, 1);
    setForm(prev => ({ 
      ...prev, 
      image_urls: newUrls,
      image_url: newUrls.length > 0 ? newUrls[0] : null
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    // VALIDATION
    if (form.image_urls.length === 0) {
       toast({ title: "Imagem obrigatória", description: "Adicione pelo menos 1 imagem ao seu produto.", variant: "destructive" });
       return;
    }

    setLoading(true);
    const payload = {
      ...form,
      price: parseFloat(form.price),
    };

    try {
      if (initialData) {
        await updateProduct.mutateAsync({ id: initialData.id, data: payload });
        toast({ title: "Sucesso", description: "Produto atualizado!" });
      } else {
        await createProduct.mutateAsync(payload);
        toast({ title: "Sucesso", description: "Produto criado no cardápio!" });
      }
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Nome do Produto *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Hambúrger Duplo Bacon"
              className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">Preço (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="29.90"
                className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors"
              >
                <option value="pizza">Pizza</option>
                <option value="lanches">Lanches</option>
                <option value="batata recheada">Batata recheada</option>
                <option value="combo">Combo</option>
                <option value="caldos">Caldos</option>
                <option value="japonesa">Japonesa</option>
                <option value="bebidas">Bebidas</option>
                <option value="doces">Doces</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descreva os ingredientes e detalhes do produto..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-2xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.is_active ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
               {form.is_active ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
               <p className="text-sm font-bold text-foreground">Disponível no App</p>
               <p className="text-[10px] text-muted-foreground">Ocultar produto temporariamente sem excluí-lo.</p>
            </div>
            <input 
               type="checkbox" 
               checked={form.is_active} 
               onChange={(e) => setForm(p => ({ ...p, is_active: e.target.checked }))}
               className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary"
            />
          </div>
        </div>

        {/* Image Management */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
               <label className="text-sm font-bold text-foreground block">Imagens (Mín: 1, Máx: 10) *</label>
               <span className="text-[10px] font-black text-muted-foreground uppercase">{form.image_urls.length}/10</span>
            </div>
            
            {/* Image Grid */}
            <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 mb-4">
              {form.image_urls.map((url, i) => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
                  <img src={url} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {i === 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-white text-[8px] font-black uppercase text-center py-0.5">
                      Capa
                    </div>
                  )}
                </div>
              ))}
              
              {form.image_urls.length < 10 && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                  <span className="text-[9px] font-bold uppercase tracking-wider">Adicionar</span>
                  <input 
                    type="file" capture="environment" 
                    multiple 
                    disabled={uploading} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*" 
                  />
                </label>
              )}
            </div>

            {form.image_urls.length === 0 && (
               <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive-foreground leading-relaxed">
                     Você precisa adicionar pelo menos 1 imagem para salvar este produto.
                  </p>
               </div>
            )}
            
            <p className="text-[10px] text-muted-foreground leading-relaxed">
               Dica: Arraste os arquivos ou selecione múltiplos de uma vez. A primeira foto será a capa principal no marketplace.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-border">
         <button
            type="submit"
            disabled={loading || uploading || form.image_urls.length === 0}
            className="flex-1 py-4 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-50 shadow-glow hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
         >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {initialData ? "Salvar Alterações" : "Adicionar ao Cardápio"}
         </button>
      </div>
    </form>
  );
}

