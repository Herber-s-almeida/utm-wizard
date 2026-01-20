-- Create SECURITY DEFINER function to check environment role access without triggering RLS
CREATE OR REPLACE FUNCTION public.can_view_environment_roles(_environment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM environment_roles
    WHERE environment_id = _environment_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  )
$$;

-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view roles in their environments" ON environment_roles;
DROP POLICY IF EXISTS "Environment admins can manage roles" ON environment_roles;
DROP POLICY IF EXISTS "Environment admins can update roles" ON environment_roles;
DROP POLICY IF EXISTS "Environment admins can delete roles" ON environment_roles;
DROP POLICY IF EXISTS "Users can view own roles and environment members" ON environment_roles;
DROP POLICY IF EXISTS "Environment admins can insert roles" ON environment_roles;

-- New SELECT policy (no recursion - user can see their own role OR owner/sysadmin can see all)
CREATE POLICY "Users can view own roles and environment members"
ON public.environment_roles FOR SELECT
USING (
  user_id = auth.uid()
  OR is_system_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM environments e 
    WHERE e.id = environment_roles.environment_id 
    AND e.owner_user_id = auth.uid()
  )
  OR can_view_environment_roles(environment_id)
);

-- INSERT policy - only owners and sysadmins can add roles
CREATE POLICY "Environment owners can insert roles"
ON public.environment_roles FOR INSERT
WITH CHECK (
  is_system_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM environments e 
    WHERE e.id = environment_id 
    AND e.owner_user_id = auth.uid()
  )
);

-- UPDATE policy - only owners and sysadmins can update roles
CREATE POLICY "Environment owners can update roles"
ON public.environment_roles FOR UPDATE
USING (
  is_system_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM environments e 
    WHERE e.id = environment_roles.environment_id 
    AND e.owner_user_id = auth.uid()
  )
);

-- DELETE policy - only owners and sysadmins can delete roles
CREATE POLICY "Environment owners can delete roles"
ON public.environment_roles FOR DELETE
USING (
  is_system_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM environments e 
    WHERE e.id = environment_roles.environment_id 
    AND e.owner_user_id = auth.uid()
  )
);