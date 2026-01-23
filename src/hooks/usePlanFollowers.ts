import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlanFollower {
  id: string;
  user_id: string;
  enabled: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    user_id: string;
  };
  email?: string;
}

export function usePlanFollowers(planId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch followers for this plan
  const { data: followers = [], isLoading } = useQuery({
    queryKey: ['plan-followers', planId],
    queryFn: async () => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from('media_plan_followers')
        .select('id, user_id, enabled, created_at')
        .eq('media_plan_id', planId)
        .eq('enabled', true);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get profiles for followers
      const userIds = data.map(f => f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      return data.map(f => ({
        ...f,
        profile: profiles?.find(p => p.user_id === f.user_id) || undefined,
      })) as PlanFollower[];
    },
    enabled: !!planId,
  });

  // Get notification state (last digest sent)
  const { data: notificationState } = useQuery({
    queryKey: ['plan-notification-state', planId],
    queryFn: async () => {
      if (!planId) return null;

      const { data, error } = await supabase
        .from('media_plan_notification_state')
        .select('*')
        .eq('media_plan_id', planId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });

  // Add follower
  const addFollower = useMutation({
    mutationFn: async (userId: string) => {
      if (!planId) throw new Error('Plan ID required');

      const { data, error } = await supabase
        .from('media_plan_followers')
        .upsert({
          media_plan_id: planId,
          user_id: userId,
          enabled: true,
        }, {
          onConflict: 'media_plan_id,user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-followers', planId] });
      toast.success('Seguidor adicionado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar seguidor: ${error.message}`);
    },
  });

  // Remove follower
  const removeFollower = useMutation({
    mutationFn: async (userId: string) => {
      if (!planId) throw new Error('Plan ID required');

      const { error } = await supabase
        .from('media_plan_followers')
        .update({ enabled: false })
        .eq('media_plan_id', planId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-followers', planId] });
      toast.success('Seguidor removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover seguidor: ${error.message}`);
    },
  });

  // Toggle follower
  const toggleFollower = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      if (!planId) throw new Error('Plan ID required');

      if (enabled) {
        // Add/enable follower
        const { error } = await supabase
          .from('media_plan_followers')
          .upsert({
            media_plan_id: planId,
            user_id: userId,
            enabled: true,
          }, {
            onConflict: 'media_plan_id,user_id',
          });

        if (error) throw error;
      } else {
        // Disable follower
        const { error } = await supabase
          .from('media_plan_followers')
          .update({ enabled: false })
          .eq('media_plan_id', planId)
          .eq('user_id', userId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-followers', planId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar seguidor: ${error.message}`);
    },
  });

  // Update notification state after sending
  const updateNotificationState = useMutation({
    mutationFn: async (sentBy: string) => {
      if (!planId) throw new Error('Plan ID required');

      const { error } = await supabase
        .from('media_plan_notification_state')
        .upsert({
          media_plan_id: planId,
          last_digest_sent_at: new Date().toISOString(),
          last_digest_sent_by: sentBy,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'media_plan_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-notification-state', planId] });
    },
  });

  return {
    followers,
    isLoading,
    notificationState,
    addFollower: addFollower.mutate,
    removeFollower: removeFollower.mutate,
    toggleFollower: toggleFollower.mutate,
    isToggling: toggleFollower.isPending,
    updateNotificationState: updateNotificationState.mutate,
  };
}
