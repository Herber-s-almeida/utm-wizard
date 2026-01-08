import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffectiveUserId } from './useEffectiveUserId';
import { toast } from 'sonner';
import { useSoftDeleteMutations, filterSoftDeleteItems } from './useSoftDelete';

export interface Client {
  id: string;
  name: string;
  description?: string | null;
  slug?: string | null;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export function useClients() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('clients', 'clients', 'Cliente');

  const query = useQuery({
    queryKey: ['clients', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({ name, description: description || null, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar cliente: ' + error.message);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from('clients')
        .update({ name, description: description || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar cliente: ' + error.message);
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
    data: query.data,
    activeItems: active,
    archivedItems: archived,
    create,
    update,
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}
