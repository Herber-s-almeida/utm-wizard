
-- ============================================
-- MIGRATION: User-based to Environment-based Access Control
-- ============================================

-- STEP 1: Create the environments table
CREATE TABLE public.environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on environments
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

-- STEP 2: Create the environment_roles table
CREATE TABLE public.environment_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES public.environments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Core permissions
  role_read BOOLEAN NOT NULL DEFAULT true,
  role_edit BOOLEAN NOT NULL DEFAULT false,
  role_delete BOOLEAN NOT NULL DEFAULT false,
  role_invite BOOLEAN NOT NULL DEFAULT false,
  
  -- Section-specific permissions (for granular control)
  perm_executive_dashboard environment_permission_level DEFAULT 'none',
  perm_reports environment_permission_level DEFAULT 'none',
  perm_finance environment_permission_level DEFAULT 'none',
  perm_media_plans environment_permission_level DEFAULT 'none',
  perm_media_resources environment_permission_level DEFAULT 'none',
  perm_taxonomy environment_permission_level DEFAULT 'none',
  perm_library environment_permission_level DEFAULT 'none',
  
  -- Metadata
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(environment_id, user_id)
);

-- Enable RLS on environment_roles
ALTER TABLE public.environment_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_environments_owner ON public.environments(owner_user_id);
CREATE INDEX idx_environment_roles_environment ON public.environment_roles(environment_id);
CREATE INDEX idx_environment_roles_user ON public.environment_roles(user_id);

-- STEP 3: Create environments for existing system users
INSERT INTO public.environments (id, name, owner_user_id)
SELECT 
  gen_random_uuid(),
  COALESCE(p.company, p.full_name, 'Meu Ambiente'),
  p.user_id
FROM public.profiles p
WHERE p.is_system_user = true;

-- STEP 4: Migrate existing environment_members to environment_roles
INSERT INTO public.environment_roles (
  environment_id, 
  user_id, 
  role_read, 
  role_edit, 
  role_delete, 
  role_invite,
  perm_executive_dashboard,
  perm_reports,
  perm_finance,
  perm_media_plans,
  perm_media_resources,
  perm_taxonomy,
  perm_library,
  invited_by,
  invited_at,
  accepted_at
)
SELECT 
  e.id as environment_id,
  em.member_user_id as user_id,
  true as role_read,
  em.environment_role IN ('admin', 'owner') as role_edit,
  em.environment_role IN ('admin', 'owner') as role_delete,
  em.environment_role IN ('admin', 'owner') as role_invite,
  COALESCE(em.perm_executive_dashboard, 'none'),
  COALESCE(em.perm_reports, 'none'),
  COALESCE(em.perm_finance, 'none'),
  COALESCE(em.perm_media_plans, 'none'),
  COALESCE(em.perm_media_resources, 'none'),
  COALESCE(em.perm_taxonomy, 'none'),
  COALESCE(em.perm_library, 'none'),
  em.invited_by,
  em.invited_at,
  em.accepted_at
FROM public.environment_members em
JOIN public.environments e ON e.owner_user_id = em.environment_owner_id
WHERE em.accepted_at IS NOT NULL;

-- STEP 5: Add owner as member of their own environment with full permissions
INSERT INTO public.environment_roles (
  environment_id, 
  user_id, 
  role_read, 
  role_edit, 
  role_delete, 
  role_invite,
  perm_executive_dashboard,
  perm_reports,
  perm_finance,
  perm_media_plans,
  perm_media_resources,
  perm_taxonomy,
  perm_library,
  accepted_at
)
SELECT 
  e.id as environment_id,
  e.owner_user_id as user_id,
  true, true, true, true,
  'admin', 'admin', 'admin', 'admin', 'admin', 'admin', 'admin',
  now()
FROM public.environments e
ON CONFLICT (environment_id, user_id) DO NOTHING;

-- STEP 6: Create helper function to get environment_id from user_id
CREATE OR REPLACE FUNCTION public.get_environment_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.environments WHERE owner_user_id = _user_id LIMIT 1;
$$;

-- STEP 7: Add environment_id to data tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.clients SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.vehicles SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.channels SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.mediums ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.mediums SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.formats ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.formats SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.format_creative_types ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.format_creative_types SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.creative_type_specifications ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.creative_type_specifications SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.creative_templates ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.creative_templates SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.funnel_stages ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.funnel_stages SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.media_objectives ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.media_objectives SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.targets SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.moments ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.moments SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.statuses ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.statuses SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL AND user_id IS NOT NULL;

