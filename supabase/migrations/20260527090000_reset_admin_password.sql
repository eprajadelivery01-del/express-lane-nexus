-- Migration: 20260527090000_reset_admin_password
-- Description: Resets the password for the production admin account davinynsilva@gmail.com
-- and ensures the account is confirmed, active, and has the admin role.

BEGIN;

DO $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Gera o hash bcrypt da nova senha
  v_encrypted_password := crypt('Helô2023', gen_salt('bf'));

  -- Busca o ID do usuário admin
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davinynsilva@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário davinynsilva@gmail.com não encontrado em auth.users';
  END IF;

  -- Reseta a senha e garante que o email está confirmado
  UPDATE auth.users
  SET
    encrypted_password      = v_encrypted_password,
    email_confirmed_at      = COALESCE(email_confirmed_at, now()),
    -- Limpa tokens pendentes que podem bloquear o login
    confirmation_token      = '',
    recovery_token          = '',
    email_change_token_new  = '',
    email_change_token_current = '',
    phone_change_token      = '',
    reauthentication_token  = '',
    updated_at              = now()
  WHERE id = v_user_id;

  -- Garante perfil ativo
  UPDATE public.profiles
  SET status = 'active', role = 'admin', updated_at = now()
  WHERE user_id = v_user_id;

  -- Garante role admin na user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Senha redefinida com sucesso para davinynsilva@gmail.com (id: %)', v_user_id;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
