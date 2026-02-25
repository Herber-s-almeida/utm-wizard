import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';

export type SourceCategory = 'media' | 'analytics' | 'conversions' | 'social_organic';

export const SOURCE_CATEGORIES: { value: SourceCategory; label: string; description: string; icon: string }[] = [
  { value: 'media', label: 'Mídia Paga', description: 'Google Ads, Meta Ads, etc.', icon: '📢' },
  { value: 'analytics', label: 'Analytics / Site', description: 'Google Analytics, etc.', icon: '📊' },
  { value: 'conversions', label: 'Conversões / CRM', description: 'Leads, vendas, receita', icon: '🎯' },
  { value: 'social_organic', label: 'Redes Sociais (Orgânico)', description: 'Alcance, engajamento, seguidores', icon: '📱' },
];

export const METRIC_FIELDS_BY_CATEGORY: Record<SourceCategory, { value: string; label: string; required?: boolean }[]> = {
  media: [
    { value: 'line_code', label: 'Código da Linha', required: true },
    { value: 'period_date', label: 'Data' },
    { value: 'impressions', label: 'Impressões' },
    { value: 'clicks', label: 'Cliques' },
    { value: 'cost', label: 'Custo / Investimento' },
    { value: 'conversions', label: 'Conversões' },
    { value: 'leads', label: 'Leads' },
    { value: 'sales', label: 'Vendas' },
  ],
  analytics: [
    { value: 'line_code', label: 'Código da Linha', required: true },
    { value: 'period_date', label: 'Data' },
    { value: 'sessions', label: 'Sessões' },
    { value: 'total_users', label: 'Usuários (Total Users)' },
    { value: 'new_users', label: 'Usuários Novos (New Users)' },
    { value: 'engaged_sessions', label: 'Sessões Engajadas' },
    { value: 'pageviews', label: 'Visualizações de Página' },
    { value: 'avg_session_duration', label: 'Duração Média' },
  ],
  conversions: [
    { value: 'line_code', label: 'Código da Linha', required: true },
    { value: 'period_date', label: 'Data' },
    { value: 'leads', label: 'Leads' },
    { value: 'sales', label: 'Vendas' },
    { value: 'conversions', label: 'Conversões' },
    { value: 'cost', label: 'Custo / Investimento' },
  ],
  social_organic: [
    { value: 'line_code', label: 'Código da Linha', required: true },
    { value: 'period_date', label: 'Data' },
    { value: 'impressions', label: 'Alcance / Impressões' },
    { value: 'clicks', label: 'Engajamento / Cliques' },
    { value: 'sessions', label: 'Visitas ao Perfil' },
    { value: 'total_users', label: 'Seguidores' },
    { value: 'pageviews', label: 'Visualizações' },
  ],
};

// Flat list for backwards compatibility
export const METRIC_FIELDS = [
  { value: 'line_code', label: 'Código da Linha', required: true },
  { value: 'period_date', label: 'Data' },
  { value: 'impressions', label: 'Impressões', group: 'Mídia' },
  { value: 'clicks', label: 'Cliques', group: 'Mídia' },
  { value: 'cost', label: 'Custo / Investimento', group: 'Mídia' },
  { value: 'leads', label: 'Leads', group: 'Conversão' },
  { value: 'sales', label: 'Vendas', group: 'Conversão' },
  { value: 'conversions', label: 'Conversões', group: 'Conversão' },
  { value: 'sessions', label: 'Sessões', group: 'Analytics' },
  { value: 'total_users', label: 'Usuários (Total Users)', group: 'Analytics' },
  { value: 'new_users', label: 'Usuários Novos (New Users)', group: 'Analytics' },
  { value: 'engaged_sessions', label: 'Sessões Engajadas', group: 'Analytics' },
  { value: 'avg_session_duration', label: 'Duração Média', group: 'Analytics' },
  { value: 'pageviews', label: 'Visualizações de Página', group: 'Analytics' },
];

export interface ReportImport {
  id: string;
  media_plan_id: string;
  user_id: string;
  environment_id?: string;
  source_url: string;
  source_name: string;
  source_category: SourceCategory;
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
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  sales: number;
  conversions: number;
  cpa: number;
  roas: number;
  sessions: number;
  bounce_rate: number;
  avg_session_duration: number;
  pageviews: number;
  total_users: number;
  new_users: number;
  engaged_sessions: number;
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
      // Fetch all rows using pagination to bypass the 1000-row default limit
      let allData: ReportData[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('report_data')
          .select('*')
          .eq('media_plan_id', planId)
          .order('line_code', { ascending: true })
          .range(from, from + pageSize - 1);

        if (importId) {
          query = query.eq('import_id', importId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = allData.concat(data as ReportData[]);
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allData;
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
      source_category: SourceCategory;
    }) => {
      const { data: result, error } = await supabase
        .from('report_imports')
        .insert({
          media_plan_id: data.media_plan_id,
          source_url: data.source_url,
          source_name: data.source_name,
          source_category: data.source_category,
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
      await supabase
        .from('report_column_mappings')
        .delete()
        .eq('import_id', data.import_id);

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
      toast.success(`Importação concluída: ${result.matched} linhas com match, ${result.unmatched} sem match`);
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
      source_category?: SourceCategory;
    }) => {
      const updateData: any = {
        source_url: data.source_url,
        source_name: data.source_name,
      };
      if (data.source_category) {
        updateData.source_category = data.source_category;
      }
      
      const { data: result, error } = await supabase
        .from('report_imports')
        .update(updateData)
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
