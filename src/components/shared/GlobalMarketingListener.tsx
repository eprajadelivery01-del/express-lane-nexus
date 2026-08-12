import React, { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeRemoveChannel } from '@/services/realtime';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, X } from 'lucide-react';

const NOTIFICATION_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function GlobalMarketingListener() {
  const { user } = useAuth();
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const receiptsRef = useRef<ReturnType<typeof supabase.channel> | null>(null);


  useEffect(() => {
    // 1. Register Service Worker & Request Notification Permission
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          swRegRef.current = reg;
        })
        .catch(() => {});
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Drop any stale channels with the same topics (StrictMode / HMR re-mounts)
    supabase
      .getChannels()
      .filter((c) =>
        c.topic === 'realtime:marketing-receipts' ||
        c.topic === 'realtime:public:marketing_notifications',
      )
      .forEach((c) => {
        try { supabase.removeChannel(c); } catch {}
      });

    // 2. Single reusable broadcast channel for admin receipts
    const receipts = supabase.channel('marketing-receipts');
    receipts.subscribe();
    receiptsRef.current = receipts;

    // 3. Listen to INSERT events on marketing_notifications
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
          receiptsRef.current?.send({
            type: 'broadcast',
            event: 'notification_received',
            payload: {
              user_email: user?.email || 'Visitante',
              notification_title: newNotif.title,
            },
          });


          // Play Audio & Vibrate
          try {
            const audio = new Audio(NOTIFICATION_AUDIO_URL);
            audio.play().catch(() => {});
          } catch (e) {}

          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          // Trigger Native System Notification
          triggerNativeNotification(newNotif, swRegRef.current);

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
            duration: 15000,
            position: 'top-center',
          });
        }
      )
      .subscribe();

    return () => {
      safeRemoveChannel(channel);
      safeRemoveChannel(receipts);
      receiptsRef.current = null;
    };
  }, [user?.id]);


  return null;
}

function triggerNativeNotification(notif: any, swRegistration: ServiceWorkerRegistration | null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = `${notif.emoji ? notif.emoji + ' ' : ''}${notif.title || 'Novo Alerta É Pra Já!'}`;
  const options = {
    body: notif.message || (notif.coupon_code ? `Use o cupom: ${notif.coupon_code}` : 'Confira a nova promoção no app!'),
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    image: notif.image_url || undefined,
    tag: `epraja-marketing-${notif.id || Date.now()}`,
    data: {
      url: '/marketplace/coupons',
      coupon: notif.coupon_code
    }
  };

  if (swRegistration && swRegistration.showNotification) {
    swRegistration.showNotification(title, options).catch(() => {
      try {
        new Notification(title, options);
      } catch (e) {}
    });
  } else {
    try {
      new Notification(title, options);
    } catch (e) {}
  }
}
