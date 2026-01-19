-- Adicionar environment_id às tabelas que precisam
ALTER TABLE public.report_imports ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES environments(id);
ALTER TABLE public.report_periods ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES environments(id);
ALTER TABLE public.performance_alerts ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES environments(id);
ALTER TABLE public.status_transitions ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES environments(id);
ALTER TABLE public.financial_audit_log ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES environments(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_report_imports_environment_id ON public.report_imports(environment_id);
CREATE INDEX IF NOT EXISTS idx_report_periods_environment_id ON public.report_periods(environment_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_environment_id ON public.performance_alerts(environment_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_environment_id ON public.status_transitions(environment_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_environment_id ON public.financial_audit_log(environment_id);