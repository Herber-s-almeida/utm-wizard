-- Create has_finance_role function
CREATE OR REPLACE FUNCTION public.has_finance_role(
  check_user_id uuid,
  required_roles text[] DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.financial_roles
    WHERE user_id = check_user_id
    AND (required_roles IS NULL OR role = ANY(required_roles))
  );
END;
$$;

-- RLS Policies for financial_forecasts
DROP POLICY IF EXISTS "Users can view forecasts for accessible plans" ON public.financial_forecasts;
CREATE POLICY "Users can view forecasts for accessible plans" ON public.financial_forecasts
FOR SELECT USING (
  public.has_plan_role(media_plan_id, auth.uid(), NULL::app_role[])
  OR public.is_system_admin(auth.uid())
  OR public.has_finance_role(auth.uid(), NULL)
);

DROP POLICY IF EXISTS "Users can modify forecasts for owned/editable plans" ON public.financial_forecasts;
CREATE POLICY "Users can modify forecasts for owned/editable plans" ON public.financial_forecasts
FOR ALL USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  OR public.has_finance_role(auth.uid(), ARRAY['finance_admin', 'finance_editor'])
  OR public.is_system_admin(auth.uid())
);

-- RLS Policies for financial_actuals
DROP POLICY IF EXISTS "Users can view actuals for accessible plans" ON public.financial_actuals;
CREATE POLICY "Users can view actuals for accessible plans" ON public.financial_actuals
FOR SELECT USING (
  public.has_plan_role(media_plan_id, auth.uid(), NULL::app_role[])
  OR public.is_system_admin(auth.uid())
  OR public.has_finance_role(auth.uid(), NULL)
);

DROP POLICY IF EXISTS "Users can modify actuals for owned/editable plans" ON public.financial_actuals;
CREATE POLICY "Users can modify actuals for owned/editable plans" ON public.financial_actuals
FOR ALL USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  OR public.has_finance_role(auth.uid(), ARRAY['finance_admin', 'finance_editor'])
  OR public.is_system_admin(auth.uid())
);

-- RLS Policies for financial_documents
DROP POLICY IF EXISTS "Users can view documents for accessible plans" ON public.financial_documents;
CREATE POLICY "Users can view documents for accessible plans" ON public.financial_documents
FOR SELECT USING (
  public.has_plan_role(media_plan_id, auth.uid(), NULL::app_role[])
  OR public.is_system_admin(auth.uid())
  OR public.has_finance_role(auth.uid(), NULL)
);

DROP POLICY IF EXISTS "Users can modify documents for owned/editable plans" ON public.financial_documents;
CREATE POLICY "Users can modify documents for owned/editable plans" ON public.financial_documents
FOR ALL USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
  OR public.has_finance_role(auth.uid(), ARRAY['finance_admin', 'finance_editor'])
  OR public.is_system_admin(auth.uid())
);

-- RLS Policies for financial_payments
DROP POLICY IF EXISTS "Users can view payments for accessible documents" ON public.financial_payments;
CREATE POLICY "Users can view payments for accessible documents" ON public.financial_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.financial_documents fd
    WHERE fd.id = financial_document_id
    AND (
      public.has_plan_role(fd.media_plan_id, auth.uid(), NULL::app_role[])
      OR public.is_system_admin(auth.uid())
      OR public.has_finance_role(auth.uid(), NULL)
    )
  )
);

DROP POLICY IF EXISTS "Users can modify payments for accessible documents" ON public.financial_payments;
CREATE POLICY "Users can modify payments for accessible documents" ON public.financial_payments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.financial_documents fd
    WHERE fd.id = financial_document_id
    AND (
      public.has_plan_role(fd.media_plan_id, auth.uid(), ARRAY['owner'::app_role, 'editor'::app_role])
      OR public.has_finance_role(auth.uid(), ARRAY['finance_admin', 'finance_editor'])
      OR public.is_system_admin(auth.uid())
    )
  )
);

-- RLS Policies for financial_vendors
DROP POLICY IF EXISTS "Users can view vendors" ON public.financial_vendors;
CREATE POLICY "Users can view vendors" ON public.financial_vendors
FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
  OR public.has_finance_role(auth.uid(), NULL)
);

DROP POLICY IF EXISTS "Users can manage own vendors" ON public.financial_vendors;
CREATE POLICY "Users can manage own vendors" ON public.financial_vendors
FOR ALL USING (
  user_id = auth.uid()
  OR public.has_finance_role(auth.uid(), ARRAY['finance_admin'])
  OR public.is_system_admin(auth.uid())
);

-- RLS Policies for financial_revenues
DROP POLICY IF EXISTS "Users can view revenues for accessible plans" ON public.financial_revenues;
CREATE POLICY "Users can view revenues for accessible plans" ON public.financial_revenues
FOR SELECT USING (
  (media_plan_id IS NULL AND user_id = auth.uid())
  OR public.has_plan_role(media_plan_id, auth.uid(), NULL::app_role[])
  OR public.is_system_admin(auth.uid())
  OR public.has_finance_role(auth.uid(), NULL)
);

DROP POLICY IF EXISTS "Users can modify revenues" ON public.financial_revenues;
CREATE POLICY "Users can modify revenues" ON public.financial_revenues
FOR ALL USING (
  user_id = auth.uid()
  OR public.has_finance_role(auth.uid(), ARRAY['finance_admin', 'finance_editor'])
  OR public.is_system_admin(auth.uid())
);

-- RLS Policies for financial_audit_log
DROP POLICY IF EXISTS "Users can view audit logs" ON public.financial_audit_log;
CREATE POLICY "Users can view audit logs" ON public.financial_audit_log
FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
  OR public.has_finance_role(auth.uid(), ARRAY['finance_admin'])
);

DROP POLICY IF EXISTS "Users can create audit logs" ON public.financial_audit_log;
CREATE POLICY "Users can create audit logs" ON public.financial_audit_log
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for financial_alert_configs
DROP POLICY IF EXISTS "Users can view own alert configs" ON public.financial_alert_configs;
CREATE POLICY "Users can view own alert configs" ON public.financial_alert_configs
FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can manage own alert configs" ON public.financial_alert_configs;
CREATE POLICY "Users can manage own alert configs" ON public.financial_alert_configs
FOR ALL USING (
  user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
);

-- RLS Policies for financial_roles
DROP POLICY IF EXISTS "Users can view finance roles" ON public.financial_roles;
CREATE POLICY "Users can view finance roles" ON public.financial_roles
FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_system_admin(auth.uid())
  OR public.has_finance_role(auth.uid(), ARRAY['finance_admin'])
);

DROP POLICY IF EXISTS "Only admins can manage finance roles" ON public.financial_roles;
CREATE POLICY "Only admins can manage finance roles" ON public.financial_roles
FOR ALL USING (
  public.is_system_admin(auth.uid())
  OR public.has_finance_role(auth.uid(), ARRAY['finance_admin'])
);