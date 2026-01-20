-- ================================================================
-- Migration: Eliminate Owner Concept - 100% Role-Based System
-- Part 2: Update functions that need DROP first
-- ================================================================

-- 6. Drop and recreate get_user_environments_v2 with new return type
DROP FUNCTION IF EXISTS public.get_user_environments_v2(UUID);

CREATE FUNCTION public.get_user_environments_v2(_user_id UUID)
RETURNS TABLE (
  environment_id UUID,
  environment_name TEXT,
  environment_owner_id UUID,
  is_own_environment BOOLEAN,
  is_environment_admin BOOLEAN,
  role_read BOOLEAN,
  role_edit BOOLEAN,
  role_delete BOOLEAN,
  role_invite BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id AS environment_id,
    e.name AS environment_name,
    e.owner_user_id AS environment_owner_id,
    -- is_own_environment is now based on being an admin, not owner_user_id
    er.is_environment_admin AS is_own_environment,
    er.is_environment_admin,
    er.role_read,
    er.role_edit,
    er.role_delete,
    er.role_invite
  FROM public.environments e
  INNER JOIN public.environment_roles er ON er.environment_id = e.id
  WHERE er.user_id = _user_id
    AND er.accepted_at IS NOT NULL;
END;
$$;

-- 7. Update get_environment_members_with_details to not check owner_user_id
CREATE OR REPLACE FUNCTION public.get_environment_members_with_details(p_environment_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  is_environment_admin BOOLEAN,
  perm_executive_dashboard TEXT,
  perm_reports TEXT,
  perm_finance TEXT,
  perm_media_plans TEXT,
  perm_media_resources TEXT,
  perm_taxonomy TEXT,
  perm_library TEXT,
  role_read BOOLEAN,
  role_edit BOOLEAN,
  role_delete BOOLEAN,
  role_invite BOOLEAN,
  accepted_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Verify caller has access to this environment (is admin or member of this environment)
  IF NOT (
    is_system_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM environment_roles er 
      WHERE er.environment_id = p_environment_id 
      AND er.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to environment';
  END IF;

  RETURN QUERY
  SELECT 
    er.user_id,
    au.email::TEXT,
    p.full_name,
    er.is_environment_admin,
    er.perm_executive_dashboard::TEXT,
    er.perm_reports::TEXT,
    er.perm_finance::TEXT,
    er.perm_media_plans::TEXT,
    er.perm_media_resources::TEXT,
    er.perm_taxonomy::TEXT,
    er.perm_library::TEXT,
    er.role_read,
    er.role_edit,
    er.role_delete,
    er.role_invite,
    er.accepted_at,
    er.invited_at
  FROM public.environment_roles er
  LEFT JOIN auth.users au ON au.id = er.user_id
  LEFT JOIN public.profiles p ON p.user_id = er.user_id
  WHERE er.environment_id = p_environment_id
  ORDER BY er.is_environment_admin DESC, p.full_name ASC;
END;
$$;