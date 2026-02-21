import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';

export interface ReportImport {
  id: string;
  media_plan_id: string;
  user_id: string;
  environment_id?: string;
  source_url: string;
  source_name: string;
  last_import_at: string | null;
  import_status: 'pending' | 'processing' | 'success' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportData {
  id: string;
  import_id: string;
  media_plan_id: string;
  media_line_id: string | null;
  line_code: string;
  period_start: string | null;
  period_end: string | null;
  // Media metrics
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  cpc: number;
  cpm: number;
  // Conversion metrics
  leads: number;
  sales: number;
  conversions: number;
  cpa: number;
  roas: number;
  // Analytics metrics
  sessions: number;
  bounce_rate: number;
  avg_session_duration: number;
  pageviews: number;
  // Raw data
  raw_data: Record<string, any>;
  match_status: 'matched' | 'unmatched' | 'manual';
  created_at: string;
}

export interface ColumnMapping {
  id?: string;
  import_id: string;
  user_id: string;
  source_column: string;
  target_field: string;
  date_format?: string | null;
}

export const METRIC_FIELDS = [
  { value: 'line_code', label: 'Código da Linha', required: true },
  { value: 'period_date', label: 'Data (período único)' },
  { value: 'period_start', label: 'Data Início' },
  { value: 'period_end', label: 'Data Fim' },
  // Media
  { value: 'impressions', label: 'Impressões', group: 'Mídia' },
  { value: 'clicks', label: 'Cliques', group: 'Mídia' },
  { value: 'cost', label: 'Custo / Investimento', group: 'Mídia' },
  { value: 'ctr', label: 'CTR', group: 'Mídia' },
  { value: 'cpc', label: 'CPC', group: 'Mídia' },
  { value: 'cpm', label: 'CPM', group: 'Mídia' },
  // Conversions
  { value: 'leads', label: 'Leads', group: 'Conversão' },
  { value: 'sales', label: 'Vendas', group: 'Conversão' },
  { value: 'conversions', label: 'Conversões', group: 'Conversão' },
  { value: 'cpa', label: 'CPA', group: 'Conversão' },
  { value: 'roas', label: 'ROAS', group: 'Conversão' },
  // Analytics
  { value: 'sessions', label: 'Sessões', group: 'Analytics' },
  { value: 'bounce_rate', label: 'Taxa de Rejeição', group: 'Analytics' },
  { value: 'avg_session_duration', label: 'Duração Média', group: 'Analytics' },
  { value: 'pageviews', label: 'Visualizações de Página', group: 'Analytics' },
];

export function useReportImports(planId: string) {
  return useQuery({
    queryKey: ['report-imports', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_imports')
        .select('*')
        .eq('media_plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReportImport[];
    },
    enabled: !!planId,
  });
}

export function useReportData(planId: string, importId?: string) {
  return useQuery({
    queryKey: ['report-data', planId, importId],
    queryFn: async () => {
      let query = supabase
        .from('report_data')
        .select('*')
        .eq('media_plan_id', planId)
        .order('line_code', { ascending: true });

      if (importId) {
        query = query.eq('import_id', importId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReportData[];
    },
    enabled: !!planId,
  });
}

export function useColumnMappings(importId: string) {
  return useQuery({
    queryKey: ['column-mappings', importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_column_mappings')
        .select('*')
        .eq('import_id', importId);

      if (error) throw error;
      return data as ColumnMapping[];
    },
    enabled: !!importId,
  });
}

export function useCreateReportImport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();

  return useMutation({
    mutationFn: async (data: {
      media_plan_id: string;
      source_url: string;
      source_name: string;
    }) => {
      const { data: result, error } = await supabase
        .from('report_imports')
        .insert({
          media_plan_id: data.media_plan_id,
          source_url: data.source_url,
          source_name: data.source_name,
          user_id: user!.id,
          environment_id: currentEnvironmentId!,
          import_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return result as ReportImport;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-imports', variables.media_plan_id] });
    },
  });
}

export function useSaveColumnMappings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      import_id: string;
      mappings: { source_column: string; target_field: string; date_format?: string }[];
    }) => {
      // Delete existing mappings
      await supabase
        .from('report_column_mappings')
        .delete()
        .eq('import_id', data.import_id);

      // Insert new mappings
      const { error } = await supabase
        .from('report_column_mappings')
        .insert(
          data.mappings.map((m) => ({
            import_id: data.import_id,
            user_id: user!.id,
            source_column: m.source_column,
            target_field: m.target_field,
            date_format: m.date_format || null,
          }))
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['column-mappings', variables.import_id] });
    },
  });
}

export function useRunImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      import_id: string;
      media_plan_id: string;
      source_url: string;
      mappings: { source_column: string; target_field: string; date_format?: string }[];
    }) => {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('import-report-data', {
        body: data,
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-imports', variables.media_plan_id] });
      queryClient.invalidateQueries({ queryKey: ['report-data', variables.media_plan_id] });
      toast.success(`Importação concluída: ${result.matched} linhas casadas, ${result.unmatched} não casadas`);
    },
    onError: (error) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });
}

export function useUpdateReportDataMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      report_data_id: string;
      media_line_id: string;
      media_plan_id: string;
    }) => {
      const { error } = await supabase
        .from('report_data')
        .update({
          media_line_id: data.media_line_id,
          match_status: 'manual',
        })
        .eq('id', data.report_data_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-data', variables.media_plan_id] });
      toast.success('Match manual realizado');
    },
  });
}

export function useUpdateReportImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      import_id: string;
      media_plan_id: string;
      source_url: string;
      source_name: string;
    }) => {
      const { data: result, error } = await supabase
        .from('report_imports')
        .update({
          source_url: data.source_url,
          source_name: data.source_name,
        })
        .eq('id', data.import_id)
        .select()
        .single();

      if (error) throw error;
      return result as ReportImport;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-imports', variables.media_plan_id] });
    },
  });
}

export function useDeleteReportImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { import_id: string; media_plan_id: string }) => {
      const { error } = await supabase
        .from('report_imports')
        .delete()
        .eq('id', data.import_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-imports', variables.media_plan_id] });
      queryClient.invalidateQueries({ queryKey: ['report-data', variables.media_plan_id] });
      toast.success('Fonte de dados removida');
    },
  });
}