ALTER TABLE public.behavioral_segmentations ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.behavioral_segmentations SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.custom_kpis ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.custom_kpis SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.line_detail_types ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.line_detail_types SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.media_plans ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.media_plans SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.media_lines ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.media_lines SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.media_creatives ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.media_creatives SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.line_details ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.line_details SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.line_detail_items ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.line_detail_items SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.line_detail_insertions ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.line_detail_insertions SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.line_targets ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.line_targets SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.plan_subdivisions ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.plan_subdivisions SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.plan_budget_distributions ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.plan_budget_distributions SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.media_line_monthly_budgets ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.media_line_monthly_budgets SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.data_sources ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.data_sources SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

-- Finance tables
ALTER TABLE public.financial_documents ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.financial_documents SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.financial_payments ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.financial_payments SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.financial_actuals ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.financial_actuals SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.financial_forecasts ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.financial_forecasts SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.financial_revenues ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.financial_revenues SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.financial_vendors ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.financial_vendors SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_account_managers ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_account_managers SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_accounts ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_accounts SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_campaign_projects ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_campaign_projects SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_cost_centers ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_cost_centers SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_document_types ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_document_types SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_expense_classifications ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_expense_classifications SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_macro_classifications ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_macro_classifications SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_packages ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_packages SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_request_types ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_request_types SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_statuses ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_statuses SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.finance_teams ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.finance_teams SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

ALTER TABLE public.financial_alert_configs ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id);
UPDATE public.financial_alert_configs SET environment_id = public.get_environment_id_for_user(user_id) WHERE environment_id IS NULL;

