import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Status {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// System statuses that cannot be deleted or edited
const SYSTEM_STATUSES = ['Ativo', 'Finalizado', 'Pendente'];

export function useStatuses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['statuses', user?.id],
    queryFn: async () => {
      // Fetch user's own statuses AND system statuses (global)
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .or(`user_id.eq.${user!.id},is_system.eq.true`)
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Status[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('statuses')
        .insert({ 
          name, 
          description: description || null, 
          is_system: false,
          user_id: user!.id 
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
      const { error } = await supabase.from('statuses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      toast.success('Status removido!');
    },
    onError: () => {
      toast.error('Erro ao remover status. O status pode estar em uso.');
    },
  });

  return { 
    ...query, 
    create, 
    update, 
    remove,
    isSystemStatus: (status: Status) => status.is_system,
  };
}
