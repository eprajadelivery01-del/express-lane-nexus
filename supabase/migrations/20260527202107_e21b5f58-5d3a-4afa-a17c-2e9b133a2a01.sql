DO $$
DECLARE
  v_temp_password text := 'Admin@123456';
  v_updated_count integer;
BEGIN
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(v_temp_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE email IN ('davinynsilva@gmail.com', 'testedelivery@gmail.com')
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> 2 THEN
    RAISE EXCEPTION 'Falha ao resetar as contas admin. Total atualizado: %', v_updated_count;
  END IF;
END
$$;