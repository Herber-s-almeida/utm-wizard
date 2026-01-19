-- RLS para tabelas que herdam environment_id via JOIN

-- report_column_mappings: herda de report_imports via import_id
ALTER TABLE public.report_column_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read via import" ON public.report_column_mappings;
DROP POLICY IF EXISTS "Environment insert via import" ON public.report_column_mappings;
DROP POLICY IF EXISTS "Environment update via import" ON public.report_column_mappings;
DROP POLICY IF EXISTS "Environment delete via import" ON public.report_column_mappings;

CREATE POLICY "Environment read via import" ON public.report_column_mappings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM report_imports ri 
    WHERE ri.id = report_column_mappings.import_id 
    AND has_environment_section_access(ri.environment_id, 'reports', 'view')
  )
);

CREATE POLICY "Environment insert via import" ON public.report_column_mappings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM report_imports ri 
    WHERE ri.id = report_column_mappings.import_id 
    AND has_environment_section_access(ri.environment_id, 'reports', 'edit')
  )
);

CREATE POLICY "Environment update via import" ON public.report_column_mappings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM report_imports ri 
    WHERE ri.id = report_column_mappings.import_id 
    AND has_environment_section_access(ri.environment_id, 'reports', 'edit')
  )
);

CREATE POLICY "Environment delete via import" ON public.report_column_mappings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM report_imports ri 
    WHERE ri.id = report_column_mappings.import_id 
    AND has_environment_section_access(ri.environment_id, 'reports', 'admin')
  )
);

-- report_data: herda de report_imports via import_id
ALTER TABLE public.report_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read via import data" ON public.report_data;
DROP POLICY IF EXISTS "Environment insert via import data" ON public.report_data;
DROP POLICY IF EXISTS "Environment update via import data" ON public.report_data;
DROP POLICY IF EXISTS "Environment delete via import data" ON public.report_data;

CREATE POLICY "Environment read via import data" ON public.report_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM report_imports ri 
    WHERE ri.id = report_data.import_id 
    AND has_environment_section_access(ri.environment_id, 'reports', 'view')
  )
);

CREATE POLICY "Environment insert via import data" ON public.report_data FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM report_imports ri 
    WHERE ri.id = report_data.import_id 
    AND has_environment_section_access(ri.environment_id, 'reports', 'edit')
  )
);

CREATE POLICY "Environment update via import data" ON public.report_data FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM report_imports ri 
    WHERE ri.id = report_data.import_id 
    AND has_environment_section_access(ri.environment_id, 'reports', 'edit')
  )
);

CREATE POLICY "Environment delete via import data" ON public.report_data FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM report_imports ri 
    WHERE ri.id = report_data.import_id 
    AND has_environment_section_access(ri.environment_id, 'reports', 'admin')
  )
);

-- report_metrics: herda de report_periods
ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read via period" ON public.report_metrics;
DROP POLICY IF EXISTS "Environment insert via period" ON public.report_metrics;
DROP POLICY IF EXISTS "Environment update via period" ON public.report_metrics;
DROP POLICY IF EXISTS "Environment delete via period" ON public.report_metrics;

CREATE POLICY "Environment read via period" ON public.report_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM report_periods rp 
    WHERE rp.id = report_metrics.report_period_id 
    AND has_environment_section_access(rp.environment_id, 'reports', 'view')
  )
);

CREATE POLICY "Environment insert via period" ON public.report_metrics FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM report_periods rp 
    WHERE rp.id = report_metrics.report_period_id 
    AND has_environment_section_access(rp.environment_id, 'reports', 'edit')
  )
);

CREATE POLICY "Environment update via period" ON public.report_metrics FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM report_periods rp 
    WHERE rp.id = report_metrics.report_period_id 
    AND has_environment_section_access(rp.environment_id, 'reports', 'edit')
  )
);

CREATE POLICY "Environment delete via period" ON public.report_metrics FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM report_periods rp 
    WHERE rp.id = report_metrics.report_period_id 
    AND has_environment_section_access(rp.environment_id, 'reports', 'admin')
  )
);

-- specification_copy_fields: herda de creative_type_specifications
ALTER TABLE public.specification_copy_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read via spec" ON public.specification_copy_fields;
DROP POLICY IF EXISTS "Environment insert via spec" ON public.specification_copy_fields;
DROP POLICY IF EXISTS "Environment update via spec" ON public.specification_copy_fields;
DROP POLICY IF EXISTS "Environment delete via spec" ON public.specification_copy_fields;

CREATE POLICY "Environment read via spec" ON public.specification_copy_fields FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_copy_fields.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'view')
  )
);

CREATE POLICY "Environment insert via spec" ON public.specification_copy_fields FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_copy_fields.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'edit')
  )
);

CREATE POLICY "Environment update via spec" ON public.specification_copy_fields FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_copy_fields.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'edit')
  )
);

CREATE POLICY "Environment delete via spec" ON public.specification_copy_fields FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_copy_fields.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'admin')
  )
);

-- specification_dimensions: herda de creative_type_specifications
ALTER TABLE public.specification_dimensions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read via spec dim" ON public.specification_dimensions;
DROP POLICY IF EXISTS "Environment insert via spec dim" ON public.specification_dimensions;
DROP POLICY IF EXISTS "Environment update via spec dim" ON public.specification_dimensions;
DROP POLICY IF EXISTS "Environment delete via spec dim" ON public.specification_dimensions;

CREATE POLICY "Environment read via spec dim" ON public.specification_dimensions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_dimensions.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'view')
  )
);

CREATE POLICY "Environment insert via spec dim" ON public.specification_dimensions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_dimensions.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'edit')
  )
);

