-- Fix has_environment_section_access to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_environment_section_access(
  _environment_id uuid, 
  _section text, 
  _required_level text DEFAULT 'view'::text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _perm_level TEXT;
BEGIN
  IF _environment_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_system_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Get the permission level for the section
  SELECT 
    CASE _section
      WHEN 'library' THEN perm_library::TEXT
      WHEN 'media_plans' THEN perm_media_plans::TEXT
      WHEN 'media_resources' THEN perm_media_resources::TEXT
      WHEN 'taxonomy' THEN perm_taxonomy::TEXT
      WHEN 'finance' THEN perm_finance::TEXT
      WHEN 'reports' THEN perm_reports::TEXT
      WHEN 'executive_dashboard' THEN perm_executive_dashboard::TEXT
      ELSE 'none'
    END INTO _perm_level
  FROM public.environment_roles er
  WHERE er.environment_id = _environment_id
    AND er.user_id = _user_id
    AND er.accepted_at IS NOT NULL;
  
  IF _perm_level IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check permission level
  IF _required_level = 'view' THEN
    RETURN _perm_level IN ('view', 'edit', 'admin');
  ELSIF _required_level = 'edit' THEN
    RETURN _perm_level IN ('edit', 'admin');
  ELSIF _required_level = 'admin' THEN
    RETURN _perm_level = 'admin';
  END IF;
  
  RETURN false;
END;
$$;

-- Fix has_environment_access to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_environment_access(
  _environment_id uuid, 
  _permission text DEFAULT 'read'::text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF _environment_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_system_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.environment_roles er
    WHERE er.environment_id = _environment_id
      AND er.user_id = _user_id
      AND er.accepted_at IS NOT NULL
      AND (
        (_permission = 'read' AND er.role_read = true) OR
        (_permission = 'edit' AND er.role_edit = true) OR
        (_permission = 'delete' AND er.role_delete = true) OR
        (_permission = 'invite' AND er.role_invite = true)
      )
  );
END;
$$;