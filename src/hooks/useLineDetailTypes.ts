import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface FieldSchemaItem {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'select';
  required?: boolean;
  width?: number;
  options?: string[];
  computed?: string;
}

export interface MetadataSchemaItem {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
}

export interface LineDetailType {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  icon: string | null;
  field_schema: FieldSchemaItem[];
  metadata_schema: MetadataSchemaItem[];
  has_insertion_grid: boolean;
  insertion_grid_type: string;
  is_system: boolean;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to safely parse JSONB arrays
function parseFieldSchema(data: Json | null): FieldSchemaItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as FieldSchemaItem[];
}

function parseMetadataSchema(data: Json | null): MetadataSchemaItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as MetadataSchemaItem[];
}

export function useLineDetailTypes() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['line-detail-types', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('line_detail_types')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Parse JSONB fields
      return (data || []).map(item => ({
        ...item,
        field_schema: parseFieldSchema(item.field_schema as Json),
        metadata_schema: parseMetadataSchema(item.metadata_schema as Json),
      })) as LineDetailType[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<LineDetailType, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
      if (!effectiveUserId) throw new Error('User not authenticated');
      
      const { data: result, error } = await supabase
        .from('line_detail_types')
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description,
          icon: data.icon,
          field_schema: data.field_schema as unknown as Json,
          metadata_schema: data.metadata_schema as unknown as Json,
          has_insertion_grid: data.has_insertion_grid,
          insertion_grid_type: data.insertion_grid_type,
          is_system: data.is_system,
          is_active: data.is_active,
          user_id: effectiveUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-detail-types'] });
      toast.success('Tipo de detalhamento criado');
    },
    onError: (error) => {
      console.error('Error creating detail type:', error);
      toast.error('Erro ao criar tipo de detalhamento');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<LineDetailType> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...data };
      if (data.field_schema) {
        updateData.field_schema = data.field_schema as unknown as Json;
      }
      if (data.metadata_schema) {
        updateData.metadata_schema = data.metadata_schema as unknown as Json;
      }
      
      const { data: result, error } = await supabase
        .from('line_detail_types')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-detail-types'] });
      toast.success('Tipo de detalhamento atualizado');
    },
    onError: (error) => {
      console.error('Error updating detail type:', error);
      toast.error('Erro ao atualizar tipo de detalhamento');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('line_detail_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-detail-types'] });
      toast.success('Tipo de detalhamento excluído');
    },
    onError: (error) => {
      console.error('Error deleting detail type:', error);
      toast.error('Erro ao excluir tipo de detalhamento');
    },
  });

  return {
    types: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}
