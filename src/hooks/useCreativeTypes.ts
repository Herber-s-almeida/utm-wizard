import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreativeType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Hook for global Creative Types (shared library)
export function useCreativeTypes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['creative_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_types')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as CreativeType[];
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('creative_types')
        .insert({ name: name.trim() })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Este tipo de criativo já existe');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative_types'] });
      toast.success('Tipo de criativo criado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar tipo de criativo');
    },
  });

  return { ...query, create };
}
