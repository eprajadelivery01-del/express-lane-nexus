-- ============================================================
-- FIX: Usuários sem role na tabela user_roles
-- Garante que usuários que têm empresa cadastrada recebam a role 'company'
-- e usuários que têm entregador cadastrado recebam a role 'driver'
-- ============================================================

-- 1. Adicionar role 'company' para todos que têm empresa mas não têm role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT c.user_id, 'company'
FROM public.companies c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = c.user_id AND ur.role = 'company'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Adicionar role 'driver' para todos que têm entregador mas não têm role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT d.user_id, 'driver'
FROM public.delivery_drivers d
WHERE d.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = d.user_id AND ur.role = 'driver'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Garantir role 'admin' para os usuários administrativos conhecidos
INSERT INTO public.user_roles (user_id, role)
VALUES ('5c68f901-d69a-4265-a3bf-ff523088fa7d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Garantir role 'company' para lojistateste18@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('a0caf6ea-3683-49b1-9e5d-f86781047d4c', 'company')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Ver resultado
SELECT u.email, ur.role, ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.created_at DESC
LIMIT 30;
