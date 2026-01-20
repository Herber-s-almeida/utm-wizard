-- Recreate function as PL/pgSQL to prevent inlining (which causes infinite recursion)
-- Also add row_security = off to completely bypass RLS inside this function
CREATE OR REPLACE FUNCTION public.can_view_environment_roles(_environment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.environment_roles
    WHERE environment_id = _environment_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
END;
$$;