-- STEP 8: Create indexes for environment_id
CREATE INDEX IF NOT EXISTS idx_clients_environment ON public.clients(environment_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_environment ON public.vehicles(environment_id);
CREATE INDEX IF NOT EXISTS idx_channels_environment ON public.channels(environment_id);
CREATE INDEX IF NOT EXISTS idx_mediums_environment ON public.mediums(environment_id);
CREATE INDEX IF NOT EXISTS idx_formats_environment ON public.formats(environment_id);
CREATE INDEX IF NOT EXISTS idx_format_creative_types_environment ON public.format_creative_types(environment_id);
CREATE INDEX IF NOT EXISTS idx_creative_type_specifications_environment ON public.creative_type_specifications(environment_id);
CREATE INDEX IF NOT EXISTS idx_creative_templates_environment ON public.creative_templates(environment_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_environment ON public.funnel_stages(environment_id);
CREATE INDEX IF NOT EXISTS idx_media_objectives_environment ON public.media_objectives(environment_id);
CREATE INDEX IF NOT EXISTS idx_targets_environment ON public.targets(environment_id);
CREATE INDEX IF NOT EXISTS idx_moments_environment ON public.moments(environment_id);
CREATE INDEX IF NOT EXISTS idx_statuses_environment ON public.statuses(environment_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_segmentations_environment ON public.behavioral_segmentations(environment_id);
CREATE INDEX IF NOT EXISTS idx_custom_kpis_environment ON public.custom_kpis(environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_types_environment ON public.line_detail_types(environment_id);
CREATE INDEX IF NOT EXISTS idx_media_plans_environment ON public.media_plans(environment_id);
CREATE INDEX IF NOT EXISTS idx_media_lines_environment ON public.media_lines(environment_id);
CREATE INDEX IF NOT EXISTS idx_media_creatives_environment ON public.media_creatives(environment_id);
CREATE INDEX IF NOT EXISTS idx_line_details_environment ON public.line_details(environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_items_environment ON public.line_detail_items(environment_id);
CREATE INDEX IF NOT EXISTS idx_line_detail_insertions_environment ON public.line_detail_insertions(environment_id);
CREATE INDEX IF NOT EXISTS idx_line_targets_environment ON public.line_targets(environment_id);
CREATE INDEX IF NOT EXISTS idx_plan_subdivisions_environment ON public.plan_subdivisions(environment_id);
CREATE INDEX IF NOT EXISTS idx_plan_budget_distributions_environment ON public.plan_budget_distributions(environment_id);
CREATE INDEX IF NOT EXISTS idx_media_line_monthly_budgets_environment ON public.media_line_monthly_budgets(environment_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_environment ON public.data_sources(environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_environment ON public.financial_documents(environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_environment ON public.financial_payments(environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_actuals_environment ON public.financial_actuals(environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_forecasts_environment ON public.financial_forecasts(environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_revenues_environment ON public.financial_revenues(environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_vendors_environment ON public.financial_vendors(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_account_managers_environment ON public.finance_account_managers(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_environment ON public.finance_accounts(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_campaign_projects_environment ON public.finance_campaign_projects(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_cost_centers_environment ON public.finance_cost_centers(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_document_types_environment ON public.finance_document_types(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_expense_classifications_environment ON public.finance_expense_classifications(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_macro_classifications_environment ON public.finance_macro_classifications(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_packages_environment ON public.finance_packages(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_request_types_environment ON public.finance_request_types(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_statuses_environment ON public.finance_statuses(environment_id);
CREATE INDEX IF NOT EXISTS idx_finance_teams_environment ON public.finance_teams(environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_alert_configs_environment ON public.financial_alert_configs(environment_id);

-- STEP 9: Create the main access control function
CREATE OR REPLACE FUNCTION public.has_environment_access(
  _environment_id UUID,
  _permission TEXT DEFAULT 'read'
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF _environment_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_system_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.environment_roles er
    WHERE er.environment_id = _environment_id
      AND er.user_id = _user_id
      AND er.accepted_at IS NOT NULL
      AND (
        (_permission = 'read' AND er.role_read = true) OR
        (_permission = 'edit' AND er.role_edit = true) OR
        (_permission = 'delete' AND er.role_delete = true) OR
        (_permission = 'invite' AND er.role_invite = true)
      )
  );
END;
$$;

-- STEP 10: Create function to get user's environments
CREATE OR REPLACE FUNCTION public.get_user_environments_v2(_user_id UUID)
RETURNS TABLE (
  environment_id UUID,
  environment_name TEXT,
  environment_owner_id UUID,
  is_own_environment BOOLEAN,
  role_read BOOLEAN,
  role_edit BOOLEAN,
  role_delete BOOLEAN,
  role_invite BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    e.id as environment_id,
    e.name as environment_name,
    e.owner_user_id as environment_owner_id,
    e.owner_user_id = _user_id as is_own_environment,
    er.role_read,
    er.role_edit,
    er.role_delete,
    er.role_invite
  FROM public.environments e
  JOIN public.environment_roles er ON er.environment_id = e.id
  WHERE er.user_id = _user_id
    AND er.accepted_at IS NOT NULL
  ORDER BY (e.owner_user_id = _user_id) DESC, e.name ASC;
$$;

-- STEP 11: RLS policies for environments
CREATE POLICY "Users can view environments they belong to"
ON public.environments FOR SELECT
USING (
  public.is_system_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.environment_roles er
    WHERE er.environment_id = id
      AND er.user_id = auth.uid()
      AND er.accepted_at IS NOT NULL
  )
);

CREATE POLICY "Only owners can update their environments"
ON public.environments FOR UPDATE
USING (owner_user_id = auth.uid() OR public.is_system_admin(auth.uid()));

CREATE POLICY "Authenticated users can create environments"
ON public.environments FOR INSERT
WITH CHECK (owner_user_id = auth.uid() OR public.is_system_admin(auth.uid()));

-- STEP 12: RLS policies for environment_roles
CREATE POLICY "Users can view roles in their environments"
ON public.environment_roles FOR SELECT
USING (
  user_id = auth.uid() OR
  public.is_system_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_id
      AND e.owner_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.environment_roles er2
    WHERE er2.environment_id = environment_id
      AND er2.user_id = auth.uid()
      AND er2.role_invite = true
      AND er2.accepted_at IS NOT NULL
  )
);

CREATE POLICY "Environment admins can manage roles"
ON public.environment_roles FOR INSERT
WITH CHECK (
  public.is_system_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_id AND e.owner_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.environment_roles er2
    WHERE er2.environment_id = environment_id
      AND er2.user_id = auth.uid()
      AND er2.role_invite = true
      AND er2.accepted_at IS NOT NULL
  )
);

CREATE POLICY "Environment admins can update roles"
ON public.environment_roles FOR UPDATE
USING (
  public.is_system_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_id AND e.owner_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.environment_roles er2
    WHERE er2.environment_id = environment_id
      AND er2.user_id = auth.uid()
      AND er2.role_invite = true
      AND er2.accepted_at IS NOT NULL
  )
);

CREATE POLICY "Environment admins can delete roles"
ON public.environment_roles FOR DELETE
USING (
  public.is_system_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.environments e
    WHERE e.id = environment_id AND e.owner_user_id = auth.uid()
  )
);
