
-- =============================================
-- ENUM TYPES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'company', 'driver', 'customer');
CREATE TYPE public.delivery_status AS ENUM ('pending', 'accepted', 'collecting', 'in_route', 'completed', 'cancelled');
CREATE TYPE public.occurrence_type AS ENUM ('motorcycle_issue', 'accident', 'robbery', 'other');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');

-- =============================================
-- TIMESTAMP TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  document TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- USER ROLES TABLE
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECKS
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- REGIONS TABLE (with GeoJSON polygon support)
-- =============================================
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  geometry JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COMPANIES TABLE
-- =============================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  region_id UUID REFERENCES public.regions(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- DELIVERY DRIVERS TABLE
-- =============================================
CREATE TABLE public.delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  vehicle TEXT NOT NULL DEFAULT 'motorcycle',
  license_plate TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.delivery_drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ADDRESSES TABLE
-- =============================================
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  label TEXT DEFAULT 'Casa',
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL DEFAULT 'Cuiabá',
  state TEXT NOT NULL DEFAULT 'MT',
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  region_id UUID REFERENCES public.regions(id),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DELIVERIES TABLE
-- =============================================
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  driver_id UUID REFERENCES public.delivery_drivers(id),
  customer_name TEXT NOT NULL,
  address TEXT NOT NULL,
  region_id UUID REFERENCES public.regions(id),
  status delivery_status NOT NULL DEFAULT 'pending',
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  accepted_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  delivery_id UUID REFERENCES public.deliveries(id),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ORDER ITEMS TABLE
-- =============================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES public.deliveries(id) NOT NULL,
  driver_id UUID REFERENCES public.delivery_drivers(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- =============================================
-- OCCURRENCES TABLE
-- =============================================
CREATE TABLE public.occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.delivery_drivers(id) NOT NULL,
  delivery_id UUID REFERENCES public.deliveries(id),
  type occurrence_type NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_occurrences_updated_at
  BEFORE UPDATE ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INVITATIONS TABLE
-- =============================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles: users see own, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: admins manage, users read own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Regions: public read, admin write
CREATE POLICY "Anyone can view regions" ON public.regions
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage regions" ON public.regions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Companies: public read, owner+admin write
CREATE POLICY "Anyone can view active companies" ON public.companies
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all companies" ON public.companies
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Company owners can update own" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage companies" ON public.companies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Delivery drivers: driver sees own, admin sees all
CREATE POLICY "Drivers can view own record" ON public.delivery_drivers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all drivers" ON public.delivery_drivers
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can update own record" ON public.delivery_drivers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage drivers" ON public.delivery_drivers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Companies can view online drivers" ON public.delivery_drivers
  FOR SELECT USING (public.has_role(auth.uid(), 'company') AND is_online = true);

-- Customers: admin + company manage
CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Companies can manage customers" ON public.customers
  FOR ALL USING (public.has_role(auth.uid(), 'company'));
CREATE POLICY "Customers can view own" ON public.customers
  FOR SELECT USING (auth.uid() = user_id);

-- Addresses
CREATE POLICY "Admins can manage addresses" ON public.addresses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Companies can manage addresses" ON public.addresses
  FOR ALL USING (public.has_role(auth.uid(), 'company'));

-- Deliveries: context-based access
CREATE POLICY "Admins can manage deliveries" ON public.deliveries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Companies can view own deliveries" ON public.deliveries
  FOR SELECT USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );
CREATE POLICY "Companies can create deliveries" ON public.deliveries
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );
CREATE POLICY "Drivers can view assigned deliveries" ON public.deliveries
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
  );
CREATE POLICY "Drivers can view pending deliveries" ON public.deliveries
  FOR SELECT USING (
    status = 'pending' AND public.has_role(auth.uid(), 'driver')
  );
CREATE POLICY "Drivers can update assigned deliveries" ON public.deliveries
  FOR UPDATE USING (
    driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
  );

-- Products
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_active = true);
CREATE POLICY "Company owners can manage products" ON public.products
  FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Companies can view own orders" ON public.orders
  FOR SELECT USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );
CREATE POLICY "Customers can view own orders" ON public.orders
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Order items
CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Order viewers can see items" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE
      company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
      OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  );

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage reviews" ON public.reviews
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Occurrences
CREATE POLICY "Admins can manage occurrences" ON public.occurrences
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can view own occurrences" ON public.occurrences
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
  );
CREATE POLICY "Drivers can create occurrences" ON public.occurrences
  FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
  );

-- Invitations
CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view invitation by token" ON public.invitations
  FOR SELECT USING (true);

-- =============================================
-- STORAGE BUCKET FOR AVATARS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_drivers;
