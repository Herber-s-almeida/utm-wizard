-- Allow system admins to view all media plans
CREATE POLICY "System admins can view all media plans"
ON public.media_plans
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Allow system admins to view all media lines
CREATE POLICY "System admins can view all media lines"
ON public.media_lines
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Allow system admins to view all plan_roles
CREATE POLICY "System admins can view all plan roles"
ON public.plan_roles
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Allow system admins to view all plan_budget_distributions  
CREATE POLICY "System admins can view all budget distributions"
ON public.plan_budget_distributions
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Allow system admins to view all media_line_monthly_budgets
CREATE POLICY "System admins can view all monthly budgets"
ON public.media_line_monthly_budgets
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Allow system admins to view all plan_status_history
CREATE POLICY "System admins can view all status history"
ON public.plan_status_history
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Allow system admins to view all media_plan_versions
CREATE POLICY "System admins can view all plan versions"
ON public.media_plan_versions
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Allow system admins to view all plan_subdivisions
CREATE POLICY "System admins can view all plan subdivisions"
ON public.plan_subdivisions
FOR SELECT
USING (public.is_system_admin(auth.uid()));

-- Allow system admins to view all media_creatives
CREATE POLICY "System admins can view all creatives"
ON public.media_creatives
FOR SELECT
USING (public.is_system_admin(auth.uid()));