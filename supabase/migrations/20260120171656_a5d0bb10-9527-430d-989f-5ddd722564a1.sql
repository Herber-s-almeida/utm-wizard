-- Create invite_audit_log table for tracking all invite actions
CREATE TABLE public.invite_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('invited', 'accepted', 'expired', 'revoked', 'resent')),
  invite_type TEXT NOT NULL CHECK (invite_type IN ('system_user', 'environment_member')),
  email TEXT NOT NULL,
  environment_id UUID REFERENCES public.environments(id) ON DELETE SET NULL,
  environment_owner_id UUID,
  invited_by UUID,
  target_user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invite_audit_log ENABLE ROW LEVEL SECURITY;

-- System admins can view all audit logs
CREATE POLICY "System admins can view all invite audit logs"
  ON public.invite_audit_log
  FOR SELECT
  USING (public.is_system_admin(auth.uid()));

-- Environment admins can view audit logs for their environment
CREATE POLICY "Environment admins can view their environment invite audit logs"
  ON public.invite_audit_log
  FOR SELECT
  USING (
    environment_owner_id = auth.uid() OR
    environment_id IN (
      SELECT environment_id FROM public.environment_roles
      WHERE user_id = auth.uid() AND role_invite = true
    )
  );

-- Anyone authenticated can insert audit logs (controlled by edge functions)
CREATE POLICY "Authenticated users can insert invite audit logs"
  ON public.invite_audit_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for efficient querying
CREATE INDEX idx_invite_audit_log_email ON public.invite_audit_log(email);
CREATE INDEX idx_invite_audit_log_environment_id ON public.invite_audit_log(environment_id);
CREATE INDEX idx_invite_audit_log_created_at ON public.invite_audit_log(created_at DESC);
CREATE INDEX idx_invite_audit_log_action ON public.invite_audit_log(action);

-- Add invite_type column to pending_environment_invites to distinguish types
ALTER TABLE public.pending_environment_invites
ADD COLUMN IF NOT EXISTS invite_type TEXT DEFAULT 'environment_member' 
CHECK (invite_type IN ('system_user', 'environment_member'));