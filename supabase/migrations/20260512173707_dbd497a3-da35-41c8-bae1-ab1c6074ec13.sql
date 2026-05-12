
-- 1) companies: hide sensitive contact columns from anon role
REVOKE SELECT (email, phone, document) ON public.companies FROM anon;

-- 2) deliveries: tighten Lojistas policy from public to authenticated
DROP POLICY IF EXISTS "Lojistas podem ver suas próprias entregas" ON public.deliveries;
CREATE POLICY "Lojistas podem ver suas próprias entregas"
ON public.deliveries
FOR ALL
TO authenticated
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- 3) reviews: restrict reads to author + admin
DROP POLICY IF EXISTS "Authenticated can view reviews" ON public.reviews;
CREATE POLICY "Users can view own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) motoboys: admin + drivers themselves
DROP POLICY IF EXISTS "Authenticated read motoboys" ON public.motoboys;
DROP POLICY IF EXISTS "Authenticated users can view motoboys" ON public.motoboys;
CREATE POLICY "Admins read motoboys"
ON public.motoboys FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5) platform_settings: admin only
DROP POLICY IF EXISTS "Authenticated can read platform settings" ON public.platform_settings;
CREATE POLICY "Admins can read platform settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
