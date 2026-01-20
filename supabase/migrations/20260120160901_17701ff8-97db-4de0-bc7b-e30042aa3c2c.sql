-- Resolve infinite recursion between public.environments <-> public.environment_roles RLS
-- Root cause: environments SELECT policy referenced environment_roles, while environment_roles policies referenced environments.
-- Additionally, the previous environments policy had a bug: (er.environment_id = er.id)

-- 1) Create recursion-safe helper to check environment ownership
CREATE OR REPLACE FUNCTION public.is_environment_owner_of(_environment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.environments e
    WHERE e.id = _environment_id
      AND e.owner_user_id = _user_id
  );
END;
$$;

-- 2) Replace environment_roles policies to avoid referencing environments directly (breaks cycles)
DROP POLICY IF EXISTS "Users can view environment roles" ON public.environment_roles;
DROP POLICY IF EXISTS "Environment owners can insert roles" ON public.environment_roles;
DROP POLICY IF EXISTS "Environment owners can update roles" ON public.environment_roles;
DROP POLICY IF EXISTS "Environment owners can delete roles" ON public.environment_roles;

CREATE POLICY "Users can view environment roles"
ON public.environment_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
  OR public.is_environment_owner_of(environment_id, auth.uid())
);

CREATE POLICY "Environment owners can insert roles"
ON public.environment_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_system_admin(auth.uid())
  OR public.is_environment_owner_of(environment_id, auth.uid())
);

CREATE POLICY "Environment owners can update roles"
ON public.environment_roles
FOR UPDATE
TO authenticated
USING (
  public.is_system_admin(auth.uid())
  OR public.is_environment_owner_of(environment_id, auth.uid())
)
WITH CHECK (
  public.is_system_admin(auth.uid())
  OR public.is_environment_owner_of(environment_id, auth.uid())
);

CREATE POLICY "Environment owners can delete roles"
ON public.environment_roles
FOR DELETE
TO authenticated
USING (
  public.is_system_admin(auth.uid())
  OR public.is_environment_owner_of(environment_id, auth.uid())
);

-- 3) Fix environments SELECT policy to avoid referencing environment_roles directly
-- Use public.can_view_environment_roles(id) (already plpgsql + row_security=off)
DROP POLICY IF EXISTS "Users can view environments they belong to" ON public.environments;

CREATE POLICY "Users can view environments they belong to"
ON public.environments
FOR SELECT
TO authenticated
USING (
  public.is_system_admin(auth.uid())
  OR owner_user_id = auth.uid()
  OR public.can_view_environment_roles(id)
);
