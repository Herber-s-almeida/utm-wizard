-- Fix profiles table: Add INSERT policy for new users
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ensure media_creatives table has proper RLS (it exists but let's verify policies)
-- First drop existing policy if it uses wrong syntax
DROP POLICY IF EXISTS "Users can CRUD own creatives" ON public.media_creatives;

-- Recreate with proper policy
CREATE POLICY "Users can CRUD own creatives" 
ON public.media_creatives 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);