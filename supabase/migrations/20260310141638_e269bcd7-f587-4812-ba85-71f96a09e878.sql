
DROP POLICY IF EXISTS "Members can view their environments" ON public.environments;

CREATE POLICY "Members can view their environments"
ON public.environments FOR SELECT
TO authenticated
USING (
  is_system_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.environment_roles er
    WHERE er.environment_id = environments.id
      AND er.user_id = auth.uid()
      AND er.accepted_at IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Environment admins can update environments" ON public.environments;

CREATE POLICY "Environment admins can update environments"
ON public.environments FOR UPDATE
TO authenticated
USING (
  is_system_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.environment_roles er
    WHERE er.environment_id = environments.id
      AND er.user_id = auth.uid()
      AND er.is_environment_admin = true
      AND er.accepted_at IS NOT NULL
  )
);
