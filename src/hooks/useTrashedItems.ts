import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from './useEffectiveUserId';
import { toast } from 'sonner';

// Trashed media lines
export function useTrashedMediaLines() {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['media_lines', 'trashed', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_lines')
        .select(`
          *,
          media_plans!inner(name, user_id)
        `)
        .eq('media_plans.user_id', effectiveUserId!)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('media_lines')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media_lines'] });
      toast.success('Linha restaurada!');
    },
    onError: () => {
      toast.error('Erro ao restaurar linha');
    },
  });

  const permanentDelete = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('media_lines')
        .delete()
        .eq('id', id)
        .select('id');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Linha não encontrada ou você não tem permissão para excluir.');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media_lines'] });
      toast.success('Linha excluída permanentemente!');
    },
    onError: (error: Error) => {
      console.error('Permanent delete line error:', error);
      toast.error(error.message || 'Erro ao excluir linha');
    },
  });

  return { ...query, restore, permanentDelete };
}

// All trashed library items aggregated
export interface TrashedLibraryItem {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  deleted_at: string;
}

export function useTrashedLibraryItems() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ['library_items', 'trashed', effectiveUserId],
    queryFn: async () => {
      const items: TrashedLibraryItem[] = [];

      // Fetch all trashed items in parallel
      const [
        subdivisionsRes,
        momentsRes,
        funnelStagesRes,
        mediumsRes,
        vehiclesRes,
        channelsRes,
        targetsRes,
        segmentationsRes,
        statusesRes,
        formatsRes,
        creativeTypesRes,
        creativeTemplatesRes,
      ] = await Promise.all([
        supabase.from('plan_subdivisions').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('moments').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('funnel_stages').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('mediums').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('vehicles').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('channels').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('targets').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('behavioral_segmentations').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('statuses').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('formats').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('format_creative_types').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
        supabase.from('creative_templates').select('id, name, deleted_at').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null),
      ]);

      // Map results to unified format
      subdivisionsRes.data?.forEach(item => items.push({ ...item, type: 'plan_subdivisions', typeLabel: 'Subdivisão', deleted_at: item.deleted_at! }));
      momentsRes.data?.forEach(item => items.push({ ...item, type: 'moments', typeLabel: 'Momento', deleted_at: item.deleted_at! }));
      funnelStagesRes.data?.forEach(item => items.push({ ...item, type: 'funnel_stages', typeLabel: 'Fase do Funil', deleted_at: item.deleted_at! }));
      mediumsRes.data?.forEach(item => items.push({ ...item, type: 'mediums', typeLabel: 'Meio', deleted_at: item.deleted_at! }));
      vehiclesRes.data?.forEach(item => items.push({ ...item, type: 'vehicles', typeLabel: 'Veículo', deleted_at: item.deleted_at! }));
      channelsRes.data?.forEach(item => items.push({ ...item, type: 'channels', typeLabel: 'Canal', deleted_at: item.deleted_at! }));
      targetsRes.data?.forEach(item => items.push({ ...item, type: 'targets', typeLabel: 'Target', deleted_at: item.deleted_at! }));
      segmentationsRes.data?.forEach(item => items.push({ ...item, type: 'behavioral_segmentations', typeLabel: 'Segmentação', deleted_at: item.deleted_at! }));
      statusesRes.data?.forEach(item => items.push({ ...item, type: 'statuses', typeLabel: 'Status', deleted_at: item.deleted_at! }));
      formatsRes.data?.forEach(item => items.push({ ...item, type: 'formats', typeLabel: 'Formato', deleted_at: item.deleted_at! }));
      creativeTypesRes.data?.forEach(item => items.push({ ...item, type: 'format_creative_types', typeLabel: 'Tipo Criativo', deleted_at: item.deleted_at! }));
      creativeTemplatesRes.data?.forEach(item => items.push({ ...item, type: 'creative_templates', typeLabel: 'Template', deleted_at: item.deleted_at! }));

      // Sort by deleted_at descending
      items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

      return items;
    },
    enabled: !!effectiveUserId,
  });
}
