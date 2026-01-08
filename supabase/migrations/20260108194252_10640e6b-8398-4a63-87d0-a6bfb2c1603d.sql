-- =====================================================
-- FINANCE MANAGER - Database Schema
-- =====================================================

-- 1. Financial Vendors (Fornecedores)
CREATE TABLE public.financial_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  document text,
  category text,
  payment_terms text,
  is_active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own vendors"
  ON public.financial_vendors FOR ALL
  USING ((user_id = auth.uid()) OR is_system_admin(auth.uid()))
  WITH CHECK ((user_id = auth.uid()) OR is_system_admin(auth.uid()));

-- 2. Financial Forecasts (Previsões)
CREATE TABLE public.financial_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  version integer DEFAULT 1,
  granularity text NOT NULL DEFAULT 'month' CHECK (granularity IN ('day', 'week', 'month')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  planned_amount numeric NOT NULL DEFAULT 0,
  dimensions_json jsonb DEFAULT '{}',
  source text NOT NULL DEFAULT 'derived_from_plan' CHECK (source IN ('derived_from_plan', 'manual_adjustment')),
  is_locked boolean DEFAULT false,
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_financial_forecasts_plan ON public.financial_forecasts(media_plan_id, period_start);

CREATE POLICY "Users can view forecasts of accessible plans"
  ON public.financial_forecasts FOR SELECT
  USING (has_plan_role(media_plan_id, auth.uid(), NULL::app_role[]) OR is_system_admin(auth.uid()));

CREATE POLICY "Users can manage forecasts of editable plans"
  ON public.financial_forecasts FOR ALL
  USING (has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role]) OR is_system_admin(auth.uid()))
  WITH CHECK (has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role]) OR is_system_admin(auth.uid()));

-- 3. Financial Actuals (Executado)
CREATE TABLE public.financial_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  actual_amount numeric NOT NULL DEFAULT 0,
  dimensions_json jsonb DEFAULT '{}',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'api')),
  import_batch_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_actuals ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_financial_actuals_plan ON public.financial_actuals(media_plan_id, period_start);

CREATE POLICY "Users can view actuals of accessible plans"
  ON public.financial_actuals FOR SELECT
  USING (has_plan_role(media_plan_id, auth.uid(), NULL::app_role[]) OR is_system_admin(auth.uid()));

CREATE POLICY "Users can manage actuals of editable plans"
  ON public.financial_actuals FOR ALL
  USING (has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role]) OR is_system_admin(auth.uid()))
  WITH CHECK (has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role]) OR is_system_admin(auth.uid()));

-- 4. Financial Documents (Documentos/Notas)
CREATE TABLE public.financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_plan_id uuid NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.financial_vendors(id),
  vendor_name text,
  document_type text NOT NULL DEFAULT 'invoice' CHECK (document_type IN ('invoice', 'boleto', 'receipt', 'credit_note', 'other')),
  document_number text,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'verified', 'approved', 'scheduled', 'paid', 'cancelled')),
  related_dimensions_json jsonb DEFAULT '{}',
  attachment_urls jsonb DEFAULT '[]',
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_financial_documents_plan ON public.financial_documents(media_plan_id);
CREATE INDEX idx_financial_documents_due ON public.financial_documents(due_date);
CREATE INDEX idx_financial_documents_status ON public.financial_documents(status);

CREATE POLICY "Users can view documents of accessible plans"
  ON public.financial_documents FOR SELECT
  USING (has_plan_role(media_plan_id, auth.uid(), NULL::app_role[]) OR is_system_admin(auth.uid()));

CREATE POLICY "Users can manage documents of editable plans"
  ON public.financial_documents FOR ALL
  USING (has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role]) OR is_system_admin(auth.uid()))
  WITH CHECK (has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role]) OR is_system_admin(auth.uid()));

-- 5. Financial Payments (Pagamentos)
CREATE TABLE public.financial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  financial_document_id uuid NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  installment_number integer DEFAULT 1,
  planned_payment_date date NOT NULL,
  actual_payment_date date,
  planned_amount numeric NOT NULL,
  paid_amount numeric,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paid', 'partial', 'cancelled', 'overdue')),
  payment_method text CHECK (payment_method IN ('pix', 'boleto', 'transfer', 'card', 'other')),
  proof_url text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_financial_payments_doc ON public.financial_payments(financial_document_id);
CREATE INDEX idx_financial_payments_date ON public.financial_payments(planned_payment_date);

CREATE POLICY "Users can view payments of accessible documents"
  ON public.financial_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_documents fd
      WHERE fd.id = financial_payments.financial_document_id
      AND (has_plan_role(fd.media_plan_id, auth.uid(), NULL::app_role[]) OR is_system_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can manage payments of editable documents"
  ON public.financial_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_documents fd
      WHERE fd.id = financial_payments.financial_document_id
      AND (has_plan_role(fd.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role]) OR is_system_admin(auth.uid()))
    )
  );

-- 6. Financial Revenues (Receitas - Evolução)
CREATE TABLE public.financial_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_plan_id uuid REFERENCES public.media_plans(id) ON DELETE SET NULL,
  product_name text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  revenue_amount numeric NOT NULL DEFAULT 0,
  source text DEFAULT 'manual' CHECK (source IN ('crm', 'manual', 'import')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own revenues"
  ON public.financial_revenues FOR ALL
  USING ((user_id = auth.uid()) OR is_system_admin(auth.uid()))
  WITH CHECK ((user_id = auth.uid()) OR is_system_admin(auth.uid()));

-- 7. Financial Audit Log (Log de Auditoria)
CREATE TABLE public.financial_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('forecast', 'actual', 'document', 'payment', 'vendor', 'revenue')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'lock', 'unlock')),
  before_json jsonb,
  after_json jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_financial_audit_entity ON public.financial_audit_log(entity_type, entity_id);
CREATE INDEX idx_financial_audit_user ON public.financial_audit_log(user_id);

CREATE POLICY "Users can view audit logs"
  ON public.financial_audit_log FOR SELECT
  USING ((user_id = auth.uid()) OR is_system_admin(auth.uid()));

CREATE POLICY "Users can create audit logs"
  ON public.financial_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. Financial Alert Configs (Configurações de Alertas)
CREATE TABLE public.financial_alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('overspend', 'underspend', 'overdue', 'variance')),
  threshold_percentage numeric DEFAULT 10,
  threshold_days integer DEFAULT 7,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_alert_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert configs"
  ON public.financial_alert_configs FOR ALL
  USING ((user_id = auth.uid()) OR is_system_admin(auth.uid()))
  WITH CHECK ((user_id = auth.uid()) OR is_system_admin(auth.uid()));

-- 9. Update triggers for updated_at columns
CREATE TRIGGER update_financial_vendors_updated_at
  BEFORE UPDATE ON public.financial_vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_forecasts_updated_at
  BEFORE UPDATE ON public.financial_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_actuals_updated_at
  BEFORE UPDATE ON public.financial_actuals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_documents_updated_at
  BEFORE UPDATE ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_payments_updated_at
  BEFORE UPDATE ON public.financial_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_revenues_updated_at
  BEFORE UPDATE ON public.financial_revenues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_alert_configs_updated_at
  BEFORE UPDATE ON public.financial_alert_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();