-- Create app_settings table for secure application config
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Block public / anon read access (Only admin / service_role can read or manage)
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Populate Telegram Bot configuration
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('telegram_bot_token', '8798211446:AAHLAxDhYh81qj7o39qBkkaez3vZvEJnXqw', 'Token do bot de monitoramento do Telegram'),
  ('telegram_chat_id', '538563060', 'ID do chat do administrador para receber alertas')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value;

-- Enable Realtime for settings changes if needed
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
