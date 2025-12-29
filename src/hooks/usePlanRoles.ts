import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type AppRole = 'owner' | 'editor' | 'viewer' | 'approver';

export interface PlanRole {
  id: string;
  media_plan_id: string;
  user_id: string;
  role: AppRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
  invited_by_name?: string;
}

export interface PlanMember {
  id: string;
  user_id: string;
  role: AppRole;
  email: string;
  name: string | null;
  invited_at: string;
  accepted_at: string | null;
  isOwner: boolean;
}

const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Proprietário',
  editor: 'Editor',
  viewer: 'Visualizador',
  approver: 'Aprovador',
};

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  owner: 'Controle total do plano, incluindo exclusão e gerenciamento de equipe',
  editor: 'Pode editar o plano, criar e modificar linhas e criativos',
  viewer: 'Apenas visualização do plano e seus dados',
  approver: 'Pode visualizar e alterar o status do plano',
};

export function usePlanRoles(planId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all members of a plan
  const membersQuery = useQuery({
    queryKey: ['plan_roles', planId],
    queryFn: async () => {
      if (!planId) return [];

      // First get the plan to know the owner
      const { data: plan, error: planError } = await supabase
        .from('media_plans')
        .select('user_id')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Get all roles for this plan
      const { data: roles, error: rolesError } = await supabase
        .from('plan_roles')
        .select('*')
        .eq('media_plan_id', planId);

      if (rolesError) throw rolesError;

      // Get profile info for all users (owner + role members)
      const userIds = new Set<string>([plan.user_id]);
      roles?.forEach(r => userIds.add(r.user_id));

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(userIds));

      // Build members list
      const members: PlanMember[] = [];

      // Add owner first
      const ownerProfile = profiles?.find(p => p.user_id === plan.user_id);
      members.push({
        id: 'owner',
        user_id: plan.user_id,
        role: 'owner',
        email: '', // We'll need to get this from auth if needed
        name: ownerProfile?.full_name || 'Proprietário',
        invited_at: '',
        accepted_at: null,
        isOwner: true,
      });

      // Add other members
      roles?.forEach(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        members.push({
          id: role.id,
          user_id: role.user_id,
          role: role.role as AppRole,
          email: '',
          name: profile?.full_name || 'Usuário',
          invited_at: role.invited_at,
          accepted_at: role.accepted_at,
          isOwner: false,
        });
      });

      return members;
    },
    enabled: !!planId && !!user,
  });

  // Get current user's role in the plan
  const userRoleQuery = useQuery({
    queryKey: ['plan_role', planId, user?.id],
    queryFn: async () => {
      if (!planId || !user) return null;

      // Check if user is owner
      const { data: plan } = await supabase
        .from('media_plans')
        .select('user_id')
        .eq('id', planId)
        .single();

      if (plan?.user_id === user.id) return 'owner' as AppRole;

      // Check role assignment
      const { data: role } = await supabase
        .from('plan_roles')
        .select('role')
        .eq('media_plan_id', planId)
        .eq('user_id', user.id)
        .single();

      return role?.role as AppRole | null;
    },
    enabled: !!planId && !!user,
  });

  // Add member to plan
  const addMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('plan_roles')
        .insert({
          media_plan_id: planId!,
          user_id: userId,
          role,
          invited_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan_roles', planId] });
      toast.success('Membro adicionado ao plano!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este usuário já é membro do plano');
      } else {
        toast.error('Erro ao adicionar membro');
      }
    },
  });

  // Update member role
  const updateRole = useMutation({
    mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('plan_roles')
        .update({ role: newRole })
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan_roles', planId] });
      toast.success('Papel atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar papel');
    },
  });

  // Remove member from plan
  const removeMember = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('plan_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan_roles', planId] });
      toast.success('Membro removido do plano');
    },
    onError: () => {
      toast.error('Erro ao remover membro');
    },
  });

  // Invite by email (finds user by email in profiles)
  const inviteByEmail = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      // For now, we can't easily look up users by email without admin access
      // This would typically need an edge function or admin API
      // For MVP, we'll show an error and suggest using user ID
      throw new Error('Funcionalidade de convite por email em desenvolvimento');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao convidar usuário');
    },
  });

  // Derived permissions - when loading, default to false but components should check isLoadingRole
  const userRole = userRoleQuery.data;
  
  // Check if current user can edit (owner or editor)
  const canEdit = userRole === 'owner' || userRole === 'editor';
  
  // Check if current user can manage team (only owner)
  const canManageTeam = userRole === 'owner';
  
  // Check if current user can change status (owner, editor, or approver)
  const canChangeStatus = ['owner', 'editor', 'approver'].includes(userRole || '');

  return {
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    userRole: userRoleQuery.data,
    isLoadingRole: userRoleQuery.isLoading,
    canEdit,
    canManageTeam,
    canChangeStatus,
    addMember,
    updateRole,
    removeMember,
    inviteByEmail,
    roleLabels: ROLE_LABELS,
    roleDescriptions: ROLE_DESCRIPTIONS,
  };
}

// Hook to get user's role badge info
export function useUserPlanRole(planId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['plan_role', planId, user?.id],
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

      const { data: role } = await supabase
        .from('plan_roles')
        .select('role')
        .eq('media_plan_id', planId)
        .eq('user_id', user.id)
        .single();

      if (role?.role) {
        return { role: role.role as AppRole, label: ROLE_LABELS[role.role as AppRole] };
      }

      return null;
    },
    enabled: !!planId && !!user,
  });
}
