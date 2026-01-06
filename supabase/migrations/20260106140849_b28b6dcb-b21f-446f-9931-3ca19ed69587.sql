-- Create report_imports table
CREATE TABLE public.report_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  last_import_at TIMESTAMP WITH TIME ZONE,
  import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'processing', 'success', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_data table
CREATE TABLE public.report_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.report_imports(id) ON DELETE CASCADE,
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  media_line_id UUID REFERENCES public.media_lines(id) ON DELETE SET NULL,
  line_code TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  -- Media metrics
  impressions NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  -- Conversion metrics
  leads NUMERIC DEFAULT 0,
  sales NUMERIC DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  -- Analytics metrics
  sessions NUMERIC DEFAULT 0,
  bounce_rate NUMERIC DEFAULT 0,
  avg_session_duration NUMERIC DEFAULT 0,
  pageviews NUMERIC DEFAULT 0,
  -- Raw data
  raw_data JSONB,
  match_status TEXT DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'unmatched', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_column_mappings table
CREATE TABLE public.report_column_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.report_imports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_column TEXT NOT NULL,
  target_field TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_column_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_imports
CREATE POLICY "Users can view report imports for their plans"
ON public.report_imports FOR SELECT
USING (
  public.has_plan_role(media_plan_id, auth.uid(), NULL)
  OR public.is_system_admin(auth.uid())
);

CREATE POLICY "Users with editor+ can create report imports"
ON public.report_imports FOR INSERT
WITH CHECK (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner', 'editor']::app_role[])
  OR public.is_system_admin(auth.uid())
);

CREATE POLICY "Users with editor+ can update report imports"
ON public.report_imports FOR UPDATE
USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner', 'editor']::app_role[])
  OR public.is_system_admin(auth.uid())
);

CREATE POLICY "Users with editor+ can delete report imports"
ON public.report_imports FOR DELETE
USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner', 'editor']::app_role[])
  OR public.is_system_admin(auth.uid())
);

-- RLS policies for report_data
CREATE POLICY "Users can view report data for their plans"
ON public.report_data FOR SELECT
USING (
  public.has_plan_role(media_plan_id, auth.uid(), NULL)
  OR public.is_system_admin(auth.uid())
);

CREATE POLICY "Users with editor+ can create report data"
ON public.report_data FOR INSERT
WITH CHECK (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner', 'editor']::app_role[])
  OR public.is_system_admin(auth.uid())
);

CREATE POLICY "Users with editor+ can update report data"
ON public.report_data FOR UPDATE
USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner', 'editor']::app_role[])
  OR public.is_system_admin(auth.uid())
);

CREATE POLICY "Users with editor+ can delete report data"
ON public.report_data FOR DELETE
USING (
  public.has_plan_role(media_plan_id, auth.uid(), ARRAY['owner', 'editor']::app_role[])
  OR public.is_system_admin(auth.uid())
);

-- RLS policies for report_column_mappings
CREATE POLICY "Users can view mappings for their imports"
ON public.report_column_mappings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.report_imports ri
    WHERE ri.id = import_id
    AND (public.has_plan_role(ri.media_plan_id, auth.uid(), NULL) OR public.is_system_admin(auth.uid()))
  )
);

CREATE POLICY "Users with editor+ can manage mappings"
ON public.report_column_mappings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.report_imports ri
    WHERE ri.id = import_id
    AND (public.has_plan_role(ri.media_plan_id, auth.uid(), ARRAY['owner', 'editor']::app_role[]) OR public.is_system_admin(auth.uid()))
  )
);

-- Indexes for performance
CREATE INDEX idx_report_imports_plan ON public.report_imports(media_plan_id);
CREATE INDEX idx_report_data_import ON public.report_data(import_id);
CREATE INDEX idx_report_data_plan ON public.report_data(media_plan_id);
CREATE INDEX idx_report_data_line_code ON public.report_data(line_code);
CREATE INDEX idx_report_data_line ON public.report_data(media_line_id);

-- Trigger for updated_at
CREATE TRIGGER update_report_imports_updated_at
BEFORE UPDATE ON public.report_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();