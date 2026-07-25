import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface MarketingNotificationItem {
  id: string;
  title: string;
  message: string;
  emoji?: string | null;
  image_url?: string | null;
  coupon_code?: string | null;
  created_at: string;
  status?: string | null;
}

export function useMarketingNotifications() {
  const [history, setHistory] = useState<MarketingNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("marketing_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setHistory(data as MarketingNotificationItem[]);
      }
    } catch (err: any) {
      console.error("[useMarketingNotifications] Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteNotification = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await (supabase as any)
        .from("marketing_notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setHistory((prev) => prev.filter((item) => item.id !== id));
      toast({
        title: "Notificação excluída!",
        description: "A notificação foi removida da Central e do App do Cliente.",
      });
      return true;
    } catch (err: any) {
      console.error("[useMarketingNotifications] Error deleting notification:", err);
      toast({
        title: "Erro ao excluir",
        description: err.message || "Não foi possível remover a notificação.",
        variant: "destructive",
      });
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    deletingId,
    fetchHistory,
    deleteNotification,
  };
}
