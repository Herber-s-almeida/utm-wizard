import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';

// Types
export interface DataSource {
  id: string;
  user_id: string;
  environment_id?: string;
  name: string;
  source_type: 'google_sheets' | 'csv_upload' | 'google_ads_api' | 'meta_api' | 'manual';
  config: Record<string, any>;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportPeriod {
  id: string;
  media_plan_id: string;
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  user_id: string;
  created_at: string;
}

export interface ReportMetric {
  id: string;
  report_period_id: string;
  media_line_id: string | null;
  data_source_id: string | null;
  user_id: string;
  // Media metrics
  impressions: number;
  clicks: number;
  cost: number;
  reach: number;
  frequency: number;
  video_views: number;
  video_completions: number;
  // Conversion metrics
  leads: number;
  conversions: number;
  sales: number;
  revenue: number;
  // Analytics metrics
  sessions: number;
  pageviews: number;
  bounce_rate: number;
  avg_session_duration: number;
  // Matching
  line_code: string | null;
  campaign_name: string | null;
  raw_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceAlert {
  id: string;
  media_plan_id: string;
  media_line_id: string | null;
  user_id: string;
  environment_id?: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric_value: number | null;
  threshold_value: number | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface LineTarget {
  id: string;
  media_line_id: string;
  user_id: string;
  metric_name: string;
  target_value: number;
  target_type: 'min' | 'max' | 'exact';
  created_at: string;
  updated_at: string;
}

// Aggregated performance summary
export interface PerformanceSummary {
  totalCost: number;
  plannedBudget: number;
  budgetVariance: number;
  budgetVariancePercent: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalLeads: number;
  totalRevenue: number;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
  avgCPA: number;
  roas: number;
}

// Hook: Fetch data sources
export function useDataSources() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ['data-sources', currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .eq('environment_id', currentEnvironmentId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DataSource[];
    },
    enabled: !!currentEnvironmentId,
  });
}

// Hook: Fetch report periods for a plan
export function useReportPeriods(planId: string) {
  return useQuery({
    queryKey: ['report-periods', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_periods')
        .select('*')
        .eq('media_plan_id', planId)
        .order('period_date', { ascending: true });

      if (error) throw error;
      return data as ReportPeriod[];
    },
    enabled: !!planId,
  });
}

// Hook: Fetch aggregated metrics for a plan
export function usePerformanceMetrics(planId: string) {
  return useQuery({
    queryKey: ['performance-metrics', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_metrics')
        .select(`
          *,
          report_periods!inner(media_plan_id, period_date)
        `)
        .eq('report_periods.media_plan_id', planId);

      if (error) throw error;
      return data as (ReportMetric & { report_periods: ReportPeriod })[];
    },
    enabled: !!planId,
  });
}

// Hook: Fetch performance alerts for a plan
export function usePerformanceAlerts(planId: string) {
  return useQuery({
    queryKey: ['performance-alerts', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .eq('media_plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PerformanceAlert[];
    },
    enabled: !!planId,
  });
}

// Hook: Fetch line targets
export function useLineTargets(lineIds: string[]) {
  return useQuery({
    queryKey: ['line-targets', lineIds],
    queryFn: async () => {
      if (lineIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('line_targets')
        .select('*')
        .in('media_line_id', lineIds);

      if (error) throw error;
      return data as LineTarget[];
    },
    enabled: lineIds.length > 0,
  });
}

// Hook: Create data source
export function useCreateDataSource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();

  return useMutation({
    mutationFn: async (data: Omit<DataSource, 'id' | 'user_id' | 'environment_id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('data_sources')
        .insert({
          ...data,
          user_id: user!.id,
          environment_id: currentEnvironmentId!,
        })
        .select()
        .single();

      if (error) throw error;
      return result as DataSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-sources'] });
      toast.success('Fonte de dados criada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar fonte: ${error.message}`);
    },
  });
}

// Hook: Import metrics data
export function useImportMetrics() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();

  return useMutation({
    mutationFn: async (data: {
      planId: string;
      metrics: Omit<ReportMetric, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'report_period_id'>[];
      periodDate: string;
      periodType: 'daily' | 'weekly' | 'monthly';
      dataSourceId?: string;
    }) => {
      // Create or get period
      const { data: period, error: periodError } = await supabase
        .from('report_periods')
        .upsert({
          media_plan_id: data.planId,
          period_date: data.periodDate,
          period_type: data.periodType,
          user_id: user!.id,
          environment_id: currentEnvironmentId!,
        }, {
          onConflict: 'media_plan_id,period_date,period_type',
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Insert metrics
      const metricsToInsert = data.metrics.map((m) => ({
        ...m,
        report_period_id: period.id,
        data_source_id: data.dataSourceId,
        user_id: user!.id,
      }));

      const { error: metricsError } = await supabase
        .from('report_metrics')
        .insert(metricsToInsert);

      if (metricsError) throw metricsError;

      return { period, count: metricsToInsert.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-periods', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['performance-metrics', variables.planId] });
      toast.success(`${result.count} métricas importadas`);
    },
    onError: (error: Error) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });
}

// Hook: Create performance alert
export function useCreatePerformanceAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();

  return useMutation({
    mutationFn: async (data: Omit<PerformanceAlert, 'id' | 'user_id' | 'environment_id' | 'created_at' | 'is_resolved' | 'resolved_at'>) => {
      const { data: result, error } = await supabase
        .from('performance_alerts')
        .insert({
          ...data,
          user_id: user!.id,
          environment_id: currentEnvironmentId!,
        })
        .select()
        .single();

      if (error) throw error;
      return result as PerformanceAlert;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['performance-alerts', variables.media_plan_id] });
    },
  });
}

// Hook: Resolve performance alert
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { alertId: string; planId: string }) => {
      const { error } = await supabase
        .from('performance_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', data.alertId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['performance-alerts', variables.planId] });
      toast.success('Alerta resolvido');
    },
  });
}

