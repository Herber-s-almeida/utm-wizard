import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';

export type AppRole = 'owner' | 'editor' | 'viewer' | 'approver';

const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Proprietário',
  editor: 'Editor',
  viewer: 'Visualizador',
  approver: 'Aprovador',
};

/**
 * @deprecated Plan-specific roles are deprecated. Use environment roles instead.
 * This hook now provides read-only access for informational purposes only.
 * All write permissions should be based on environment roles from useEnvironment().
 */
export function usePlanRoles(planId: string | undefined) {
  const { user } = useAuth();
  const { canEdit: environmentCanEdit, isEnvironmentAdmin } = useEnvironment();

  // Get current user's role in the plan (read-only, for display purposes only)
  const userRoleQuery = useQuery({
    queryKey: ['plan_role_value', planId, user?.id],
    queryFn: async () => {
      if (!planId || !user) return null;

      // Check if user is owner
      const { data: plan } = await supabase
        .from('media_plans')
        .select('user_id')
        .eq('id', planId)
        .single();

      if (plan?.user_id === user.id) return 'owner' as AppRole;

      // Check role assignment (legacy - for display only)
      const { data: role } = await supabase
        .from('plan_roles')
        .select('role')
        .eq('media_plan_id', planId)
        .eq('user_id', user.id)
        .maybeSingle();

      return role?.role as AppRole | null;
    },
    enabled: !!planId && !!user,
  });

  // Permissions are now based on environment roles, NOT plan roles
  const userRole = userRoleQuery.data;
  
  // Check if current user can edit (based on environment permissions)
  const canEdit = environmentCanEdit('media_plans');
  
  // Check if current user can manage team (deprecated - use environment settings instead)
  const canManageTeam = false; // Disabled - managed at environment level now
  
  // Check if current user can change status (based on environment permissions)
  const canChangeStatus = environmentCanEdit('media_plans');

  return {
    members: [], // Deprecated - use environment members
    isLoading: false,
    userRole: userRoleQuery.data,
    isLoadingRole: userRoleQuery.isLoading,
    canEdit,
    canManageTeam,
    canChangeStatus,
    // Deprecated mutations - kept for backwards compatibility but will not work
    addMember: { mutateAsync: async () => { throw new Error('Deprecated: Use environment members instead'); } },
    updateRole: { mutateAsync: async () => { throw new Error('Deprecated: Use environment members instead'); } },
    removeMember: { mutateAsync: async () => { throw new Error('Deprecated: Use environment members instead'); } },
    inviteByEmail: { mutateAsync: async () => { throw new Error('Deprecated: Use environment members instead'); } },
    roleLabels: ROLE_LABELS,
    roleDescriptions: {} as Record<AppRole, string>,
  };
}

// Hook to get user's role badge info (read-only, for display purposes)
export function useUserPlanRole(planId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['plan_role_badge', planId, user?.id],
    queryFn: async () => {
      if (!planId || !user) return null;

      const { data: plan } = await supabase
        .from('media_plans')
        .select('user_id')
        .eq('id', planId)
        .single();

      if (plan?.user_id === user.id) {
        return { role: 'owner' as AppRole, label: ROLE_LABELS.owner };
      }

      // Check legacy role assignment
      const { data: role } = await supabase
        .from('plan_roles')
        .select('role')
        .eq('media_plan_id', planId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (role?.role) {
        return { role: role.role as AppRole, label: ROLE_LABELS[role.role as AppRole] };
      }

      return null;
    },
    enabled: !!planId && !!user,
  });
}
