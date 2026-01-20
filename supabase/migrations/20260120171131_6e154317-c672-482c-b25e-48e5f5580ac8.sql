-- Create system_access_requests table for users who want to create their own environment
CREATE TABLE public.system_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate pending requests for same email
  CONSTRAINT unique_pending_email UNIQUE (email) DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS
ALTER TABLE public.system_access_requests ENABLE ROW LEVEL SECURITY;

-- Only system admins can view requests
CREATE POLICY "System admins can view all requests"
  ON public.system_access_requests
  FOR SELECT
  USING (public.is_system_admin(auth.uid()));

-- Only system admins can update requests (approve/reject)
CREATE POLICY "System admins can update requests"
  ON public.system_access_requests
  FOR UPDATE
  USING (public.is_system_admin(auth.uid()));

-- Anyone can insert a request (public registration) - no auth required
CREATE POLICY "Anyone can create access requests"
  ON public.system_access_requests
  FOR INSERT
  WITH CHECK (true);

-- System admins can delete requests
CREATE POLICY "System admins can delete requests"
  ON public.system_access_requests
  FOR DELETE
  USING (public.is_system_admin(auth.uid()));

-- Create index for efficient lookups
CREATE INDEX idx_system_access_requests_email ON public.system_access_requests(email);
CREATE INDEX idx_system_access_requests_status ON public.system_access_requests(status);

-- Trigger to update updated_at
CREATE TRIGGER update_system_access_requests_updated_at
  BEFORE UPDATE ON public.system_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();