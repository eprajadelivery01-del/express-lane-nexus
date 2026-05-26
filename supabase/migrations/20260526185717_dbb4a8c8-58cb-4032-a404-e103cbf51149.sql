
-- Enable RLS on profiles and user_roles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Replace permissive user_roles SELECT policy with scoped one
DROP POLICY IF EXISTS user_roles_read_authenticated ON public.user_roles;
CREATE POLICY user_roles_read_own_or_admin
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Remove app_settings from realtime publication if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'app_settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.app_settings';
  END IF;
END $$;

-- Allow company users to INSERT chat_message_logs for their sessions
CREATE POLICY "Companies insert chat_message_logs"
ON public.chat_message_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND session_id IN (
    SELECT cs.id
    FROM public.chat_sessions cs
    JOIN public.companies c ON c.id = cs.company_id
    WHERE c.user_id = auth.uid()
  )
);

-- Restrict anon access to companies.email (column-level)
REVOKE SELECT (email) ON public.companies FROM anon;
