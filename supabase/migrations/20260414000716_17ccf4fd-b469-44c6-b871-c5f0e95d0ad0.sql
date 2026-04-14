INSERT INTO public.profiles (id, user_id, full_name, status, role)
VALUES ('5c68f901-d69a-4265-a3bf-ff523088fa7d', '5c68f901-d69a-4265-a3bf-ff523088fa7d', 'Admin Teste', 'active', 'admin')
ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, status = 'active';