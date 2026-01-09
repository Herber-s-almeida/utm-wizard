-- =============================================
-- FASE 2.2: Atualizar RLS das tabelas de dados
-- Adicionar verificação de acesso por ambiente
-- =============================================

-- Helper: Função para verificar acesso (próprio, membro do ambiente, ou system admin)
CREATE OR REPLACE FUNCTION public.can_access_user_data(_owner_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _owner_user_id = auth.uid()
    OR public.is_environment_member(_owner_user_id, auth.uid())
    OR public.is_system_admin(auth.uid())
$$;

-- =============================================
-- FINANCE LIBRARY TABLES
-- =============================================

-- finance_account_managers
DROP POLICY IF EXISTS "Users can manage their own account managers" ON public.finance_account_managers;
DROP POLICY IF EXISTS "Users can view accessible account managers" ON public.finance_account_managers;
DROP POLICY IF EXISTS "Users can insert own account managers" ON public.finance_account_managers;
DROP POLICY IF EXISTS "Users can update own account managers" ON public.finance_account_managers;
DROP POLICY IF EXISTS "Users can delete own account managers" ON public.finance_account_managers;
CREATE POLICY "Users can view accessible account managers" ON public.finance_account_managers
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own account managers" ON public.finance_account_managers
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own account managers" ON public.finance_account_managers
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own account managers" ON public.finance_account_managers
  FOR DELETE USING (user_id = auth.uid());

-- finance_accounts
DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.finance_accounts;
DROP POLICY IF EXISTS "Users can view accessible accounts" ON public.finance_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.finance_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.finance_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.finance_accounts;
CREATE POLICY "Users can view accessible accounts" ON public.finance_accounts
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own accounts" ON public.finance_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own accounts" ON public.finance_accounts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own accounts" ON public.finance_accounts
  FOR DELETE USING (user_id = auth.uid());

-- finance_campaign_projects
DROP POLICY IF EXISTS "Users can manage their own campaign projects" ON public.finance_campaign_projects;
DROP POLICY IF EXISTS "Users can view accessible campaign projects" ON public.finance_campaign_projects;
DROP POLICY IF EXISTS "Users can insert own campaign projects" ON public.finance_campaign_projects;
DROP POLICY IF EXISTS "Users can update own campaign projects" ON public.finance_campaign_projects;
DROP POLICY IF EXISTS "Users can delete own campaign projects" ON public.finance_campaign_projects;
CREATE POLICY "Users can view accessible campaign projects" ON public.finance_campaign_projects
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own campaign projects" ON public.finance_campaign_projects
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own campaign projects" ON public.finance_campaign_projects
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own campaign projects" ON public.finance_campaign_projects
  FOR DELETE USING (user_id = auth.uid());

-- finance_cost_centers
DROP POLICY IF EXISTS "Users can manage their own cost centers" ON public.finance_cost_centers;
DROP POLICY IF EXISTS "Users can view accessible cost centers" ON public.finance_cost_centers;
DROP POLICY IF EXISTS "Users can insert own cost centers" ON public.finance_cost_centers;
DROP POLICY IF EXISTS "Users can update own cost centers" ON public.finance_cost_centers;
DROP POLICY IF EXISTS "Users can delete own cost centers" ON public.finance_cost_centers;
CREATE POLICY "Users can view accessible cost centers" ON public.finance_cost_centers
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own cost centers" ON public.finance_cost_centers
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cost centers" ON public.finance_cost_centers
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own cost centers" ON public.finance_cost_centers
  FOR DELETE USING (user_id = auth.uid());

-- finance_document_types
DROP POLICY IF EXISTS "Users can manage their own document types" ON public.finance_document_types;
DROP POLICY IF EXISTS "Users can view accessible document types" ON public.finance_document_types;
DROP POLICY IF EXISTS "Users can insert own document types" ON public.finance_document_types;
DROP POLICY IF EXISTS "Users can update own document types" ON public.finance_document_types;
DROP POLICY IF EXISTS "Users can delete own document types" ON public.finance_document_types;
CREATE POLICY "Users can view accessible document types" ON public.finance_document_types
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own document types" ON public.finance_document_types
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own document types" ON public.finance_document_types
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own document types" ON public.finance_document_types
  FOR DELETE USING (user_id = auth.uid());

-- finance_expense_classifications
DROP POLICY IF EXISTS "Users can manage their own expense classifications" ON public.finance_expense_classifications;
DROP POLICY IF EXISTS "Users can view accessible expense classifications" ON public.finance_expense_classifications;
DROP POLICY IF EXISTS "Users can insert own expense classifications" ON public.finance_expense_classifications;
DROP POLICY IF EXISTS "Users can update own expense classifications" ON public.finance_expense_classifications;
DROP POLICY IF EXISTS "Users can delete own expense classifications" ON public.finance_expense_classifications;
CREATE POLICY "Users can view accessible expense classifications" ON public.finance_expense_classifications
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own expense classifications" ON public.finance_expense_classifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own expense classifications" ON public.finance_expense_classifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own expense classifications" ON public.finance_expense_classifications
  FOR DELETE USING (user_id = auth.uid());

-- finance_macro_classifications
DROP POLICY IF EXISTS "Users can manage their own macro classifications" ON public.finance_macro_classifications;
DROP POLICY IF EXISTS "Users can view accessible macro classifications" ON public.finance_macro_classifications;
DROP POLICY IF EXISTS "Users can insert own macro classifications" ON public.finance_macro_classifications;
DROP POLICY IF EXISTS "Users can update own macro classifications" ON public.finance_macro_classifications;
DROP POLICY IF EXISTS "Users can delete own macro classifications" ON public.finance_macro_classifications;
CREATE POLICY "Users can view accessible macro classifications" ON public.finance_macro_classifications
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own macro classifications" ON public.finance_macro_classifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own macro classifications" ON public.finance_macro_classifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own macro classifications" ON public.finance_macro_classifications
  FOR DELETE USING (user_id = auth.uid());

-- finance_packages
DROP POLICY IF EXISTS "Users can manage their own packages" ON public.finance_packages;
DROP POLICY IF EXISTS "Users can view accessible packages" ON public.finance_packages;
DROP POLICY IF EXISTS "Users can insert own packages" ON public.finance_packages;
DROP POLICY IF EXISTS "Users can update own packages" ON public.finance_packages;
DROP POLICY IF EXISTS "Users can delete own packages" ON public.finance_packages;
CREATE POLICY "Users can view accessible packages" ON public.finance_packages
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own packages" ON public.finance_packages
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own packages" ON public.finance_packages
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own packages" ON public.finance_packages
  FOR DELETE USING (user_id = auth.uid());

-- finance_request_types
DROP POLICY IF EXISTS "Users can manage their own request types" ON public.finance_request_types;
DROP POLICY IF EXISTS "Users can view accessible request types" ON public.finance_request_types;
DROP POLICY IF EXISTS "Users can insert own request types" ON public.finance_request_types;
DROP POLICY IF EXISTS "Users can update own request types" ON public.finance_request_types;
DROP POLICY IF EXISTS "Users can delete own request types" ON public.finance_request_types;
CREATE POLICY "Users can view accessible request types" ON public.finance_request_types
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own request types" ON public.finance_request_types
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own request types" ON public.finance_request_types
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own request types" ON public.finance_request_types
  FOR DELETE USING (user_id = auth.uid());

-- finance_statuses
DROP POLICY IF EXISTS "Users can manage their own finance statuses" ON public.finance_statuses;
DROP POLICY IF EXISTS "Users can view accessible finance statuses" ON public.finance_statuses;
DROP POLICY IF EXISTS "Users can insert own finance statuses" ON public.finance_statuses;
DROP POLICY IF EXISTS "Users can update own finance statuses" ON public.finance_statuses;
DROP POLICY IF EXISTS "Users can delete own finance statuses" ON public.finance_statuses;
CREATE POLICY "Users can view accessible finance statuses" ON public.finance_statuses
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own finance statuses" ON public.finance_statuses
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own finance statuses" ON public.finance_statuses
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own finance statuses" ON public.finance_statuses
  FOR DELETE USING (user_id = auth.uid());

-- finance_teams
DROP POLICY IF EXISTS "Users can manage their own teams" ON public.finance_teams;
DROP POLICY IF EXISTS "Users can view accessible teams" ON public.finance_teams;
DROP POLICY IF EXISTS "Users can insert own teams" ON public.finance_teams;
DROP POLICY IF EXISTS "Users can update own teams" ON public.finance_teams;
DROP POLICY IF EXISTS "Users can delete own teams" ON public.finance_teams;
CREATE POLICY "Users can view accessible teams" ON public.finance_teams
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own teams" ON public.finance_teams
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own teams" ON public.finance_teams
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own teams" ON public.finance_teams
  FOR DELETE USING (user_id = auth.uid());

-- financial_vendors
DROP POLICY IF EXISTS "Users can manage their own vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can view accessible vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can insert own vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can update own vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can delete own vendors" ON public.financial_vendors;
CREATE POLICY "Users can view accessible vendors" ON public.financial_vendors
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own vendors" ON public.financial_vendors
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own vendors" ON public.financial_vendors
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own vendors" ON public.financial_vendors
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- FINANCIAL DOCUMENTS & PAYMENTS
-- =============================================

-- financial_documents
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can view accessible documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.financial_documents;
CREATE POLICY "Users can view accessible documents" ON public.financial_documents
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own documents" ON public.financial_documents
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own documents" ON public.financial_documents
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own documents" ON public.financial_documents
  FOR DELETE USING (user_id = auth.uid());

-- financial_payments
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can view accessible payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.financial_payments;
CREATE POLICY "Users can view accessible payments" ON public.financial_payments
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own payments" ON public.financial_payments
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own payments" ON public.financial_payments
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own payments" ON public.financial_payments
  FOR DELETE USING (user_id = auth.uid());

-- financial_actuals
DROP POLICY IF EXISTS "Users can manage their own actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can view accessible actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can insert own actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can update own actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can delete own actuals" ON public.financial_actuals;
CREATE POLICY "Users can view accessible actuals" ON public.financial_actuals
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own actuals" ON public.financial_actuals
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own actuals" ON public.financial_actuals
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own actuals" ON public.financial_actuals
  FOR DELETE USING (user_id = auth.uid());

-- financial_forecasts
DROP POLICY IF EXISTS "Users can manage their own forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can view accessible forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can insert own forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can update own forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can delete own forecasts" ON public.financial_forecasts;
CREATE POLICY "Users can view accessible forecasts" ON public.financial_forecasts
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own forecasts" ON public.financial_forecasts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own forecasts" ON public.financial_forecasts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own forecasts" ON public.financial_forecasts
  FOR DELETE USING (user_id = auth.uid());

-- financial_revenues
DROP POLICY IF EXISTS "Users can manage their own revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can view accessible revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can insert own revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can update own revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can delete own revenues" ON public.financial_revenues;
CREATE POLICY "Users can view accessible revenues" ON public.financial_revenues
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own revenues" ON public.financial_revenues
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own revenues" ON public.financial_revenues
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own revenues" ON public.financial_revenues
  FOR DELETE USING (user_id = auth.uid());

-- financial_alert_configs
DROP POLICY IF EXISTS "Users can manage their own alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can view accessible alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can insert own alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can update own alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can delete own alert configs" ON public.financial_alert_configs;
CREATE POLICY "Users can view accessible alert configs" ON public.financial_alert_configs
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own alert configs" ON public.financial_alert_configs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own alert configs" ON public.financial_alert_configs
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own alert configs" ON public.financial_alert_configs
  FOR DELETE USING (user_id = auth.uid());

-- financial_audit_log
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Users can view accessible audit logs" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.financial_audit_log;
CREATE POLICY "Users can view accessible audit logs" ON public.financial_audit_log
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own audit logs" ON public.financial_audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- CONFIG/LIBRARY TABLES
-- =============================================

-- clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view accessible clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
CREATE POLICY "Users can view accessible clients" ON public.clients
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own clients" ON public.clients
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own clients" ON public.clients
  FOR DELETE USING (user_id = auth.uid());

-- vehicles
DROP POLICY IF EXISTS "Users can manage their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view accessible vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;
CREATE POLICY "Users can view accessible vehicles" ON public.vehicles
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own vehicles" ON public.vehicles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own vehicles" ON public.vehicles
  FOR DELETE USING (user_id = auth.uid());

-- channels
DROP POLICY IF EXISTS "Users can manage their own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view accessible channels" ON public.channels;
DROP POLICY IF EXISTS "Users can insert own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can update own channels" ON public.channels;
DROP POLICY IF EXISTS "Users can delete own channels" ON public.channels;
CREATE POLICY "Users can view accessible channels" ON public.channels
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own channels" ON public.channels
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own channels" ON public.channels
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own channels" ON public.channels
  FOR DELETE USING (user_id = auth.uid());

-- mediums
DROP POLICY IF EXISTS "Users can manage their own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can view accessible mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can insert own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can update own mediums" ON public.mediums;
DROP POLICY IF EXISTS "Users can delete own mediums" ON public.mediums;
CREATE POLICY "Users can view accessible mediums" ON public.mediums
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own mediums" ON public.mediums
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own mediums" ON public.mediums
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own mediums" ON public.mediums
  FOR DELETE USING (user_id = auth.uid());

-- moments
DROP POLICY IF EXISTS "Users can manage their own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can view accessible moments" ON public.moments;
DROP POLICY IF EXISTS "Users can insert own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can update own moments" ON public.moments;
DROP POLICY IF EXISTS "Users can delete own moments" ON public.moments;
CREATE POLICY "Users can view accessible moments" ON public.moments
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own moments" ON public.moments
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own moments" ON public.moments
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own moments" ON public.moments
  FOR DELETE USING (user_id = auth.uid());

-- formats
DROP POLICY IF EXISTS "Users can manage their own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can view accessible formats" ON public.formats;
DROP POLICY IF EXISTS "Users can insert own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can update own formats" ON public.formats;
DROP POLICY IF EXISTS "Users can delete own formats" ON public.formats;
CREATE POLICY "Users can view accessible formats" ON public.formats
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own formats" ON public.formats
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own formats" ON public.formats
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own formats" ON public.formats
  FOR DELETE USING (user_id = auth.uid());

-- format_creative_types
DROP POLICY IF EXISTS "Users can manage their own format creative types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can view accessible format creative types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can insert own format creative types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can update own format creative types" ON public.format_creative_types;
DROP POLICY IF EXISTS "Users can delete own format creative types" ON public.format_creative_types;
CREATE POLICY "Users can view accessible format creative types" ON public.format_creative_types
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own format creative types" ON public.format_creative_types
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own format creative types" ON public.format_creative_types
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own format creative types" ON public.format_creative_types
  FOR DELETE USING (user_id = auth.uid());

-- creative_type_specifications
DROP POLICY IF EXISTS "Users can manage their own creative type specs" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can view accessible creative type specs" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can insert own creative type specs" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can update own creative type specs" ON public.creative_type_specifications;
DROP POLICY IF EXISTS "Users can delete own creative type specs" ON public.creative_type_specifications;
CREATE POLICY "Users can view accessible creative type specs" ON public.creative_type_specifications
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own creative type specs" ON public.creative_type_specifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own creative type specs" ON public.creative_type_specifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own creative type specs" ON public.creative_type_specifications
  FOR DELETE USING (user_id = auth.uid());

-- funnel_stages
DROP POLICY IF EXISTS "Users can manage their own funnel stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can view accessible funnel stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can insert own funnel stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can update own funnel stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Users can delete own funnel stages" ON public.funnel_stages;
CREATE POLICY "Users can view accessible funnel stages" ON public.funnel_stages
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own funnel stages" ON public.funnel_stages
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own funnel stages" ON public.funnel_stages
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own funnel stages" ON public.funnel_stages
  FOR DELETE USING (user_id = auth.uid());

-- targets
DROP POLICY IF EXISTS "Users can manage their own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can view accessible targets" ON public.targets;
DROP POLICY IF EXISTS "Users can insert own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can update own targets" ON public.targets;
DROP POLICY IF EXISTS "Users can delete own targets" ON public.targets;
CREATE POLICY "Users can view accessible targets" ON public.targets
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own targets" ON public.targets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own targets" ON public.targets
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own targets" ON public.targets
  FOR DELETE USING (user_id = auth.uid());

-- statuses
DROP POLICY IF EXISTS "Users can manage their own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can view accessible statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can insert own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can update own statuses" ON public.statuses;
DROP POLICY IF EXISTS "Users can delete own statuses" ON public.statuses;
CREATE POLICY "Users can view accessible statuses" ON public.statuses
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own statuses" ON public.statuses
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own statuses" ON public.statuses
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own statuses" ON public.statuses
  FOR DELETE USING (user_id = auth.uid());

-- behavioral_segmentations
DROP POLICY IF EXISTS "Users can manage their own segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can view accessible segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can insert own segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can update own segmentations" ON public.behavioral_segmentations;
DROP POLICY IF EXISTS "Users can delete own segmentations" ON public.behavioral_segmentations;
CREATE POLICY "Users can view accessible segmentations" ON public.behavioral_segmentations
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own segmentations" ON public.behavioral_segmentations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own segmentations" ON public.behavioral_segmentations
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own segmentations" ON public.behavioral_segmentations
  FOR DELETE USING (user_id = auth.uid());

-- custom_kpis
DROP POLICY IF EXISTS "Users can manage their own kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can view accessible kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can insert own kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can update own kpis" ON public.custom_kpis;
DROP POLICY IF EXISTS "Users can delete own kpis" ON public.custom_kpis;
CREATE POLICY "Users can view accessible kpis" ON public.custom_kpis
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own kpis" ON public.custom_kpis
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own kpis" ON public.custom_kpis
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own kpis" ON public.custom_kpis
  FOR DELETE USING (user_id = auth.uid());

-- line_detail_types
DROP POLICY IF EXISTS "Users can manage their own detail types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can view accessible detail types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can insert own detail types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can update own detail types" ON public.line_detail_types;
DROP POLICY IF EXISTS "Users can delete own detail types" ON public.line_detail_types;
CREATE POLICY "Users can view accessible detail types" ON public.line_detail_types
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own detail types" ON public.line_detail_types
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own detail types" ON public.line_detail_types
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own detail types" ON public.line_detail_types
  FOR DELETE USING (user_id = auth.uid());

-- creative_templates
DROP POLICY IF EXISTS "Users can manage their own templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can view accessible templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.creative_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.creative_templates;
CREATE POLICY "Users can view accessible templates" ON public.creative_templates
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own templates" ON public.creative_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own templates" ON public.creative_templates
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own templates" ON public.creative_templates
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- MEDIA PLANS & RELATED TABLES
-- =============================================

-- media_plans
DROP POLICY IF EXISTS "Users can manage their own plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can view accessible plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can update accessible plans" ON public.media_plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON public.media_plans;
CREATE POLICY "Users can view accessible plans" ON public.media_plans
  FOR SELECT USING (
    public.can_access_user_data(user_id)
    OR public.has_plan_role(id, auth.uid(), NULL)
  );
CREATE POLICY "Users can insert own plans" ON public.media_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update accessible plans" ON public.media_plans
  FOR UPDATE USING (
    user_id = auth.uid()
    OR public.has_plan_role(id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  );
CREATE POLICY "Users can delete own plans" ON public.media_plans
  FOR DELETE USING (user_id = auth.uid());

-- media_lines
DROP POLICY IF EXISTS "Users can manage their own lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can view accessible lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can insert own lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can update own lines" ON public.media_lines;
DROP POLICY IF EXISTS "Users can delete own lines" ON public.media_lines;
CREATE POLICY "Users can view accessible lines" ON public.media_lines
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own lines" ON public.media_lines
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own lines" ON public.media_lines
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own lines" ON public.media_lines
  FOR DELETE USING (user_id = auth.uid());

-- media_creatives
DROP POLICY IF EXISTS "Users can manage their own creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can view accessible creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can insert own creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can update own creatives" ON public.media_creatives;
DROP POLICY IF EXISTS "Users can delete own creatives" ON public.media_creatives;
CREATE POLICY "Users can view accessible creatives" ON public.media_creatives
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own creatives" ON public.media_creatives
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own creatives" ON public.media_creatives
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own creatives" ON public.media_creatives
  FOR DELETE USING (user_id = auth.uid());

-- media_line_monthly_budgets
DROP POLICY IF EXISTS "Users can manage their own monthly budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can view accessible monthly budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can insert own monthly budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can update own monthly budgets" ON public.media_line_monthly_budgets;
DROP POLICY IF EXISTS "Users can delete own monthly budgets" ON public.media_line_monthly_budgets;
CREATE POLICY "Users can view accessible monthly budgets" ON public.media_line_monthly_budgets
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own monthly budgets" ON public.media_line_monthly_budgets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own monthly budgets" ON public.media_line_monthly_budgets
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own monthly budgets" ON public.media_line_monthly_budgets
  FOR DELETE USING (user_id = auth.uid());

-- plan_budget_distributions
DROP POLICY IF EXISTS "Users can manage their own distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can view accessible distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can insert own distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can update own distributions" ON public.plan_budget_distributions;
DROP POLICY IF EXISTS "Users can delete own distributions" ON public.plan_budget_distributions;
CREATE POLICY "Users can view accessible distributions" ON public.plan_budget_distributions
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own distributions" ON public.plan_budget_distributions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own distributions" ON public.plan_budget_distributions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own distributions" ON public.plan_budget_distributions
  FOR DELETE USING (user_id = auth.uid());

-- plan_subdivisions
DROP POLICY IF EXISTS "Users can manage their own subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can view accessible subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can insert own subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can update own subdivisions" ON public.plan_subdivisions;
DROP POLICY IF EXISTS "Users can delete own subdivisions" ON public.plan_subdivisions;
CREATE POLICY "Users can view accessible subdivisions" ON public.plan_subdivisions
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own subdivisions" ON public.plan_subdivisions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own subdivisions" ON public.plan_subdivisions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own subdivisions" ON public.plan_subdivisions
  FOR DELETE USING (user_id = auth.uid());

-- line_details
DROP POLICY IF EXISTS "Users can manage their own line details" ON public.line_details;
DROP POLICY IF EXISTS "Users can view accessible line details" ON public.line_details;
DROP POLICY IF EXISTS "Users can insert own line details" ON public.line_details;
DROP POLICY IF EXISTS "Users can update own line details" ON public.line_details;
DROP POLICY IF EXISTS "Users can delete own line details" ON public.line_details;
CREATE POLICY "Users can view accessible line details" ON public.line_details
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own line details" ON public.line_details
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own line details" ON public.line_details
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own line details" ON public.line_details
  FOR DELETE USING (user_id = auth.uid());

-- line_detail_items
DROP POLICY IF EXISTS "Users can manage their own line detail items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can view accessible line detail items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can insert own line detail items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can update own line detail items" ON public.line_detail_items;
DROP POLICY IF EXISTS "Users can delete own line detail items" ON public.line_detail_items;
CREATE POLICY "Users can view accessible line detail items" ON public.line_detail_items
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own line detail items" ON public.line_detail_items
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own line detail items" ON public.line_detail_items
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own line detail items" ON public.line_detail_items
  FOR DELETE USING (user_id = auth.uid());

-- line_detail_insertions
DROP POLICY IF EXISTS "Users can manage their own insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can view accessible insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can insert own insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can update own insertions" ON public.line_detail_insertions;
DROP POLICY IF EXISTS "Users can delete own insertions" ON public.line_detail_insertions;
CREATE POLICY "Users can view accessible insertions" ON public.line_detail_insertions
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own insertions" ON public.line_detail_insertions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own insertions" ON public.line_detail_insertions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own insertions" ON public.line_detail_insertions
  FOR DELETE USING (user_id = auth.uid());

-- media_plan_versions
DROP POLICY IF EXISTS "Users can manage their own versions" ON public.media_plan_versions;
DROP POLICY IF EXISTS "Users can view accessible versions" ON public.media_plan_versions;
DROP POLICY IF EXISTS "Users can insert own versions" ON public.media_plan_versions;
CREATE POLICY "Users can view accessible versions" ON public.media_plan_versions
  FOR SELECT USING (public.can_access_user_data(created_by));
CREATE POLICY "Users can insert own versions" ON public.media_plan_versions
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- creative_change_logs
DROP POLICY IF EXISTS "Users can manage their own change logs" ON public.creative_change_logs;
DROP POLICY IF EXISTS "Users can view accessible change logs" ON public.creative_change_logs;
DROP POLICY IF EXISTS "Users can insert own change logs" ON public.creative_change_logs;
CREATE POLICY "Users can view accessible change logs" ON public.creative_change_logs
  FOR SELECT USING (public.can_access_user_data(user_id));
CREATE POLICY "Users can insert own change logs" ON public.creative_change_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());