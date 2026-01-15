import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PermissionLevel } from '@/contexts/EnvironmentContext';

export interface PendingInvite {
  id: string;
  email: string;
  environment_owner_id: string;
  invited_by: string;
  perm_executive_dashboard: PermissionLevel;
  perm_reports: PermissionLevel;
  perm_finance: PermissionLevel;
  perm_media_plans: PermissionLevel;
  perm_media_resources: PermissionLevel;
  perm_taxonomy: PermissionLevel;
  perm_library: PermissionLevel;
  notify_media_resources: boolean;
  created_at: string;
  expires_at: string;
}

export function usePendingInvites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;

  // Fetch pending invites for the current user's environment
  const { data: pendingInvites = [], isLoading: isLoadingPendingInvites } = useQuery({
    queryKey: ['pending-invites', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      
      const { data, error } = await supabase
        .from('pending_environment_invites')
        .select('*')
        .eq('environment_owner_id', currentUserId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PendingInvite[];
    },
    enabled: !!currentUserId,
  });

  // Delete a pending invite
  const deletePendingInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('pending_environment_invites')
        .delete()
        .eq('id', inviteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    },
  });

  return {
    pendingInvites,
    pendingInviteCount: pendingInvites.length,
    isLoadingPendingInvites,
    deletePendingInvite: deletePendingInviteMutation.mutate,
    isDeletingInvite: deletePendingInviteMutation.isPending,
  };
}
