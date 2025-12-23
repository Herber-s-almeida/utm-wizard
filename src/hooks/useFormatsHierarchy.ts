import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Types
export interface Format {
  id: string;
  name: string;
  is_system: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FormatCreativeType {
  id: string;
  format_id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  specifications?: CreativeTypeSpecification[];
}

export interface CreativeTypeSpecification {
  id: string;
  creative_type_id: string;
  name: string;
  has_duration: boolean;
  duration_value: number | null;
  duration_unit: string | null;
  max_weight: number | null;
  weight_unit: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  copy_fields?: SpecificationCopyField[];
  dimensions?: SpecificationDimension[];
  extensions?: SpecificationExtension[];
}

export interface SpecificationCopyField {
  id: string;
  specification_id: string;
  name: string;
  max_characters: number | null;
  observation: string | null;
  user_id: string;
}

export interface SpecificationDimension {
  id: string;
  specification_id: string;
  width: number;
  height: number;
  unit: string;
  description: string | null;
  observation: string | null;
  user_id: string;
}

export interface SpecificationExtension {
  id: string;
  specification_id: string;
  extension_id: string;
  extension?: FileExtension;
  user_id: string;
}

export interface FileExtension {
  id: string;
  name: string;
}

export interface FormatWithHierarchy extends Format {
  creative_types: FormatCreativeType[];
}

// Hook for Formats
export function useFormats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['formats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formats')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Format[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('formats')
        .insert({ name: name.trim(), user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Formato criado!');
    },
    onError: () => {
      toast.error('Erro ao criar formato');
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('formats')
        .update({ name: name.trim() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Formato atualizado!');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('formats').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Formato removido!');
    },
  });

  return { ...query, create, update, remove };
}

// Hook for Creative Types (within a format)
export function useFormatCreativeTypes(formatId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['format_creative_types', formatId],
    queryFn: async () => {
      let q = supabase
        .from('format_creative_types')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (formatId) {
        q = q.eq('format_id', formatId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return data as FormatCreativeType[];
    },
    enabled: !!user && !!formatId,
  });

  const create = useMutation({
    mutationFn: async ({ formatId, name }: { formatId: string; name: string }) => {
      const { data, error } = await supabase
        .from('format_creative_types')
        .insert({ format_id: formatId, name: name.trim(), user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['format_creative_types'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Tipo de criativo criado!');
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('format_creative_types')
        .update({ name: name.trim() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['format_creative_types'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Tipo de criativo atualizado!');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('format_creative_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['format_creative_types'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Tipo de criativo removido!');
    },
  });

  return { ...query, create, update, remove };
}

// Hook for Specifications
export function useCreativeTypeSpecifications(creativeTypeId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['creative_type_specifications', creativeTypeId],
    queryFn: async () => {
      let q = supabase
        .from('creative_type_specifications')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (creativeTypeId) {
        q = q.eq('creative_type_id', creativeTypeId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return data as CreativeTypeSpecification[];
    },
    enabled: !!user && !!creativeTypeId,
  });

  const create = useMutation({
    mutationFn: async (params: {
      creativeTypeId: string;
      name: string;
      hasDuration?: boolean;
      durationValue?: number;
      durationUnit?: string;
      maxWeight?: number;
      weightUnit?: string;
    }) => {
      const { data, error } = await supabase
        .from('creative_type_specifications')
        .insert({
          creative_type_id: params.creativeTypeId,
          name: params.name.trim(),
          has_duration: params.hasDuration || false,
          duration_value: params.durationValue || null,
          duration_unit: params.durationUnit || null,
          max_weight: params.maxWeight || null,
          weight_unit: params.weightUnit || null,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative_type_specifications'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Especificação criada!');
    },
  });

  const update = useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      hasDuration?: boolean;
      durationValue?: number | null;
      durationUnit?: string | null;
      maxWeight?: number | null;
      weightUnit?: string | null;
    }) => {
      const updateData: any = {};
      if (params.name !== undefined) updateData.name = params.name.trim();
      if (params.hasDuration !== undefined) updateData.has_duration = params.hasDuration;
      if (params.durationValue !== undefined) updateData.duration_value = params.durationValue;
      if (params.durationUnit !== undefined) updateData.duration_unit = params.durationUnit;
      if (params.maxWeight !== undefined) updateData.max_weight = params.maxWeight;
      if (params.weightUnit !== undefined) updateData.weight_unit = params.weightUnit;
      
      const { error } = await supabase
        .from('creative_type_specifications')
        .update(updateData)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative_type_specifications'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Especificação atualizada!');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('creative_type_specifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative_type_specifications'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      toast.success('Especificação removida!');
    },
  });

  return { ...query, create, update, remove };
}

// Hook for Copy Fields
export function useSpecificationCopyFields(specificationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['specification_copy_fields', specificationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specification_copy_fields')
        .select('*')
        .eq('specification_id', specificationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as SpecificationCopyField[];
    },
    enabled: !!user && !!specificationId,
  });

  const create = useMutation({
    mutationFn: async (params: {
      specificationId: string;
      name: string;
      maxCharacters?: number;
      observation?: string;
    }) => {
      const { data, error } = await supabase
        .from('specification_copy_fields')
        .insert({
          specification_id: params.specificationId,
          name: params.name.trim(),
          max_characters: params.maxCharacters || null,
          observation: params.observation?.trim() || null,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specification_copy_fields'] });
      toast.success('Campo de copy criado!');
    },
  });

  const update = useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      maxCharacters?: number | null;
      observation?: string | null;
    }) => {
      const updateData: any = {};
      if (params.name !== undefined) updateData.name = params.name.trim();
      if (params.maxCharacters !== undefined) updateData.max_characters = params.maxCharacters;
      if (params.observation !== undefined) updateData.observation = params.observation?.trim() || null;
      
      const { error } = await supabase
        .from('specification_copy_fields')
        .update(updateData)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specification_copy_fields'] });
      toast.success('Campo de copy atualizado!');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('specification_copy_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specification_copy_fields'] });
      toast.success('Campo de copy removido!');
    },
  });

