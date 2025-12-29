import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

export interface SoftDeleteItem {
  id: string;
  name: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

type SoftDeleteTableName = 
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
  | 'creative_templates';

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
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(`${itemLabel} excluído(a) permanentemente!`);
    },
    onError: () => {
      toast.error(`Erro ao excluir ${itemLabel.toLowerCase()}. Pode estar em uso.`);
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
