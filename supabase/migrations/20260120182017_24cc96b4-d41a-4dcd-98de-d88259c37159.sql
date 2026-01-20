-- Phase 1: Create RPC function to get environment members with full details (name + email)
-- Phase 2: Add is_environment_admin column to environment_roles

-- Add is_environment_admin column
ALTER TABLE public.environment_roles 
ADD COLUMN IF NOT EXISTS is_environment_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Create RPC function to fetch members with their details
-- Uses SECURITY DEFINER to safely access auth.users for emails
CREATE OR REPLACE FUNCTION public.get_environment_members_with_details(p_environment_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  environment_id UUID,
  full_name TEXT,
  email TEXT,
  is_environment_admin BOOLEAN,
  role_read BOOLEAN,
  role_edit BOOLEAN,
  role_delete BOOLEAN,
  role_invite BOOLEAN,
  perm_executive_dashboard TEXT,
  perm_reports TEXT,
  perm_finance TEXT,
  perm_media_plans TEXT,
  perm_media_resources TEXT,
  perm_taxonomy TEXT,
  perm_library TEXT,
  notify_media_resources BOOLEAN,
  created_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has access to this environment
  IF NOT (
    is_system_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM environment_roles er 
      WHERE er.environment_id = p_environment_id 
      AND er.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM environments e 
      WHERE e.id = p_environment_id 
      AND e.owner_user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to environment';
  END IF;

  RETURN QUERY
  SELECT 
    er.id,
    er.user_id,
    er.environment_id,
    COALESCE(p.full_name, 'Usuário') AS full_name,
    au.email,
    er.is_environment_admin,
    er.role_read,
    er.role_edit,
    er.role_delete,
    er.role_invite,
    er.perm_executive_dashboard::TEXT,
    er.perm_reports::TEXT,
    er.perm_finance::TEXT,
    er.perm_media_plans::TEXT,
    er.perm_media_resources::TEXT,
    er.perm_taxonomy::TEXT,
    er.perm_library::TEXT,
    er.notify_media_resources,
    er.created_at,
    er.accepted_at
  FROM environment_roles er
  LEFT JOIN profiles p ON p.user_id = er.user_id
  LEFT JOIN auth.users au ON au.id = er.user_id
  WHERE er.environment_id = p_environment_id
  ORDER BY er.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_environment_members_with_details(UUID) TO authenticated;