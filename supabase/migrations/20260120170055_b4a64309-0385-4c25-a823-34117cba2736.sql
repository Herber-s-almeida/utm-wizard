-- Add status column to pending_environment_invites for explicit invite lifecycle management
ALTER TABLE public.pending_environment_invites 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'invited'
  CHECK (status IN ('invited', 'accepted', 'expired', 'revoked'));

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_pending_invites_status ON public.pending_environment_invites(status);

-- Create index for faster email + status queries
CREATE INDEX IF NOT EXISTS idx_pending_invites_email_status ON public.pending_environment_invites(email, status);

-- Add environment_id column to directly link to environments table (better than environment_owner_id)
ALTER TABLE public.pending_environment_invites 
ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);

-- Update existing records to set environment_id based on environment_owner_id
UPDATE public.pending_environment_invites pi
SET environment_id = e.id
FROM public.environments e
WHERE pi.environment_owner_id = e.owner_user_id
  AND pi.environment_id IS NULL;

-- Create function to automatically expire old invites
CREATE OR REPLACE FUNCTION public.expire_pending_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expired_count INTEGER;
BEGIN
  UPDATE public.pending_environment_invites
  SET status = 'expired'
  WHERE status = 'invited'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS _expired_count = ROW_COUNT;
  RETURN _expired_count;
END;
$$;

-- Update the process_pending_invites function to use status and environment_id
CREATE OR REPLACE FUNCTION public.process_pending_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Insert into environment_roles from valid pending invites
  INSERT INTO public.environment_roles (
    environment_id,
    user_id,
    invited_by,
    invited_at,
    accepted_at,
    role_read,
    role_edit,
    role_delete,
    role_invite,
    perm_executive_dashboard,
    perm_reports,
    perm_finance,
    perm_media_plans,
    perm_media_resources,
    perm_taxonomy,
    perm_library
  )
  SELECT 
    COALESCE(pi.environment_id, (SELECT id FROM public.environments WHERE owner_user_id = pi.environment_owner_id LIMIT 1)),
    NEW.id,
    pi.invited_by,
    pi.created_at,
    NOW(),
    true, -- role_read
    CASE WHEN pi.environment_role = 'admin' THEN true ELSE false END, -- role_edit
    CASE WHEN pi.environment_role = 'admin' THEN true ELSE false END, -- role_delete
    CASE WHEN pi.environment_role = 'admin' THEN true ELSE false END, -- role_invite
    pi.perm_executive_dashboard,
    pi.perm_reports,
    pi.perm_finance,
    pi.perm_media_plans,
    pi.perm_media_resources,
    pi.perm_taxonomy,
    pi.perm_library
  FROM public.pending_environment_invites pi
  WHERE LOWER(pi.email) = LOWER(NEW.email)
    AND pi.status = 'invited'
    AND pi.expires_at > NOW();
  
  -- Mark processed invites as accepted (not delete, for audit trail)
  UPDATE public.pending_environment_invites 
  SET status = 'accepted'
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'invited';
  
  RETURN NEW;
END;
$$;