CREATE POLICY "Environment update via spec dim" ON public.specification_dimensions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_dimensions.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'edit')
  )
);

CREATE POLICY "Environment delete via spec dim" ON public.specification_dimensions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_dimensions.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'admin')
  )
);

-- specification_extensions: herda de creative_type_specifications
ALTER TABLE public.specification_extensions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read via spec ext" ON public.specification_extensions;
DROP POLICY IF EXISTS "Environment insert via spec ext" ON public.specification_extensions;
DROP POLICY IF EXISTS "Environment update via spec ext" ON public.specification_extensions;
DROP POLICY IF EXISTS "Environment delete via spec ext" ON public.specification_extensions;

CREATE POLICY "Environment read via spec ext" ON public.specification_extensions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_extensions.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'view')
  )
);

CREATE POLICY "Environment insert via spec ext" ON public.specification_extensions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_extensions.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'edit')
  )
);

CREATE POLICY "Environment update via spec ext" ON public.specification_extensions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_extensions.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'edit')
  )
);

CREATE POLICY "Environment delete via spec ext" ON public.specification_extensions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM creative_type_specifications cts 
    WHERE cts.id = specification_extensions.specification_id 
    AND has_environment_section_access(cts.environment_id, 'library', 'admin')
  )
);

-- RLS para tabelas diretas com environment_id

-- report_imports
ALTER TABLE public.report_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read access for report_imports" ON public.report_imports;
DROP POLICY IF EXISTS "Environment insert access for report_imports" ON public.report_imports;
DROP POLICY IF EXISTS "Environment update access for report_imports" ON public.report_imports;
DROP POLICY IF EXISTS "Environment delete access for report_imports" ON public.report_imports;

CREATE POLICY "Environment read access for report_imports" ON public.report_imports FOR SELECT
USING (has_environment_section_access(environment_id, 'reports', 'view'));

CREATE POLICY "Environment insert access for report_imports" ON public.report_imports FOR INSERT
WITH CHECK (has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment update access for report_imports" ON public.report_imports FOR UPDATE
USING (has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment delete access for report_imports" ON public.report_imports FOR DELETE
USING (has_environment_section_access(environment_id, 'reports', 'admin'));

-- report_periods
ALTER TABLE public.report_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read access for report_periods" ON public.report_periods;
DROP POLICY IF EXISTS "Environment insert access for report_periods" ON public.report_periods;
DROP POLICY IF EXISTS "Environment update access for report_periods" ON public.report_periods;
DROP POLICY IF EXISTS "Environment delete access for report_periods" ON public.report_periods;

CREATE POLICY "Environment read access for report_periods" ON public.report_periods FOR SELECT
USING (has_environment_section_access(environment_id, 'reports', 'view'));

CREATE POLICY "Environment insert access for report_periods" ON public.report_periods FOR INSERT
WITH CHECK (has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment update access for report_periods" ON public.report_periods FOR UPDATE
USING (has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment delete access for report_periods" ON public.report_periods FOR DELETE
USING (has_environment_section_access(environment_id, 'reports', 'admin'));

-- performance_alerts
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read access for performance_alerts" ON public.performance_alerts;
DROP POLICY IF EXISTS "Environment insert access for performance_alerts" ON public.performance_alerts;
DROP POLICY IF EXISTS "Environment update access for performance_alerts" ON public.performance_alerts;
DROP POLICY IF EXISTS "Environment delete access for performance_alerts" ON public.performance_alerts;

CREATE POLICY "Environment read access for performance_alerts" ON public.performance_alerts FOR SELECT
USING (has_environment_section_access(environment_id, 'reports', 'view'));

CREATE POLICY "Environment insert access for performance_alerts" ON public.performance_alerts FOR INSERT
WITH CHECK (has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment update access for performance_alerts" ON public.performance_alerts FOR UPDATE
USING (has_environment_section_access(environment_id, 'reports', 'edit'));

CREATE POLICY "Environment delete access for performance_alerts" ON public.performance_alerts FOR DELETE
USING (has_environment_section_access(environment_id, 'reports', 'admin'));

-- status_transitions
ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read access for status_transitions" ON public.status_transitions;
DROP POLICY IF EXISTS "Environment insert access for status_transitions" ON public.status_transitions;
DROP POLICY IF EXISTS "Environment update access for status_transitions" ON public.status_transitions;
DROP POLICY IF EXISTS "Environment delete access for status_transitions" ON public.status_transitions;

CREATE POLICY "Environment read access for status_transitions" ON public.status_transitions FOR SELECT
USING (has_environment_section_access(environment_id, 'library', 'view'));

CREATE POLICY "Environment insert access for status_transitions" ON public.status_transitions FOR INSERT
WITH CHECK (has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment update access for status_transitions" ON public.status_transitions FOR UPDATE
USING (has_environment_section_access(environment_id, 'library', 'edit'));

CREATE POLICY "Environment delete access for status_transitions" ON public.status_transitions FOR DELETE
USING (has_environment_section_access(environment_id, 'library', 'admin'));

-- financial_audit_log
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Environment read access for financial_audit_log" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Environment insert access for financial_audit_log" ON public.financial_audit_log;

CREATE POLICY "Environment read access for financial_audit_log" ON public.financial_audit_log FOR SELECT
USING (has_environment_section_access(environment_id, 'finance', 'view'));

CREATE POLICY "Environment insert access for financial_audit_log" ON public.financial_audit_log FOR INSERT
WITH CHECK (has_environment_section_access(environment_id, 'finance', 'edit'));