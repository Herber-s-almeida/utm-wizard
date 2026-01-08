-- Allow system admins to delete media plans (permanent delete from trash)
DROP POLICY IF EXISTS "Only owners can delete plans" ON public.media_plans;
CREATE POLICY "Only owners can delete plans"
ON public.media_plans
FOR DELETE
USING ((user_id = auth.uid()) OR is_system_admin(auth.uid()));