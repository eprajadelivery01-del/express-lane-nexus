import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Send, Bell, Image as ImageIcon, Tag, Smile } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function AdminNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("🎉");
  const [imageUrl, setImageUrl] = useState("");
  const [couponCode, setCouponCode] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("marketing_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast({ title: "Erro", description: "Título e mensagem são obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        emoji: emoji.trim() || null,
        image_url: imageUrl.trim() || null,
        coupon_code: couponCode.trim() || null,
        created_by: user?.id
      };

      const { error } = await supabase.from("marketing_notifications").insert(payload);

      if (error) throw error;

      toast({ 
        title: "Sucesso!", 
        description: "Notificação disparada para o App dos Clientes." 
      });

      // Clear form
      setTitle("");
      setMessage("");
      setEmoji("🎉");
      setImageUrl("");
      setCouponCode("");

      // Refresh
      fetchHistory();
    } catch (error: any) {
      toast({ 
        title: "Erro ao enviar notificação", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Central de Notificações</h1>
        <p className="text-muted-foreground">Envie ofertas, cupons e anúncios em tempo real para o app dos clientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Envio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Disparar Nova Notificação</CardTitle>
            <CardDescription>Esta mensagem aparecerá instantaneamente no App Cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendNotification} className="space-y-4">
              
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3 lg:col-span-2">
                  <label className="text-sm font-medium flex items-center gap-1 mb-1"><Smile className="h-4 w-4"/> Emoji</label>
                  <Input 
                    placeholder="🎉" 
                    value={emoji} 
                    onChange={e => setEmoji(e.target.value)}
                    maxLength={2}
                    className="text-center text-lg"
                  />
                </div>
                <div className="col-span-9 lg:col-span-10">
                  <label className="text-sm font-medium mb-1 block">Título da Notificação *</label>
                  <Input 
                    placeholder="Ex: Oferta Especial de Sexta!" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Mensagem (Texto) *</label>
                <Textarea 
                  placeholder="Escreva a mensagem que aparecerá no corpo do alerta..." 
                  value={message} 
                  onChange={e => setMessage(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium flex items-center gap-1 mb-1"><ImageIcon className="h-4 w-4"/> Link da Imagem (Opcional)</label>
                <Input 
                  placeholder="https://exemplo.com/imagem.png" 
                  value={imageUrl} 
                  onChange={e => setImageUrl(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-muted-foreground mt-1">Insira um link de imagem válida para o banner.</p>
              </div>

              <div>
                <label className="text-sm font-medium flex items-center gap-1 mb-1"><Tag className="h-4 w-4"/> Código do Cupom (Opcional)</label>
                <Input 
                  placeholder="Ex: SEXTA50" 
                  value={couponCode} 
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1">O cliente terá um botão para copiar esse código com 1 clique.</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Disparar Notificação agora"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Histórico de Envios</CardTitle>
            <CardDescription>Últimas notificações disparadas para os clientes.</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma notificação enviada ainda.</p>
            ) : (
              <div className="space-y-4">
                {history.map(notif => (
                  <div key={notif.id} className="p-3 border rounded-lg bg-muted/30 flex items-start gap-3">
                    <div className="text-2xl mt-1">{notif.emoji || "🔔"}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{notif.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {notif.coupon_code && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary uppercase">
                            Cupom: {notif.coupon_code}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(notif.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
