-- Drop and recreate the get_environment_members_with_details function
-- Fix: Remove reference to non-existent notify_media_resources column
-- Fix: Get email from auth.users instead of profiles

DROP FUNCTION IF EXISTS public.get_environment_members_with_details(UUID);

CREATE FUNCTION public.get_environment_members_with_details(p_environment_id UUID)
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
    AND er.user_id IS NOT NULL;
END;
$$;