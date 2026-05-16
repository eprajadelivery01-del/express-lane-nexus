
-- 1) Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2) Fix invitations: remove the wide-open public policies, restrict to admins.
DROP POLICY IF EXISTS "Public invitation access" ON public.invitations;
DROP POLICY IF EXISTS "Admin invitation access" ON public.invitations;

CREATE POLICY "Admins manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Anonymous lookup is handled by the existing SECURITY DEFINER RPC public.get_invitation_by_token

-- 3) Customers: drop broad ALL grant; scope SELECT to linked customers, allow INSERT, admins keep full
DROP POLICY IF EXISTS "Companies can manage customers" ON public.customers;

CREATE POLICY "Admins manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Companies view linked customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'company'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.companies co ON co.id = o.company_id
    WHERE o.customer_id = customers.id
      AND co.user_id = auth.uid()
  )
);

CREATE POLICY "Companies insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'company'::public.app_role));

-- 4) Addresses: drop broad ALL grant; allow companies only to read addresses of their linked customers
DROP POLICY IF EXISTS "Companies can manage addresses" ON public.addresses;

CREATE POLICY "Companies view linked addresses"
ON public.addresses
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'company'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.companies co ON co.id = o.company_id
    JOIN public.customers cu ON cu.id = o.customer_id
    WHERE cu.user_id = addresses.user_id
      AND co.user_id = auth.uid()
  )
);

-- 5) Recreate SECURITY DEFINER views as SECURITY INVOKER
ALTER VIEW public.available_deliveries SET (security_invoker = on);
ALTER VIEW public.store_public_info SET (security_invoker = on);

-- 6) financial_transactions: remove user self-insert; only admins (or service role) can write
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.financial_transactions;

CREATE POLICY "Admins insert transactions"
ON public.financial_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
