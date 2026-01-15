import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface EligibleMember {
  id: string;
  member_user_id: string;
  notify_media_resources: boolean;
  profile: {
    full_name: string | null;
  } | null;
}

export function useResourceNotifications(environmentOwnerId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ownerId = environmentOwnerId || user?.id;

  // Fetch members who opted in for notifications
  const { data: eligibleMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['notification-eligible-members', ownerId],
    queryFn: async () => {
      if (!ownerId) return [];

      // First get environment members
      const { data: members, error: membersError } = await supabase
        .from('environment_members')
        .select('id, member_user_id, notify_media_resources')
        .eq('environment_owner_id', ownerId)
        .eq('notify_media_resources', true)
        .not('accepted_at', 'is', null);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Get profiles for these members
      const memberUserIds = members.map(m => m.member_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', memberUserIds);

      // Combine the data
      return members.map(m => ({
        id: m.id,
        member_user_id: m.member_user_id,
        notify_media_resources: m.notify_media_resources,
        profile: profiles?.find(p => p.user_id === m.member_user_id) || null,
      })) as EligibleMember[];
    },
    enabled: !!ownerId,
  });

  // Update notification preference for a member
  const updateNotificationPreference = useMutation({
    mutationFn: async ({ memberId, enabled }: { memberId: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('environment_members')
        .update({ notify_media_resources: enabled })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-eligible-members'] });
      queryClient.invalidateQueries({ queryKey: ['environment-members'] });
    },
  });

  // Send notification
  const sendNotification = useMutation({
    mutationFn: async ({
      planId,
      recipientIds,
      customMessage,
    }: {
      planId: string;
      recipientIds: string[];
      customMessage?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-resource-notification', {
        body: { planId, recipientIds, customMessage },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  return {
    eligibleMembers,
    isLoadingMembers,
    updateNotificationPreference: updateNotificationPreference.mutate,
    isUpdatingPreference: updateNotificationPreference.isPending,
    sendNotification: sendNotification.mutate,
    isSendingNotification: sendNotification.isPending,
  };
}
