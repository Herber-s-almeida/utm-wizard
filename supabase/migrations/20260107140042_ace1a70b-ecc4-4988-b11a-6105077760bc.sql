-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create extensions" ON public.file_extensions;

-- Create a more restrictive INSERT policy - only system admins can create extensions
CREATE POLICY "System admins can create extensions" 
ON public.file_extensions 
FOR INSERT 
TO authenticated
WITH CHECK (is_system_admin(auth.uid()));