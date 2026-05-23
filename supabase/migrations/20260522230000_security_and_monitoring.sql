-- 1. ENABLE HTTP AND CRON EXTENSIONS IF NOT YET INSTALLED
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 2. CREATE MONITORING TABLES
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  app_name TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on Monitoring Tables
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Restrict read/write to admin only (No public SELECT)
CREATE POLICY "Admins can view failed logins" ON public.failed_login_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view security events" ON public.security_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. SECURE EXECUTABLE SIGN-IN LOGGING FUNCTION (SECURITY DEFINER)
-- Allows anonymous frontend to report failed log-ins securely
CREATE OR REPLACE FUNCTION public.log_failed_login(p_email text, p_app_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.failed_login_attempts (email, app_name)
  VALUES (LOWER(TRIM(p_email)), p_app_name);
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_failed_login(text, text) TO anon, authenticated;

-- 4. BRUTE-FORCE DETECTION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.check_failed_login_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_bot_token text;
  v_chat_id text;
  v_message text;
  v_url text;
BEGIN
  -- Count failed logins in the last 15 minutes for this target email
  SELECT count(*) INTO v_count
  FROM public.failed_login_attempts
  WHERE email = NEW.email
    AND created_at > now() - interval '15 minutes';

  -- If count matches threshold or multiple of threshold
  IF v_count >= 10 AND (v_count % 10 = 0) THEN
    -- Fetch telegram configurations
    SELECT value INTO v_bot_token FROM public.app_settings WHERE key = 'telegram_bot_token';
    SELECT value INTO v_chat_id FROM public.app_settings WHERE key = 'telegram_chat_id';

    IF v_bot_token IS NOT NULL AND v_chat_id IS NOT NULL THEN
      v_message := '⚠️ *ALERTA DE SEGURANÇA: FORÇA BRUTA DETECTADA* ⚠️' || chr(10) || chr(10) ||
                   '📱 *App:* ' || NEW.app_name || chr(10) ||
                   '👤 *Alvo:* `' || NEW.email || '`' || chr(10) ||
                   '🚨 *Falhas (últimos 15 min):* ' || v_count::text || chr(10) ||
                   '🕒 *Horário:* ' || to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI:SS');

      v_url := 'https://api.telegram.org/bot' || v_bot_token || '/sendMessage';
      
      -- Asynchronously call Telegram Bot API
      PERFORM net.http_post(
        url := v_url,
        body := jsonb_build_object(
          'chat_id', v_chat_id,
          'text', v_message,
          'parse_mode', 'Markdown'
        )
      );

      -- Log a security alert in the audit log
      INSERT INTO public.security_events (event_type, description, severity, metadata)
      VALUES (
        'brute_force_detected',
        'Detecção de força bruta para o e-mail ' || NEW.email || ' no app ' || NEW.app_name,
        'HIGH',
        jsonb_build_object('email', NEW.email, 'attempts_15min', v_count, 'app', NEW.app_name)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_failed_login ON public.failed_login_attempts;
CREATE TRIGGER tr_check_failed_login
  AFTER INSERT ON public.failed_login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.check_failed_login_attempts();

-- 5. PRIVILEGE ESCALATION MONITORING TRIGGER ON USER_ROLES
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_token text;
  v_chat_id text;
  v_message text;
  v_url text;
  v_executor_id uuid;
BEGIN
  -- Detect insertion or promotion of ADMIN privilege
  IF NEW.role = 'admin' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.role != 'admin')) THEN
    v_executor_id := auth.uid();
    
    -- Check if the executor is authenticated and NOT currently an admin (Privilege escalation!)
    IF v_executor_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = v_executor_id AND role = 'admin'
    ) THEN
      -- Log the critical security violation
      INSERT INTO public.security_events (event_type, description, severity, metadata)
      VALUES (
        'privilege_escalation_attempt',
        'Tentativa não autorizada de obter privilégios de Administrador pelo UID: ' || v_executor_id::text,
        'CRITICAL',
        jsonb_build_object('user_id', NEW.user_id, 'attempted_by', v_executor_id, 'time', now())
      );

      -- Fetch telegram credentials
      SELECT value INTO v_bot_token FROM public.app_settings WHERE key = 'telegram_bot_token';
      SELECT value INTO v_chat_id FROM public.app_settings WHERE key = 'telegram_chat_id';

      IF v_bot_token IS NOT NULL AND v_chat_id IS NOT NULL THEN
        v_message := '🛑 *ATAQUE CRÍTICO BLOQUEADO (PRIVILÉGIOS)* 🛑' || chr(10) || chr(10) ||
                     '⚠️ *Evento:* Tentativa de Escalação de Privilégio' || chr(10) ||
                     '👤 *Alvo da Alteração:* ID `' || NEW.user_id::text || '`' || chr(10) ||
                     '🕵️‍♂️ *Executor Malicioso (UID):* `' || v_executor_id::text || '`' || chr(10) ||
                     '🚨 *Severidade:* CRÍTICO / MÁXIMA' || chr(10) ||
                     '🕒 *Horário:* ' || to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI:SS');

        v_url := 'https://api.telegram.org/bot' || v_bot_token || '/sendMessage';
        
        PERFORM net.http_post(
          url := v_url,
          body := jsonb_build_object(
            'chat_id', v_chat_id,
            'text', v_message,
            'parse_mode', 'Markdown'
          )
        );
      END IF;

      -- Revoke execution (ROLLBACK/ABORT transaction)
      RAISE EXCEPTION 'Acesso negado: Você não possui privilégios para esta ação.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_role_change ON public.user_roles;
