
-- Allow finance-section users to also SELECT from media_plans, media_lines, clients, channels, vehicles,
-- line_details, line_detail_items, plan_budget_distributions, media_line_monthly_budgets
-- by adding additional RLS policies that check for finance access.

-- media_plans: finance users need to read plans for documents, forecasts, etc.
CREATE POLICY "Finance read access for media_plans"
ON public.media_plans FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));

-- media_lines: finance users need line data for breakdowns
CREATE POLICY "Finance read access for media_lines"
ON public.media_lines FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));

-- clients: finance uses clients as "Produto"
CREATE POLICY "Finance read access for clients"
ON public.clients FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));

-- channels: finance may reference channels
CREATE POLICY "Finance read access for channels"
ON public.channels FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));

-- vehicles: finance may reference vehicles
CREATE POLICY "Finance read access for vehicles"
ON public.vehicles FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));

-- line_details: finance references line details
CREATE POLICY "Finance read access for line_details"
ON public.line_details FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));

-- line_detail_items: finance references detail items
CREATE POLICY "Finance read access for line_detail_items"
ON public.line_detail_items FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));

-- plan_budget_distributions: finance needs budget data
CREATE POLICY "Finance read access for plan_budget_distributions"
ON public.plan_budget_distributions FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));

-- media_line_monthly_budgets: finance needs monthly budget data
CREATE POLICY "Finance read access for media_line_monthly_budgets"
ON public.media_line_monthly_budgets FOR SELECT TO authenticated
USING (has_environment_section_access(environment_id, 'finance', 'view'));