// Utility: Calculate performance summary from metrics
export function calculatePerformanceSummary(
  metrics: ReportMetric[],
  plannedBudget: number
): PerformanceSummary {
  const totalCost = metrics.reduce((acc, m) => acc + Number(m.cost || 0), 0);
  const totalImpressions = metrics.reduce((acc, m) => acc + Number(m.impressions || 0), 0);
  const totalClicks = metrics.reduce((acc, m) => acc + Number(m.clicks || 0), 0);
  const totalConversions = metrics.reduce((acc, m) => acc + Number(m.conversions || 0), 0);
  const totalLeads = metrics.reduce((acc, m) => acc + Number(m.leads || 0), 0);
  const totalRevenue = metrics.reduce((acc, m) => acc + Number(m.revenue || 0), 0);

  const budgetVariance = totalCost - plannedBudget;
  const budgetVariancePercent = plannedBudget > 0 ? (budgetVariance / plannedBudget) * 100 : 0;

  const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
  const avgCPM = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
  const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;
  const roas = totalCost > 0 ? totalRevenue / totalCost : 0;

  return {
    totalCost,
    plannedBudget,
    budgetVariance,
    budgetVariancePercent,
    totalImpressions,
    totalClicks,
    totalConversions,
    totalLeads,
    totalRevenue,
    avgCTR,
    avgCPC,
    avgCPM,
    avgCPA,
    roas,
  };
}

// Utility: Group metrics by dimension
export function groupMetricsByDimension<T extends Record<string, any>>(
  metrics: (ReportMetric & { media_line?: T })[],
  dimensionKey: keyof T
): Record<string, ReportMetric[]> {
  const grouped: Record<string, ReportMetric[]> = {};

  metrics.forEach((metric) => {
    const dimensionValue = metric.media_line?.[dimensionKey] as string || 'unknown';
    if (!grouped[dimensionValue]) {
      grouped[dimensionValue] = [];
    }
    grouped[dimensionValue].push(metric);
  });

  return grouped;
}

// Utility: Group metrics by date for timeline
export function groupMetricsByDate(
  metrics: (ReportMetric & { report_periods: ReportPeriod })[]
): Record<string, ReportMetric[]> {
  const grouped: Record<string, ReportMetric[]> = {};

  metrics.forEach((metric) => {
    const date = metric.report_periods.period_date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(metric);
  });

  return grouped;
}
