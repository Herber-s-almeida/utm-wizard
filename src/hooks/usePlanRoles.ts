import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';

export type AppRole = 'editor' | 'viewer' | 'approver';

const ROLE_LABELS: Record<AppRole, string> = {
  editor: 'Editor',
  viewer: 'Visualizador',
  approver: 'Aprovador',
};

/**
 * @deprecated Plan-specific roles are deprecated. Use environment roles instead.
 * This hook provides read-only access for informational purposes only.
 * All permissions should be based on environment roles from useEnvironment().
 */
export function usePlanRoles(planId: string | undefined) {
  const { canEdit: environmentCanEdit } = useEnvironment();

  // Permissions are now based on environment roles, NOT plan roles
  const canEdit = environmentCanEdit('media_plans');
  const canManageTeam = false; // Deprecated - managed at environment level now
  const canChangeStatus = environmentCanEdit('media_plans');

  return {
    members: [], // Deprecated - use environment members
    isLoading: false,
    userRole: null as AppRole | null,
    isLoadingRole: false,
    canEdit,
    canManageTeam,
    canChangeStatus,
    // Deprecated mutations - removed
    addMember: { mutateAsync: async () => { throw new Error('Deprecated: Use environment members instead'); } },
    updateRole: { mutateAsync: async () => { throw new Error('Deprecated: Use environment members instead'); } },
    removeMember: { mutateAsync: async () => { throw new Error('Deprecated: Use environment members instead'); } },
    inviteByEmail: { mutateAsync: async () => { throw new Error('Deprecated: Use environment members instead'); } },
    roleLabels: ROLE_LABELS,
    roleDescriptions: {} as Record<AppRole, string>,
  };
}

/**
 * Hook to get user's role information for a plan.
 * Now uses environment-based roles instead of plan-specific roles.
 */
export function useUserPlanRole(planId: string | undefined) {
  const { user } = useAuth();
  const { isEnvironmentAdmin, canEdit, canView } = useEnvironment();

  return useQuery({
    queryKey: ['plan_role_badge_v2', planId, user?.id, isEnvironmentAdmin],
    queryFn: async () => {
      if (!planId || !user) return null;

      // Check if user is creator of the plan
      const { data: plan } = await supabase
        .from('media_plans')
        .select('user_id')
        .eq('id', planId)
        .single();

      if (plan?.user_id === user.id) {
        return { role: 'editor' as AppRole, label: ROLE_LABELS.editor };
      }

      // Environment admins get editor role
      if (isEnvironmentAdmin) {
        return { role: 'editor' as AppRole, label: ROLE_LABELS.editor };
      }

      // Check environment permissions
      if (canEdit('media_plans')) {
        return { role: 'editor' as AppRole, label: ROLE_LABELS.editor };
      }

      if (canView('media_plans')) {
        return { role: 'viewer' as AppRole, label: ROLE_LABELS.viewer };
      }

      return null;
    },
    enabled: !!planId && !!user,
  });
}
