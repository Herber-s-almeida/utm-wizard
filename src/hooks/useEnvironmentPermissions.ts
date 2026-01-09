import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export type EnvironmentSection = 
  | 'executive_dashboard' 
  | 'reports' 
  | 'finance' 
  | 'media_plans' 
  | 'media_resources' 
  | 'taxonomy' 
  | 'library';

export interface EnvironmentMember {
  id: string;
  environment_owner_id: string;
  member_user_id: string;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  perm_executive_dashboard: PermissionLevel;
  perm_reports: PermissionLevel;
  perm_finance: PermissionLevel;
  perm_media_plans: PermissionLevel;
  perm_media_resources: PermissionLevel;
  perm_taxonomy: PermissionLevel;
  perm_library: PermissionLevel;
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
  const { effectiveUserId, viewingUser, isViewingOtherEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  
  const currentUserId = user?.id;
  const environmentOwnerId = effectiveUserId;

  // Fetch current user's membership in the viewed environment
  const { data: myMembership } = useQuery({
    queryKey: ['environment-membership', environmentOwnerId, currentUserId],
    queryFn: async () => {
      if (!environmentOwnerId || !currentUserId || environmentOwnerId === currentUserId) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('environment_members')
        .select('*')
        .eq('environment_owner_id', environmentOwnerId)
        .eq('member_user_id', currentUserId)
        .maybeSingle();
      
      if (error) throw error;
      return data as EnvironmentMember | null;
    },
    enabled: !!environmentOwnerId && !!currentUserId && isViewingOtherEnvironment,
  });

  // Fetch all members of the current user's environment (when they're the owner)
  const { data: environmentMembers = [], isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['environment-members', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      
      const { data, error } = await supabase
        .from('environment_members')
        .select('*')
        .eq('environment_owner_id', currentUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EnvironmentMember[];
    },
    enabled: !!currentUserId,
  });

  // Check if user is system admin
  const { data: isSystemAdmin = false } = useQuery({
    queryKey: ['is-system-admin', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return false;
      
      const { data, error } = await supabase.rpc('is_system_admin', {
        _user_id: currentUserId,
      });
      
      if (error) return false;
      return data as boolean;
    },
    enabled: !!currentUserId,
  });

  // Get permission for a specific section
  const getPermission = (section: EnvironmentSection): PermissionLevel => {
    // System admin has full access
    if (isSystemAdmin) return 'admin';
    
    // If viewing own environment, has full access
    if (!isViewingOtherEnvironment || environmentOwnerId === currentUserId) {
      return 'admin';
    }
    
    // Get permission from membership
    if (myMembership) {
      const columnName = SECTION_TO_COLUMN[section] as keyof EnvironmentMember;
      return (myMembership[columnName] as PermissionLevel) || 'none';
    }
    
    return 'none';
  };

  const canView = (section: EnvironmentSection): boolean => {
    const level = getPermission(section);
    return level !== 'none';
  };

  const canEdit = (section: EnvironmentSection): boolean => {
    const level = getPermission(section);
    return level === 'edit' || level === 'admin';
  };

  const isEnvironmentOwner = !isViewingOtherEnvironment || environmentOwnerId === currentUserId;
  
  const isEnvironmentAdmin = isSystemAdmin || isEnvironmentOwner || (
    myMembership && (
      myMembership.perm_executive_dashboard === 'admin' ||
      myMembership.perm_reports === 'admin' ||
      myMembership.perm_finance === 'admin' ||
      myMembership.perm_media_plans === 'admin' ||
      myMembership.perm_media_resources === 'admin' ||
      myMembership.perm_taxonomy === 'admin' ||
      myMembership.perm_library === 'admin'
    )
  );

  const memberCount = environmentMembers.length;
  const canInviteMore = memberCount < 30;

  // Invite member mutation (uses edge function)
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, permissions }: InviteMemberData) => {
      if (!currentUserId) throw new Error('Usuário não autenticado');
      if (!canInviteMore) throw new Error('Limite de 30 membros atingido');
      
      const { data, error } = await supabase.functions.invoke('invite-environment-member', {
        body: { email, permissions },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-members'] });
    },
  });

  // Update member permissions mutation
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
        .from('environment_members')
        .update(updateData)
        .eq('id', memberId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-members'] });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('environment_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-members'] });
    },
  });

  return {
    // Permission checks
    getPermission,
    canView,
    canEdit,
    isEnvironmentOwner,
    isEnvironmentAdmin,
    isSystemAdmin,
    
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
