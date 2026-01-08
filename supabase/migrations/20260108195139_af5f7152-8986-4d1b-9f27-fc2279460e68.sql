-- Financial Roles Table
CREATE TABLE public.financial_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('finance_admin', 'finance_editor', 'finance_viewer', 'finance_approver')),
  granted_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial roles"
  ON public.financial_roles FOR SELECT
  USING ((user_id = auth.uid()) OR is_system_admin(auth.uid()));

CREATE POLICY "System admins can manage financial roles"
  ON public.financial_roles FOR ALL
  USING (is_system_admin(auth.uid()))
  WITH CHECK (is_system_admin(auth.uid()));