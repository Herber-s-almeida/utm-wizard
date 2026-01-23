import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEnvironment, PermissionLevel, EnvironmentSection } from '@/contexts/EnvironmentContext';

// Re-export types from context for backwards compatibility
export type { PermissionLevel, EnvironmentSection } from '@/contexts/EnvironmentContext';

export interface EnvironmentMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_environment_admin: boolean;
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
  accepted_at: string | null;
  invited_at: string | null;
}

export interface InviteMemberData {
  email: string;
  isAdmin?: boolean;
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
    isEnvironmentAdmin,
    isSystemAdmin,
    isLoadingPermissions,
  } = useEnvironment();
  
  const currentUserId = user?.id;

  // Fetch all members of the current environment using the RPC function
  const { data: environmentMembers = [], isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['environment-members', currentEnvironmentId],
    queryFn: async () => {
      if (!currentEnvironmentId) return [];
      
      // Use the RPC function that returns full member details including email
      const { data, error } = await supabase
        .rpc('get_environment_members_with_details', {
          p_environment_id: currentEnvironmentId
        });
      
      if (error) throw error;
      
      // Map the response to match our interface
      return (data || []).map(member => ({
        ...member,
        perm_executive_dashboard: member.perm_executive_dashboard as PermissionLevel,
        perm_reports: member.perm_reports as PermissionLevel,
        perm_finance: member.perm_finance as PermissionLevel,
        perm_media_plans: member.perm_media_plans as PermissionLevel,
        perm_media_resources: member.perm_media_resources as PermissionLevel,
        perm_taxonomy: member.perm_taxonomy as PermissionLevel,
        perm_library: member.perm_library as PermissionLevel,
      })) as EnvironmentMember[];
    },
    enabled: !!currentEnvironmentId,
  });

  const memberCount = environmentMembers.length;
  const canInviteMore = memberCount < 30;

  // Invite member mutation (uses edge function)
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, isAdmin, permissions }: InviteMemberData) => {
      if (!currentUserId) throw new Error('Usuário não autenticado');
      if (!currentEnvironmentId) throw new Error('Ambiente não selecionado');
      if (!canInviteMore) throw new Error('Limite de 30 membros atingido');
      
      const { data, error } = await supabase.functions.invoke('invite-environment-member', {
        body: { 
          email, 
          permissions, 
          environment_id: currentEnvironmentId,
          is_environment_admin: isAdmin || false,
        },
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
      isAdmin,
      permissions 
    }: { 
      memberId: string; 
      isAdmin?: boolean;
      permissions?: Partial<Record<EnvironmentSection, PermissionLevel>>;
    }) => {
      const updateData: Record<string, any> = {};
      
      // If setting as admin, set all permissions to 'admin'
      if (isAdmin !== undefined) {
        updateData.is_environment_admin = isAdmin;
        
        if (isAdmin) {
          // When promoted to admin, set all permissions to 'admin'
          for (const column of Object.values(SECTION_TO_COLUMN)) {
            updateData[column] = 'admin';
          }
        }
      }
      
      // Apply individual permission changes (only if not admin or explicitly provided)
      if (permissions) {
        for (const [section, level] of Object.entries(permissions)) {
          const column = SECTION_TO_COLUMN[section as EnvironmentSection];
          if (column) {
            updateData[column] = level;
          }
        }
      }
      
      if (!currentEnvironmentId) throw new Error('Ambiente não selecionado');
      
      const { data, error } = await supabase
        .from('environment_roles')
        .update(updateData)
        .eq('user_id', memberId)
        .eq('environment_id', currentEnvironmentId)
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
      if (!currentEnvironmentId) throw new Error('Ambiente não selecionado');
      
      const { error } = await supabase
        .from('environment_roles')
        .delete()
        .eq('user_id', memberId)
        .eq('environment_id', currentEnvironmentId);
      
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
