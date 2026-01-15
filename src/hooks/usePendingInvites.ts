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

  // Resend an invite (delete and recreate)
  const resendInviteMutation = useMutation({
    mutationFn: async (invite: PendingInvite) => {
      // Call the edge function to resend
      const { data, error } = await supabase.functions.invoke('invite-environment-member', {
        body: {
          email: invite.email,
          permissions: {
            executive_dashboard: invite.perm_executive_dashboard,
            reports: invite.perm_reports,
            finance: invite.perm_finance,
            media_plans: invite.perm_media_plans,
            media_resources: invite.perm_media_resources,
            taxonomy: invite.perm_taxonomy,
            library: invite.perm_library,
          },
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
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
    resendInvite: resendInviteMutation.mutate,
    isDeletingInvite: deletePendingInviteMutation.isPending,
    isResendingInvite: resendInviteMutation.isPending,
  };
}
