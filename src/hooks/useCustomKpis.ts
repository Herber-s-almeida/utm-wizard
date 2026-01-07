import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CustomKpi {
  id: string;
  user_id: string;
  name: string;
  key: string;
  unit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomKpiParams {
  name: string;
  unit: string;
  description?: string;
}

export interface UpdateCustomKpiParams {
  id: string;
  name?: string;
  unit?: string;
  description?: string;
}

const MAX_CUSTOM_KPIS = 250;

export function useCustomKpis() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Generate a slug key from the name
  const generateKey = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  };

  const { data: customKpis = [], isLoading } = useQuery({
    queryKey: ['custom-kpis', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('custom_kpis')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching custom KPIs:', error);
        return [];
      }

      return data as CustomKpi[];
    },
    enabled: !!user?.id,
  });

  const createKpi = useMutation({
    mutationFn: async (params: CreateCustomKpiParams) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      if (customKpis.length >= MAX_CUSTOM_KPIS) {
        throw new Error(`Limite de ${MAX_CUSTOM_KPIS} KPIs customizados atingido`);
      }

      const key = generateKey(params.name);
      
      // Check if key already exists
      const existingKey = customKpis.find(k => k.key === key);
      if (existingKey) {
        throw new Error('Já existe um KPI com este nome');
      }

      const { data, error } = await supabase
        .from('custom_kpis')
        .insert({
          user_id: user.id,
          name: params.name,
          key,
          unit: params.unit,
          description: params.description || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe um KPI com este nome');
        }
        throw error;
      }

      return data as CustomKpi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kpis'] });
      toast.success('KPI criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar KPI');
    },
  });

  const updateKpi = useMutation({
    mutationFn: async (params: UpdateCustomKpiParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData: Record<string, unknown> = {};
      
      if (params.name !== undefined) {
        updateData.name = params.name;
        updateData.key = generateKey(params.name);
      }
      if (params.unit !== undefined) {
        updateData.unit = params.unit;
      }
      if (params.description !== undefined) {
        updateData.description = params.description || null;
      }

      const { data, error } = await supabase
        .from('custom_kpis')
        .update(updateData)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe um KPI com este nome');
        }
        throw error;
      }

      return data as CustomKpi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kpis'] });
      toast.success('KPI atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar KPI');
    },
  });

  const deleteKpi = useMutation({
    mutationFn: async (kpiId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('custom_kpis')
        .update({ is_active: false })
        .eq('id', kpiId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-kpis'] });
      toast.success('KPI removido');
    },
    onError: () => {
      toast.error('Erro ao remover KPI');
    },
  });

  return {
    customKpis,
    isLoading,
    createKpi,
    updateKpi,
    deleteKpi,
    canCreateMore: customKpis.length < MAX_CUSTOM_KPIS,
    maxKpis: MAX_CUSTOM_KPIS,
    generateKey,
  };
}
