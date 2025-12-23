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

  const update = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('creative_types')
        .update({ name: name.trim() })
        .eq('id', id);
      if (error) {
        if (error.code === '23505') {
          throw new Error('Este tipo de criativo já existe');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative_types'] });
      toast.success('Tipo de criativo atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar tipo de criativo');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('creative_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative_types'] });
      toast.success('Tipo de criativo removido!');
    },
    onError: () => {
      toast.error('Erro ao remover tipo de criativo');
    },
  });

  // Check if creative type is in use (linked to format_creative_types or creative_templates)
  const checkUsage = async (id: string): Promise<{ inUse: boolean; usageCount: number }> => {
    // Check format_creative_types - types linked to formats by name match
    const { data: creativeType } = await supabase
      .from('creative_types')
      .select('name')
      .eq('id', id)
      .single();
    
    if (!creativeType) return { inUse: false, usageCount: 0 };

    // Check in format_creative_types by name (since they store name, not id)
    const { count: fctCount } = await supabase
      .from('format_creative_types')
      .select('*', { count: 'exact', head: true })
      .ilike('name', creativeType.name);

    // Check in creative_templates by creative_type_id
    const { count: ctCount } = await supabase
      .from('creative_templates')
      .select('*', { count: 'exact', head: true })
      .eq('creative_type_id', id);

    const totalCount = (fctCount || 0) + (ctCount || 0);
    return { inUse: totalCount > 0, usageCount: totalCount };
  };

  return { ...query, create, update, remove, checkUsage };
}
