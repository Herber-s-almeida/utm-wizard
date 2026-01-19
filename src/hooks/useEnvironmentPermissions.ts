import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEnvironment, PermissionLevel, EnvironmentSection } from '@/contexts/EnvironmentContext';

// Re-export types from context for backwards compatibility
export type { PermissionLevel, EnvironmentSection } from '@/contexts/EnvironmentContext';

export interface EnvironmentMember {
  id: string;
  environment_id: string;
  user_id: string;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  role_read: boolean;
  role_edit: boolean;
  role_delete: boolean;
  role_invite: boolean;
  perm_executive_dashboard: PermissionLevel;
  perm_reports: PermissionLevel;
  perm_finance: PermissionLevel;
  perm_media_plans: PermissionLevel;
  perm_media_resources: PermissionLevel;
  perm_taxonomy: PermissionLevel;
  perm_library: PermissionLevel;
  notify_media_resources?: boolean;
  // Joined profile data
  profile?: {
    full_name: string | null;
    company: string | null;
  };
  email?: string;
}

export interface InviteMemberData {
  email: string;
  permissions: {
    executive_dashboard: PermissionLevel;
    reports: PermissionLevel;
    finance: PermissionLevel;
    media_plans: PermissionLevel;
    media_resources: PermissionLevel;
    taxonomy: PermissionLevel;
    library: PermissionLevel;
  };
}

const SECTION_TO_COLUMN: Record<EnvironmentSection, string> = {
  executive_dashboard: 'perm_executive_dashboard',
  reports: 'perm_reports',
  finance: 'perm_finance',
  media_plans: 'perm_media_plans',
  media_resources: 'perm_media_resources',
  taxonomy: 'perm_taxonomy',
  library: 'perm_library',
};

export function useEnvironmentPermissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get permission-related values directly from context (no duplicate queries)
  const {
    currentEnvironmentId,
    getPermission,
    canView,
    canEdit,
    isEnvironmentOwner,
    isEnvironmentAdmin,
    isSystemAdmin,
    isLoadingPermissions,
  } = useEnvironment();
  
  const currentUserId = user?.id;

  // Fetch all members of the current environment from environment_roles
  const { data: environmentMembers = [], isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['environment-members', currentEnvironmentId],
    queryFn: async () => {
      if (!currentEnvironmentId) return [];
      
      // Get environment_roles for the current environment (excluding current user if they're the owner)
      const { data: roles, error } = await supabase
        .from('environment_roles')
        .select('*')
        .eq('environment_id', currentEnvironmentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles for all users
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, company')
        .in('id', userIds);
      
      // Combine data
      const membersWithProfiles = roles.map(role => ({
        ...role,
        profile: profiles?.find(p => p.id === role.user_id) || null,
      }));
      
      return membersWithProfiles as EnvironmentMember[];
    },
    enabled: !!currentEnvironmentId,
  });

  const memberCount = environmentMembers.length;
  const canInviteMore = memberCount < 30;

  // Invite member mutation (uses edge function)
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, permissions }: InviteMemberData) => {
      if (!currentUserId) throw new Error('Usuário não autenticado');
      if (!currentEnvironmentId) throw new Error('Ambiente não selecionado');
      if (!canInviteMore) throw new Error('Limite de 30 membros atingido');
      
      const { data, error } = await supabase.functions.invoke('invite-environment-member', {
        body: { email, permissions, environment_id: currentEnvironmentId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-members'] });
      queryClient.invalidateQueries({ queryKey: ['environment-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-environments-v2'] });
    },
  });

  // Update member permissions mutation (now uses environment_roles)
  const updateMemberMutation = useMutation({
    mutationFn: async ({ 
      memberId, 
      permissions 
    }: { 
      memberId: string; 
      permissions: Partial<Record<EnvironmentSection, PermissionLevel>>;
    }) => {
      const updateData: Record<string, PermissionLevel> = {};
      
      for (const [section, level] of Object.entries(permissions)) {
        const column = SECTION_TO_COLUMN[section as EnvironmentSection];
        if (column) {
          updateData[column] = level;
        }
      }
      
      const { data, error } = await supabase
        .from('environment_roles')
        .update(updateData)
        .eq('id', memberId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-members'] });
      queryClient.invalidateQueries({ queryKey: ['environment-roles'] });
    },
  });

  // Remove member mutation (now uses environment_roles)
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('environment_roles')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-members'] });
      queryClient.invalidateQueries({ queryKey: ['environment-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-environments-v2'] });
    },
  });

  return {
    // Permission checks (from context)
    getPermission,
    canView,
    canEdit,
    isEnvironmentOwner,
    isEnvironmentAdmin,
    isSystemAdmin,
    isLoadingPermissions,
    
    // Member management
    environmentMembers,
    memberCount,
    canInviteMore,
    isLoadingMembers,
    refetchMembers,
    
    // Mutations
    inviteMember: inviteMemberMutation.mutate,
    updateMemberPermissions: updateMemberMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    isInviting: inviteMemberMutation.isPending,
    isUpdating: updateMemberMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
  };
}
