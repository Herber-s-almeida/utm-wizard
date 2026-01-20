-- Fix infinite recursion in environment_roles SELECT policy
-- The problem: current policy uses can_view_environment_roles() which queries environment_roles, causing recursion

-- Step 1: Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view own roles and environment members" ON public.environment_roles;

-- Step 2: Create a simple, non-recursive SELECT policy
-- Users can see:
-- 1. Their own row (user_id = auth.uid()) - no recursion
-- 2. All rows if they are system admin - uses separate table
-- 3. All rows in environments they own - uses environments table, not environment_roles
CREATE POLICY "Users can view environment roles"
ON public.environment_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_roles.environment_id
    AND e.owner_user_id = auth.uid()
  )
);

-- Note: This means non-owner members cannot list ALL members of an environment via direct SELECT.
-- If that feature is needed, it should be done via an RPC function.
-- For now, each user can read their own permissions, which is what the UI needs to function.