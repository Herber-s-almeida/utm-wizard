-- Drop the existing incomplete policy
DROP POLICY IF EXISTS "Users can CRUD own media lines" ON public.media_lines;

-- Create a new policy with both USING and WITH CHECK conditions
CREATE POLICY "Users can CRUD own media lines" 
ON public.media_lines 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);