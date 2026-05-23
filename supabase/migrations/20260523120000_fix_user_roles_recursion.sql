-- 1. ELIMINAR A RECURSÃO INFINITA NA TABELA USER_ROLES
-- A política antiga 'user_roles_admin_select' chamava a função 'has_role()', 
-- que por sua vez fazia SELECT na tabela 'user_roles', criando um loop infinito de RLS.
-- Isso fazia com que o banco abortasse e retornasse sempre 0 roles para qualquer usuário logado.

DROP POLICY IF EXISTS "user_roles_admin_select" ON public.user_roles;

-- Criar nova política para administradores baseada nos metadados do auth.users (sem recursão!)
CREATE POLICY "user_roles_admin_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    (SELECT (raw_user_meta_data->>'role') FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

NOTIFY pgrst, 'reload schema';
