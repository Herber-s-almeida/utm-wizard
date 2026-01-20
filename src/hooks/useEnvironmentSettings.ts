import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { toast } from 'sonner';

export interface EnvironmentSettings {
  id: string;
  name: string;
  company_name: string | null;
  cnpj: string | null;
  address: string | null;
  owner_user_id: string;
}

export function useEnvironmentSettings() {
  const { currentEnvironmentId, isEnvironmentOwner, isEnvironmentAdmin, isSystemAdmin } = useEnvironment();
  const queryClient = useQueryClient();

  const canEdit = isEnvironmentOwner || isEnvironmentAdmin || isSystemAdmin;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['environment-settings', currentEnvironmentId],
    queryFn: async () => {
      if (!currentEnvironmentId) return null;

      const { data, error } = await supabase
        .from('environments')
        .select('id, name, company_name, cnpj, address, owner_user_id')
        .eq('id', currentEnvironmentId)
        .single();

      if (error) {
        console.error('Error fetching environment settings:', error);
        return null;
      }

      return data as EnvironmentSettings;
    },
    enabled: !!currentEnvironmentId,
    staleTime: 30 * 1000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<EnvironmentSettings, 'name' | 'company_name' | 'cnpj' | 'address'>>) => {
      if (!currentEnvironmentId) throw new Error('No environment selected');

      const { error } = await supabase
        .from('environments')
        .update(updates)
        .eq('id', currentEnvironmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-settings', currentEnvironmentId] });
      queryClient.invalidateQueries({ queryKey: ['user-environments-v2'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating environment settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  return {
    settings,
    isLoading,
    canEdit,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
  };
}
