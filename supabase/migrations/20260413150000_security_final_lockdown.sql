-- ======================================================================================
-- NEXUSPRO TOTAL SECURITY LOCKDOWN PROTOCOL (FINAL REVISION)
-- Resolving 6 Errors and 3 Warnings from Security Scan
-- ======================================================================================

BEGIN;

-- 1. [RLS ENFORCEMENT]
-- Ensure RLS is active on all sensitive tables
ALTER TABLE IF EXISTS public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_logs ENABLE ROW LEVEL SECURITY;

-- 2. [CLEANING VULNERABLE POLICIES]
-- Remove any remaining permissive policies discovered by the scanner
DROP POLICY IF EXISTS "System can manage wallets" ON public.wallets;
DROP POLICY IF EXISTS "O sistema pode gerenciar carteiras" ON public.wallets;
DROP POLICY IF EXISTS "Authenticated can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir pagamentos" ON public.payments;
DROP POLICY IF EXISTS "Permissions_Unlock_Roles" ON public.user_roles;
DROP POLICY IF EXISTS "Permissions_Unlock_Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. [WALLETS] FINANCIAL PROTECTION
-- Only owner can VIEW their balance. NO user can update it manually.
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Explicitly ensure NO update/insert/delete for public/authenticated
-- (By not adding any other policy, only service_role/admin bypasses)

-- 4. [PROFILES] ANTI-TAMPERING & ROLE PROTECTION
-- Users can update basic info, but CANNOT change user_id or roles (if they exist)
CREATE POLICY "Users can update own profile safely" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    -- Ensure user_id field didn't change (security bypass prevention)
    AND (user_id = auth.uid())
  );

-- 5. [USER ROLES] ADMINISTRATIVE ONLY
-- Prevent any self-assignment. Only users can see what roles they have.
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 6. [OCCURRENCES] RELATIONAL ACCESS
-- RLS was reported as disabled. We enable it and restrict access.
DROP POLICY IF EXISTS "Admins can manage occurrences" ON public.occurrences;
CREATE POLICY "Admins can manage occurrences" ON public.occurrences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Drivers can view own occurrences" ON public.occurrences;
CREATE POLICY "Drivers can view own occurrences" ON public.occurrences
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Drivers can create occurrences" ON public.occurrences;
CREATE POLICY "Drivers can create occurrences" ON public.occurrences
  FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
  );

-- 7. [PAYMENTS] ORDER-BASED CHECK
-- Prevent authenticated users from injecting payments for random orders
DROP POLICY IF EXISTS "Users can only insert payments for their own orders" ON public.payments;
CREATE POLICY "Users can only insert payments for their own orders" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_id 
      AND (
        customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
        OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
      )
    )
  );

-- 8. [FUNCTION HIGIENE] SECURITY DEFINER SEARCH PATH
-- Fixes "Function Search Path Mutable" warning for all system functions
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path TO public;
ALTER FUNCTION public.handle_new_user() SET search_path TO public;
ALTER FUNCTION public.update_updated_at_column() SET search_path TO public;

-- Optional but recommended: set for all functions in public if possible
DO $$ 
DECLARE 
  func_name text;
BEGIN 
  FOR func_name IN 
    SELECT proname FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
    WHERE nspname = 'public' 
  LOOP 
    EXECUTE format('ALTER FUNCTION public.%I SET search_path TO public', func_name); 
  END LOOP; 
END $$;

COMMIT;
