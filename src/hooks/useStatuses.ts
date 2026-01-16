import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffectiveUserId } from './useEffectiveUserId';
import { toast } from 'sonner';
import { useSoftDeleteMutations, filterSoftDeleteItems } from './useSoftDelete';

export interface Status {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

// System statuses that cannot be deleted or edited
const SYSTEM_STATUSES = ['Ativo', 'Finalizado', 'Pendente'];

export function useStatuses() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('statuses', 'statuses', 'Status');

  const query = useQuery({
    queryKey: ['statuses', effectiveUserId],
    queryFn: async () => {
      // Fetch user's own statuses AND system statuses (global)
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .or(`user_id.eq.${effectiveUserId},is_system.eq.true`)
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Status[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('statuses')
        .insert({ 
          name, 
          description: description || null, 
          is_system: false,
          user_id: effectiveUserId! 
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      toast.success('Status criado!');
    },
    onError: (error: any) => {
      if (error.message?.includes('name_max_length')) {
        toast.error('O nome do status deve ter no máximo 25 caracteres');
      } else {
        toast.error('Erro ao criar status');
      }
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from('statuses')
        .update({ name, description: description || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      if (error.message?.includes('name_max_length')) {
        toast.error('O nome do status deve ter no máximo 25 caracteres');
      } else {
        toast.error('Erro ao atualizar status');
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
    isSystemStatus: (status: Status) => status.is_system,
  };
}
