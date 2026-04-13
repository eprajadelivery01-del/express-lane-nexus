-- ======================================================================================
-- NEXUSPRO SECURITY LOCKDOWN V2: CHAT HYGIENE & IDENTITY PROTECTION
-- Resolving "Unvalidated sender_role in chat messages"
-- ======================================================================================

BEGIN;

-- 1. [CHAT_MESSAGES] ENFORCEMENT & IDENTITY VALIDATION
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Remove older or permissive policies (including duplicates from partial runs)
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can only insert their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Strict identity validation for chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Validação de identidade rigorosa para mensagens de chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participantes podem visualizar mensagens de chat" ON public.chat_messages;

-- NEW POLICY: INSERT WITH IDENTITY VALIDATION (Validação de Cargo/Identidade)
CREATE POLICY "Validação de identidade rigorosa para mensagens de chat" ON public.chat_messages
  FOR INSERT WITH CHECK (
    -- 1. Verification: Sender must be the authenticated user
    auth.uid() = sender_id
    AND
    -- 2. Verification: The claimed 'role' must be a role the user actually has
    (
      sender_role IS NULL 
      OR 
      public.has_role(auth.uid(), sender_role::public.app_role)
    )
    AND
    -- 3. Verification: User must be part of the delivery
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_id
      AND (
        -- Is the assigned driver
        d.driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
        OR 
        -- Is the owner of the company that created the delivery
        d.company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
        OR
        -- Is an admin
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- NEW POLICY: SELECT FOR PARTICIPANTS ONLY (Acesso às Conversas)
CREATE POLICY "Participantes podem visualizar mensagens de chat" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_id
      AND (
        d.driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
        OR 
        d.company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
        OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- 2. [GLOBAL FUNCTION HYGIENE]
-- Fixes "Function Search Path Mutable" for all system functions
-- Using pg_get_function_identity_arguments to avoid signature errors
DO $$ 
DECLARE 
  func_record record;
BEGIN 
  FOR func_record IN 
    SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
  LOOP 
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path TO public', 
                   func_record.schema_name, 
                   func_record.function_name, 
                   func_record.args); 
  END LOOP; 
END $$;

COMMIT;
