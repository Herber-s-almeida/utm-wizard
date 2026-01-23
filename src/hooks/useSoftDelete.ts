import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { checkItemInUse } from './useItemInUse';

export interface SoftDeleteItem {
  id: string;
  name: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export type SoftDeleteTableName = 
  | 'plan_subdivisions'
  | 'moments'
  | 'funnel_stages'
  | 'mediums'
  | 'vehicles'
  | 'channels'
  | 'targets'
  | 'formats'
  | 'format_creative_types'
  | 'creative_type_specifications'
  | 'specification_copy_fields'
  | 'specification_dimensions'
  | 'statuses'
  | 'behavioral_segmentations'
  | 'creative_templates'
  | 'custom_kpis'
  | 'clients'
  | 'media_objectives';

// Tables that should check for usage before permanent delete
const tablesWithUsageCheck: SoftDeleteTableName[] = [
  'plan_subdivisions',
  'moments',
  'funnel_stages',
  'mediums',
  'vehicles',
  'channels',
  'targets',
  'formats',
  'statuses',
  'creative_templates',
];

export function useSoftDeleteMutations(tableName: SoftDeleteTableName, queryKey: string, itemLabel: string) {
  const queryClient = useQueryClient();

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString(), is_active: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(`${itemLabel} arquivado(a)!`);
    },
    onError: () => {
      toast.error(`Erro ao arquivar ${itemLabel.toLowerCase()}`);
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: null, is_active: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(`${itemLabel} restaurado(a)!`);
    },
    onError: () => {
      toast.error(`Erro ao restaurar ${itemLabel.toLowerCase()}`);
    },
  });

  const permanentDelete = useMutation({
    mutationFn: async (id: string) => {
      // Check if this table should verify usage before delete
      if (tablesWithUsageCheck.includes(tableName)) {
        const usage = await checkItemInUse(tableName as any, id);
        if (usage.inUse) {
          throw new Error(`Este item está em uso por ${usage.count} linha(s) de mídia e não pode ser excluído permanentemente. Mantenha-o arquivado ou remova as referências primeiro.`);
        }
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .select('id');
      
      if (error) {
        // Mensagens específicas por código de erro
        if (error.code === '42501') {
          throw new Error('Sem permissão de administrador para excluir este item.');
        }
        if (error.code === '23503') {
          throw new Error('Este item está em uso por outros registros e não pode ser excluído permanentemente.');
        }
        throw error;
      }
      
      // Check if any rows were actually deleted
      if (!data || data.length === 0) {
        throw new Error('Nenhum registro encontrado ou você não tem permissão para excluir.');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(`${itemLabel} excluído(a) permanentemente!`);
    },
    onError: (error: Error) => {
      console.error('Permanent delete error:', error);
      toast.error(error.message || `Erro ao excluir ${itemLabel.toLowerCase()}. Pode estar em uso.`);
    },
  });

  return { softDelete, restore, permanentDelete };
}

// Helper to filter active and archived items
export function filterSoftDeleteItems<T extends SoftDeleteItem>(items: T[] | undefined) {
  const active = items?.filter(item => !item.deleted_at) || [];
  const archived = items?.filter(item => item.deleted_at) || [];
  return { active, archived };
}
