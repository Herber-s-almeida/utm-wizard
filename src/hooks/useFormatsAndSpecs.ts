import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Types
export interface CreativeType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FormatSpecification {
  id: string;
  format_id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FormatWithSpecs {
  id: string;
  name: string;
  creative_type_id: string | null;
  creative_type?: CreativeType | null;
  specifications: FormatSpecification[];
  user_id: string;
}

// Hook for Creative Types (shared across all users)
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

// Hook for Format Specifications
export function useFormatSpecifications(formatId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['format_specifications', formatId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('format_specifications')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (formatId) {
        queryBuilder = queryBuilder.eq('format_id', formatId);
      }
      
      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as FormatSpecification[];
    },
    enabled: !!user && !!formatId,
  });

  const create = useMutation({
    mutationFn: async ({ formatId, name, description }: { formatId: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('format_specifications')
        .insert({
          format_id: formatId,
          name: name.trim(),
          description: description?.trim() || null,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['format_specifications'] });
      toast.success('Especificação criada!');
    },
    onError: () => {
      toast.error('Erro ao criar especificação');
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from('format_specifications')
        .update({
          name: name.trim(),
          description: description?.trim() || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['format_specifications'] });
      toast.success('Especificação atualizada!');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('format_specifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['format_specifications'] });
      toast.success('Especificação removida!');
    },
  });

  return { ...query, create, update, remove };
}

// Hook for Formats with their specifications (for listing in sidebar)
export function useFormatsWithSpecs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['formats_with_specs', user?.id],
    queryFn: async () => {
      // Get all formats (creative_templates)
      const { data: formats, error: formatsError } = await supabase
        .from('creative_templates')
        .select('id, name, creative_type_id, user_id')
        .order('created_at', { ascending: true });
      
      if (formatsError) throw formatsError;

      // Get all specifications for user's formats
      const formatIds = formats?.map(f => f.id) || [];
      let specifications: FormatSpecification[] = [];
      
      if (formatIds.length > 0) {
        const { data: specs, error: specsError } = await supabase
          .from('format_specifications')
          .select('*')
          .in('format_id', formatIds);
        
        if (specsError) throw specsError;
        specifications = specs || [];
      }

      // Get all creative types
      const { data: creativeTypes, error: typesError } = await supabase
        .from('creative_types')
        .select('*');
      
      if (typesError) throw typesError;

      // Combine data
      return formats?.map(format => ({
        ...format,
        creative_type: creativeTypes?.find(t => t.id === format.creative_type_id) || null,
        specifications: specifications.filter(s => s.format_id === format.id),
      })) as FormatWithSpecs[];
    },
    enabled: !!user,
  });

  const createFormat = useMutation({
    mutationFn: async ({ name, creativeTypeId }: { name: string; creativeTypeId?: string }) => {
      const { data, error } = await supabase
        .from('creative_templates')
        .insert({
          name: name.trim(),
          format: 'custom', // Legacy field, keeping for compatibility
          creative_type_id: creativeTypeId || null,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats_with_specs'] });
      queryClient.invalidateQueries({ queryKey: ['creative_templates'] });
      toast.success('Formato criado!');
    },
  });

  const updateFormat = useMutation({
    mutationFn: async ({ id, name, creativeTypeId }: { id: string; name: string; creativeTypeId?: string }) => {
      const { error } = await supabase
        .from('creative_templates')
        .update({
          name: name.trim(),
          creative_type_id: creativeTypeId || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats_with_specs'] });
      queryClient.invalidateQueries({ queryKey: ['creative_templates'] });
      toast.success('Formato atualizado!');
    },
  });

  const removeFormat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('creative_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats_with_specs'] });
      queryClient.invalidateQueries({ queryKey: ['creative_templates'] });
      toast.success('Formato removido!');
    },
  });

  return { ...query, createFormat, updateFormat, removeFormat };
}
