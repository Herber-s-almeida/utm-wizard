-- =====================================================
-- Migration: Update RLS policies for financial tables
-- Use environment_id instead of user_id for access control
-- =====================================================

-- Drop old user-based policies and create environment-based ones

-- ==================== financial_forecasts ====================
DROP POLICY IF EXISTS "Users can view accessible forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can insert own forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can update own forecasts" ON public.financial_forecasts;
DROP POLICY IF EXISTS "Users can delete own forecasts" ON public.financial_forecasts;

CREATE POLICY "Environment read access for financial_forecasts"
  ON public.financial_forecasts FOR SELECT
  USING (has_environment_section_access(environment_id, 'finance', 'view'));

CREATE POLICY "Environment insert access for financial_forecasts"
  ON public.financial_forecasts FOR INSERT
  WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment update access for financial_forecasts"
  ON public.financial_forecasts FOR UPDATE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for financial_forecasts"
  ON public.financial_forecasts FOR DELETE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

-- ==================== financial_actuals ====================
DROP POLICY IF EXISTS "Users can view accessible actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can insert own actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can update own actuals" ON public.financial_actuals;
DROP POLICY IF EXISTS "Users can delete own actuals" ON public.financial_actuals;

CREATE POLICY "Environment read access for financial_actuals"
  ON public.financial_actuals FOR SELECT
  USING (has_environment_section_access(environment_id, 'finance', 'view'));

CREATE POLICY "Environment insert access for financial_actuals"
  ON public.financial_actuals FOR INSERT
  WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment update access for financial_actuals"
  ON public.financial_actuals FOR UPDATE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for financial_actuals"
  ON public.financial_actuals FOR DELETE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

-- ==================== financial_documents ====================
DROP POLICY IF EXISTS "Users can view accessible documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can view their own financial documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.financial_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.financial_documents;

CREATE POLICY "Environment read access for financial_documents"
  ON public.financial_documents FOR SELECT
  USING (has_environment_section_access(environment_id, 'finance', 'view'));

CREATE POLICY "Environment insert access for financial_documents"
  ON public.financial_documents FOR INSERT
  WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment update access for financial_documents"
  ON public.financial_documents FOR UPDATE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for financial_documents"
  ON public.financial_documents FOR DELETE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

-- ==================== financial_payments ====================
DROP POLICY IF EXISTS "Users can view accessible payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.financial_payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.financial_payments;

CREATE POLICY "Environment read access for financial_payments"
  ON public.financial_payments FOR SELECT
  USING (has_environment_section_access(environment_id, 'finance', 'view'));

CREATE POLICY "Environment insert access for financial_payments"
  ON public.financial_payments FOR INSERT
  WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment update access for financial_payments"
  ON public.financial_payments FOR UPDATE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for financial_payments"
  ON public.financial_payments FOR DELETE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

-- ==================== financial_revenues ====================
DROP POLICY IF EXISTS "Users can view accessible revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can insert own revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can update own revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can delete own revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can manage own revenues" ON public.financial_revenues;
DROP POLICY IF EXISTS "Users can modify revenues" ON public.financial_revenues;

CREATE POLICY "Environment read access for financial_revenues"
  ON public.financial_revenues FOR SELECT
  USING (has_environment_section_access(environment_id, 'finance', 'view'));

CREATE POLICY "Environment insert access for financial_revenues"
  ON public.financial_revenues FOR INSERT
  WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment update access for financial_revenues"
  ON public.financial_revenues FOR UPDATE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for financial_revenues"
  ON public.financial_revenues FOR DELETE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

-- ==================== financial_vendors ====================
DROP POLICY IF EXISTS "Users can view accessible vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can insert own vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can update own vendors" ON public.financial_vendors;
DROP POLICY IF EXISTS "Users can delete own vendors" ON public.financial_vendors;

-- Enable RLS if not already enabled
ALTER TABLE public.financial_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Environment read access for financial_vendors"
  ON public.financial_vendors FOR SELECT
  USING (has_environment_section_access(environment_id, 'finance', 'view'));

CREATE POLICY "Environment insert access for financial_vendors"
  ON public.financial_vendors FOR INSERT
  WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment update access for financial_vendors"
  ON public.financial_vendors FOR UPDATE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for financial_vendors"
  ON public.financial_vendors FOR DELETE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

-- ==================== financial_alert_configs ====================
DROP POLICY IF EXISTS "Users can view accessible alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can view own alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can insert own alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can update own alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can delete own alert configs" ON public.financial_alert_configs;
DROP POLICY IF EXISTS "Users can manage own alert configs" ON public.financial_alert_configs;

CREATE POLICY "Environment read access for financial_alert_configs"
  ON public.financial_alert_configs FOR SELECT
  USING (has_environment_section_access(environment_id, 'finance', 'view'));

CREATE POLICY "Environment insert access for financial_alert_configs"
  ON public.financial_alert_configs FOR INSERT
  WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment update access for financial_alert_configs"
  ON public.financial_alert_configs FOR UPDATE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

CREATE POLICY "Environment delete access for financial_alert_configs"
  ON public.financial_alert_configs FOR DELETE
  USING (has_environment_section_access(environment_id, 'finance', 'edit'));

-- ==================== financial_audit_log ====================
-- Keep existing policies but add environment-based view for all members
DROP POLICY IF EXISTS "Users can view accessible audit logs" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Users can view audit logs" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Users can create audit logs" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.financial_audit_log;