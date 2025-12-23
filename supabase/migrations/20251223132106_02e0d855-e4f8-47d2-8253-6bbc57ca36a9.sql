-- Drop existing policy on media_plans
DROP POLICY IF EXISTS "Users can CRUD own media plans" ON public.media_plans;

-- Recreate policy with proper role restriction (authenticated only)
CREATE POLICY "Users can CRUD own media plans"
ON public.media_plans
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);