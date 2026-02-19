import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { toast } from 'sonner';

export interface LineDetailLink {
  id: string;
  line_detail_id: string;
  media_line_id: string;
  is_primary: boolean;
  allocated_percentage: number;
  allocated_amount: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  environment_id: string | null;
  // Joined fields
  media_line?: {
    id: string;
    line_code: string | null;
    platform: string | null;
    budget: number | null;
    vehicle_id: string | null;
    medium_id: string | null;
    channel_id: string | null;
    subdivision_id: string | null;
    moment_id: string | null;
    funnel_stage_id: string | null;
  };
}

export function useLineDetailLinks(detailId: string | undefined) {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['line-detail-links', detailId],
    queryFn: async () => {
      if (!detailId) return [];

      const { data, error } = await supabase
        .from('line_detail_line_links')
        .select(`
          *,
          media_line:media_lines(
            id,
            line_code,
            platform,
            budget,
            vehicle_id,
            medium_id,
            channel_id,
            subdivision_id,
            moment_id,
            funnel_stage_id
          )
        `)
        .eq('line_detail_id', detailId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return (data || []) as LineDetailLink[];
    },
    enabled: !!detailId && !!user?.id,
  });

  const linkLineMutation = useMutation({
    mutationFn: async (input: { 
      lineId: string; 
      isPrimary?: boolean; 
      allocatedPercentage?: number;
    }) => {
      if (!user?.id || !detailId || !currentEnvironmentId) {
        throw new Error('Missing required context');
      }

      const { data, error } = await supabase
        .from('line_detail_line_links')
        .insert({
          line_detail_id: detailId,
          media_line_id: input.lineId,
          is_primary: input.isPrimary ?? false,
          allocated_percentage: input.allocatedPercentage ?? 0,
          user_id: user.id,
          environment_id: currentEnvironmentId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-detail-links', detailId] });
      queryClient.invalidateQueries({ queryKey: ['plan-details'] });
      toast.success('Linha vinculada ao detalhamento');
    },
    onError: (error) => {
      console.error('Error linking line:', error);
      toast.error('Erro ao vincular linha');
    },
  });

  const unlinkLineMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('line_detail_line_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-detail-links', detailId] });
      queryClient.invalidateQueries({ queryKey: ['plan-details'] });
      toast.success('Vínculo removido');
    },
    onError: (error) => {
      console.error('Error unlinking line:', error);
      toast.error('Erro ao remover vínculo');
    },
  });

  const updateAllocationMutation = useMutation({
    mutationFn: async (input: { 
      linkId: string; 
      allocatedPercentage?: number;
      allocatedAmount?: number | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (input.allocatedPercentage !== undefined) {
        updateData.allocated_percentage = input.allocatedPercentage;
      }
      if (input.allocatedAmount !== undefined) {
        updateData.allocated_amount = input.allocatedAmount;
      }

      const { error } = await supabase
        .from('line_detail_line_links')
        .update(updateData)
        .eq('id', input.linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-detail-links', detailId] });
      queryClient.invalidateQueries({ queryKey: ['plan-details'] });
    },
    onError: (error) => {
      console.error('Error updating allocation:', error);
      toast.error('Erro ao atualizar alocação');
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (linkId: string) => {
      if (!detailId) throw new Error('Detail ID required');

      // First, unset all as non-primary
      await supabase
        .from('line_detail_line_links')
        .update({ is_primary: false })
        .eq('line_detail_id', detailId);

      // Then set the selected one as primary
      const { error } = await supabase
        .from('line_detail_line_links')
        .update({ is_primary: true })
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-detail-links', detailId] });
      queryClient.invalidateQueries({ queryKey: ['plan-details'] });
      toast.success('Linha primária definida');
    },
    onError: (error) => {
      console.error('Error setting primary:', error);
      toast.error('Erro ao definir linha primária');
    },
  });

  // Calculate totals
  const totalAllocatedPercentage = query.data?.reduce(
    (sum, link) => sum + (link.allocated_percentage || 0), 
    0
  ) || 0;

  const primaryLink = query.data?.find(l => l.is_primary);

  return {
    links: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    totalAllocatedPercentage,
    primaryLink,
    linkLine: linkLineMutation.mutateAsync,
    unlinkLine: unlinkLineMutation.mutateAsync,
    updateAllocation: updateAllocationMutation.mutateAsync,
    setPrimary: setPrimaryMutation.mutateAsync,
    refetch: query.refetch,
  };
}

// Hook to get links for a specific media line
export function useLineLinksForLine(mediaLineId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['line-links-for-line', mediaLineId],
    queryFn: async () => {
      if (!mediaLineId) return [];

      const { data, error } = await supabase
        .from('line_detail_line_links')
        .select(`
          *,
          line_detail:line_details(
            id,
            name,
            detail_type_id,
            detail_type:line_detail_types(
              id,
              name,
              icon
            )
          )
        `)
        .eq('media_line_id', mediaLineId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!mediaLineId && !!user?.id,
    staleTime: 30000, // 30s to prevent refetches on remount
  });
}
