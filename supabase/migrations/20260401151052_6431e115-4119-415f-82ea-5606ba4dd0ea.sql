
-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'rejected');

-- Add status column to profiles
ALTER TABLE public.profiles ADD COLUMN status public.user_status NOT NULL DEFAULT 'pending';

-- Update existing profiles to active (they were already approved)
UPDATE public.profiles SET status = 'active';

-- Create a function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND status = 'active'
  )
$$;