  return { ...query, create, update, remove };
}

// Hook for Dimensions
export function useSpecificationDimensions(specificationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['specification_dimensions', specificationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specification_dimensions')
        .select('*')
        .eq('specification_id', specificationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as SpecificationDimension[];
    },
    enabled: !!user && !!specificationId,
  });

  const create = useMutation({
    mutationFn: async (params: {
      specificationId: string;
      width: number;
      height: number;
      unit: string;
    }) => {
      const { data, error } = await supabase
        .from('specification_dimensions')
        .insert({
          specification_id: params.specificationId,
          width: params.width,
          height: params.height,
          unit: params.unit,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specification_dimensions'] });
      toast.success('Dimensão adicionada!');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('specification_dimensions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specification_dimensions'] });
      toast.success('Dimensão removida!');
    },
  });

  return { ...query, create, remove };
}

// Hook for File Extensions (shared library)
export function useFileExtensions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['file_extensions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_extensions')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as FileExtension[];
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const formattedName = name.startsWith('.') ? name : `.${name}`;
      const { data, error } = await supabase
        .from('file_extensions')
        .insert({ name: formattedName.toLowerCase() })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta extensão já existe');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file_extensions'] });
      toast.success('Extensão criada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar extensão');
    },
  });

  return { ...query, create };
}

// Hook for Specification Extensions
export function useSpecificationExtensions(specificationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['specification_extensions', specificationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specification_extensions')
        .select('*, extension:file_extensions(*)')
        .eq('specification_id', specificationId!);
      if (error) throw error;
      return data as (SpecificationExtension & { extension: FileExtension })[];
    },
    enabled: !!user && !!specificationId,
  });

  const add = useMutation({
    mutationFn: async ({ specificationId, extensionId }: { specificationId: string; extensionId: string }) => {
      const { data, error } = await supabase
        .from('specification_extensions')
        .insert({
          specification_id: specificationId,
          extension_id: extensionId,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specification_extensions'] });
      toast.success('Extensão adicionada!');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('specification_extensions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specification_extensions'] });
      toast.success('Extensão removida!');
    },
  });

  return { ...query, add, remove };
}

// Hook for full hierarchy view
export function useFormatsHierarchy() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['formats_hierarchy', user?.id],
    queryFn: async () => {
      // Get all formats
      const { data: formats, error: formatsError } = await supabase
        .from('formats')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });
      
      if (formatsError) throw formatsError;

      const formatIds = formats?.map(f => f.id) || [];
      if (formatIds.length === 0) return [];

      // Get all creative types for these formats
      const { data: creativeTypes, error: ctError } = await supabase
        .from('format_creative_types')
        .select('*')
        .in('format_id', formatIds);
      
      if (ctError) throw ctError;

      const ctIds = creativeTypes?.map(ct => ct.id) || [];
      
      // Get all specifications with copy_fields and dimensions
      let specifications: CreativeTypeSpecification[] = [];
      let copyFields: SpecificationCopyField[] = [];
      let dimensions: SpecificationDimension[] = [];
      
      if (ctIds.length > 0) {
        const { data: specs, error: specsError } = await supabase
          .from('creative_type_specifications')
          .select('*')
          .in('creative_type_id', ctIds);
        
        if (specsError) throw specsError;
        specifications = specs || [];
        
        const specIds = specifications.map(s => s.id);
        
        if (specIds.length > 0) {
          // Get copy fields
          const { data: copyData, error: copyError } = await supabase
            .from('specification_copy_fields')
            .select('*')
            .in('specification_id', specIds);
          
          if (copyError) throw copyError;
          copyFields = copyData || [];
          
          // Get dimensions
          const { data: dimData, error: dimError } = await supabase
            .from('specification_dimensions')
            .select('*')
            .in('specification_id', specIds);
          
          if (dimError) throw dimError;
          dimensions = dimData || [];
        }
      }

      // Build hierarchy with copy_fields and dimensions
      const result = formats?.map(format => ({
        ...format,
        creative_types: creativeTypes
          ?.filter(ct => ct.format_id === format.id)
          .map(ct => ({
            ...ct,
            specifications: specifications
              .filter(s => s.creative_type_id === ct.id)
              .map(spec => ({
                ...spec,
                copy_fields: copyFields.filter(cf => cf.specification_id === spec.id),
                dimensions: dimensions.filter(d => d.specification_id === spec.id),
              })),
          })) || [],
      })) as FormatWithHierarchy[];

      return result;
    },
    enabled: !!user,
  });
}