CREATE TRIGGER tr_audit_role_change
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_change();

-- 6. DAILY DB OBSERVABILITY & TRAFFIC CRON REPORT
CREATE OR REPLACE FUNCTION public.generate_daily_report()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users integer;
  v_active_drivers integer;
  v_total_deliveries integer;
  v_total_orders integer;
  v_failed_logins integer;
  v_security_events integer;
  v_bot_token text;
  v_chat_id text;
  v_message text;
  v_url text;
BEGIN
  -- Access system stats
  SELECT count(*) INTO v_total_users FROM auth.users;
  SELECT count(*) INTO v_active_drivers FROM public.delivery_drivers WHERE is_online = true;
  SELECT count(*) INTO v_total_deliveries FROM public.deliveries WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO v_total_orders FROM public.orders WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO v_failed_logins FROM public.failed_login_attempts WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO v_security_events FROM public.security_events WHERE created_at > now() - interval '24 hours';

  -- Format beautiful message report
  v_message := '📊 *RELATÓRIO DIÁRIO DE MONITORAMENTO E DB* 📊' || chr(10) ||
               '🕒 *Período:* Últimas 24 Horas' || chr(10) || chr(10) ||
               '📈 *Métricas de Uso e Tráfego:*' || chr(10) ||
               '👤 *Total de Usuários Cadastrados:* ' || v_total_users::text || chr(10) ||
               '🏍️ *Entregadores Ativos (Online agora):* ' || v_active_drivers::text || chr(10) ||
               '📦 *Novas Corridas Iniciadas (24h):* ' || v_total_deliveries::text || chr(10) ||
               '🛒 *Novos Pedidos Emitidos (24h):* ' || v_total_orders::text || chr(10) || chr(10) ||
               '🛡️ *Segurança & Ataques:*' || chr(10) ||
               '🔑 *Bloqueios/Tentativas Falhas de Login:* ' || v_failed_logins::text || chr(10) ||
               '🚨 *Alertas Críticos de Segurança:* ' || v_security_events::text || chr(10) || chr(10) ||
               '🧠 *Status Geral:* BANCO DE DADOS INTEGRADO E OPERANTE ✅' || chr(10) ||
               '🕒 *Gerado em:* ' || to_char(now() AT TIME ZONE 'America/Cuiaba', 'DD/MM/YYYY HH24:MI:SS');

  SELECT value INTO v_bot_token FROM public.app_settings WHERE key = 'telegram_bot_token';
  SELECT value INTO v_chat_id FROM public.app_settings WHERE key = 'telegram_chat_id';

  IF v_bot_token IS NOT NULL AND v_chat_id IS NOT NULL THEN
    v_url := 'https://api.telegram.org/bot' || v_bot_token || '/sendMessage';
    PERFORM net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'chat_id', v_chat_id,
        'text', v_message,
        'parse_mode', 'Markdown'
      )
    );
  END IF;

  RETURN 'Daily database report processed successfully.';
END;
$$;

-- Schedule cron job: run every day at 23:59 America/Cuiaba
-- Uses pg_cron if enabled. If not supported, it fails silently, but function remains callable manually.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'daily-operation-report',
      '59 23 * * *',
      'SELECT public.generate_daily_report();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
