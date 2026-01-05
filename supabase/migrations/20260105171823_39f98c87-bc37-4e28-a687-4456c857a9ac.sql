-- Create system role enum
CREATE TYPE public.system_role AS ENUM ('system_admin', 'user');

-- Create system_roles table
CREATE TABLE public.system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role public.system_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is system admin
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_roles
    WHERE user_id = _user_id AND role = 'system_admin'
  )
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_system_roles_updated_at
BEFORE UPDATE ON public.system_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for system_roles
-- Only system admins can view all system roles
CREATE POLICY "System admins can view all system roles"
ON public.system_roles
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Only system admins can insert system roles
CREATE POLICY "System admins can insert system roles"
ON public.system_roles
FOR INSERT
WITH CHECK (public.is_system_admin(auth.uid()));

-- Only system admins can update system roles
CREATE POLICY "System admins can update system roles"
ON public.system_roles
FOR UPDATE
USING (public.is_system_admin(auth.uid()));

-- Only system admins can delete system roles
CREATE POLICY "System admins can delete system roles"
ON public.system_roles
FOR DELETE
USING (public.is_system_admin(auth.uid()));

-- Users can see their own role
CREATE POLICY "Users can view their own system role"
ON public.system_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Update profiles RLS to allow system admins to view all profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_system_admin(auth.uid()));

CREATE POLICY "System admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_system_admin(auth.uid()));

CREATE POLICY "System admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.is_system_admin(auth.uid()));