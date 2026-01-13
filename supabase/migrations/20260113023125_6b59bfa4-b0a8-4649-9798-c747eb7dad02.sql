-- Fontes de dados configuráveis
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_sheets', 'csv_upload', 'google_ads_api', 'meta_api', 'manual')),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Períodos de dados (consolidação por data)
CREATE TABLE public.report_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(media_plan_id, period_date, period_type)
);

-- Dados consolidados por linha e período
CREATE TABLE public.report_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_period_id UUID NOT NULL REFERENCES public.report_periods(id) ON DELETE CASCADE,
  media_line_id UUID REFERENCES public.media_lines(id) ON DELETE SET NULL,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  
  -- Métricas de Mídia
  impressions NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  reach NUMERIC DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  video_views NUMERIC DEFAULT 0,
  video_completions NUMERIC DEFAULT 0,
  
  -- Métricas de Conversão
  leads NUMERIC DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  sales NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  
  -- Métricas de Analytics
  sessions NUMERIC DEFAULT 0,
  pageviews NUMERIC DEFAULT 0,
  bounce_rate NUMERIC DEFAULT 0,
  avg_session_duration NUMERIC DEFAULT 0,
  
  -- Dados para matching
  line_code TEXT,
  campaign_name TEXT,
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Metas por linha de mídia
CREATE TABLE public.line_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_line_id UUID NOT NULL REFERENCES public.media_lines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  target_type TEXT DEFAULT 'min' CHECK (target_type IN ('min', 'max', 'exact')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas de performance
CREATE TABLE public.performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
  media_line_id UUID REFERENCES public.media_lines(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_sources
CREATE POLICY "Users can view their own data sources" ON public.data_sources
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own data sources" ON public.data_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own data sources" ON public.data_sources
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own data sources" ON public.data_sources
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for report_periods
CREATE POLICY "Users can view their own report periods" ON public.report_periods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own report periods" ON public.report_periods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own report periods" ON public.report_periods
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own report periods" ON public.report_periods
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for report_metrics
CREATE POLICY "Users can view their own report metrics" ON public.report_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own report metrics" ON public.report_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own report metrics" ON public.report_metrics
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own report metrics" ON public.report_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for line_targets
CREATE POLICY "Users can view their own line targets" ON public.line_targets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own line targets" ON public.line_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own line targets" ON public.line_targets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own line targets" ON public.line_targets
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for performance_alerts
CREATE POLICY "Users can view their own performance alerts" ON public.performance_alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own performance alerts" ON public.performance_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own performance alerts" ON public.performance_alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own performance alerts" ON public.performance_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_report_periods_plan ON public.report_periods(media_plan_id);
CREATE INDEX idx_report_periods_date ON public.report_periods(period_date);
CREATE INDEX idx_report_metrics_period ON public.report_metrics(report_period_id);
CREATE INDEX idx_report_metrics_line ON public.report_metrics(media_line_id);
CREATE INDEX idx_report_metrics_line_code ON public.report_metrics(line_code);
CREATE INDEX idx_line_targets_line ON public.line_targets(media_line_id);
CREATE INDEX idx_performance_alerts_plan ON public.performance_alerts(media_plan_id);
CREATE INDEX idx_performance_alerts_unresolved ON public.performance_alerts(media_plan_id) WHERE is_resolved = false;