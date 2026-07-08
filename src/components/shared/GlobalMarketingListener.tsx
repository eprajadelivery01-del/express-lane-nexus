import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, X } from 'lucide-react';

export function GlobalMarketingListener() {
  const { user } = useAuth();

  useEffect(() => {
    // Listen to INSERT events on marketing_notifications
    const channel = supabase
      .channel('public:marketing_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketing_notifications'
        },
        (payload) => {
          const newNotif = payload.new;
          
          // Send receipt to admins
          supabase.channel('marketing-receipts').send({
            type: 'broadcast',
            event: 'notification_received',
            payload: {
              user_email: user?.email || 'Visitante',
              notification_title: newNotif.title,
            },
          });

          // Show Toast via Sonner
          toast.custom((t) => (
            <div className="relative flex flex-col gap-3 p-4 bg-background border border-border rounded-xl shadow-2xl w-[350px] animate-in slide-in-from-top-2">
              <button 
                onClick={() => toast.dismiss(t)}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors z-10"
              >
                <X className="h-3 w-3" />
              </button>

              {newNotif.image_url && (
                <img 
                  src={newNotif.image_url} 
                  alt="Oferta" 
                  className="w-full h-36 object-cover rounded-lg"
                />
              )}
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 pr-6">
                  {newNotif.emoji && <span className="text-2xl">{newNotif.emoji}</span>}
                  <h3 className="font-bold text-base leading-tight">{newNotif.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{newNotif.message}</p>
              </div>
              
              {newNotif.coupon_code && (
                <div 
                  className="mt-1 bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(newNotif.coupon_code);
                    toast.success('Cupom copiado para a área de transferência!', { id: 'coupon-copied' });
                  }}
                >
                  <span className="font-mono font-bold text-primary text-lg">{newNotif.coupon_code}</span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    <Copy className="h-3 w-3" /> Copiar
                  </div>
                </div>
              )}
            </div>
          ), {
            duration: 15000, // Show for 15 seconds
            position: 'top-center',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
