import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnvironment } from '@/contexts/EnvironmentContext';

export function useEnvironmentLogo() {
  const { currentEnvironmentId } = useEnvironment();

  const { data: logoUrl, isLoading } = useQuery({
    queryKey: ['environment-logo', currentEnvironmentId],
    queryFn: async () => {
      if (!currentEnvironmentId) return null;

      const { data, error } = await supabase
        .from('environments')
        .select('logo_url')
        .eq('id', currentEnvironmentId)
        .single();

      if (error) {
        console.error('Error fetching environment logo:', error);
        return null;
      }

      return data?.logo_url || null;
    },
    enabled: !!currentEnvironmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { logoUrl, isLoading };
}