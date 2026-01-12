-- Drop redundant and slow RLS policies on media_plans
DROP POLICY IF EXISTS "Users can view own and shared plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can view accessible plans" ON public.media_plans;
DROP POLICY IF EXISTS "System admins can view all media plans" ON public.media_plans;

-- Create a single optimized SELECT policy that combines all conditions
-- Using OR short-circuit evaluation for performance
CREATE POLICY "Users can view media plans" 
ON public.media_plans 
FOR SELECT 
USING (
  -- Fast check first: own plans
  user_id = auth.uid()
  -- Then check plan roles
  OR has_plan_role(id, auth.uid(), NULL::app_role[])
  -- Then check environment access
  OR can_access_user_data(user_id)
  -- Finally check system admin (slowest)
  OR is_system_admin(auth.uid())
);