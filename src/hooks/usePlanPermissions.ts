import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { toast } from 'sonner';

export type PlanPermissionLevel = 'none' | 'view' | 'edit';

interface PlanPermission {
  id: string;
  media_plan_id: string;
  user_id: string;
  permission_level: PlanPermissionLevel;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

interface EnvironmentMemberWithPermission {
  user_id: string;
  email: string;
  full_name: string | null;
  env_permission: PlanPermissionLevel;
  plan_restriction: PlanPermissionLevel | null;
  effective_permission: PlanPermissionLevel;
}

// Hook para buscar a permissão efetiva do usuário atual em um plano
export function useEffectivePlanPermission(planId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['effective-plan-permission', planId, user?.id],
    queryFn: async () => {
      if (!planId || !user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_effective_plan_permission', {
        _plan_id: planId,
        _user_id: user.id
      });
      
      if (error) throw error;
      return data as PlanPermissionLevel;
    },
    enabled: !!planId && !!user?.id,
  });
}

// Hook para verificar se pode editar o plano
export function useCanEditPlan(planId: string | undefined) {
  const { data: permission, isLoading } = useEffectivePlanPermission(planId);
  
  return {
    canEdit: permission === 'edit',
    canView: permission === 'view' || permission === 'edit',
    permission,
    isLoading,
  };
}

// Hook para gerenciar permissões de um plano (usado por admins)
export function usePlanPermissionsManagement(planId: string | undefined) {
  const queryClient = useQueryClient();
  const { isEnvironmentAdmin } = useEnvironment();
  
  // Buscar membros do ambiente com suas permissões no plano
  const { data: membersWithPermissions, isLoading, refetch } = useQuery({
    queryKey: ['plan-permissions-management', planId],
    queryFn: async () => {
      if (!planId) return [];
      
      // Primeiro, buscar o environment_id do plano
      const { data: plan, error: planError } = await supabase
        .from('media_plans')
        .select('environment_id')
        .eq('id', planId)
        .single();
        
      if (planError || !plan) throw planError;
      
      // Buscar membros do ambiente via RPC
      const { data: members, error: membersError } = await supabase.rpc(
        'get_environment_members_with_details',
        { p_environment_id: plan.environment_id }
      );
      
      if (membersError) throw membersError;
      
      // Buscar restrições específicas do plano
      const { data: restrictions, error: restrictionsError } = await supabase
        .from('plan_permissions')
        .select('*')
        .eq('media_plan_id', planId);
        
      if (restrictionsError) throw restrictionsError;
      
      // Combinar dados
      const result: EnvironmentMemberWithPermission[] = (members || []).map((member: any) => {
        const restriction = restrictions?.find(r => r.user_id === member.user_id);
        const envPerm = member.is_environment_admin ? 'edit' : 
          (member.perm_media_plans === 'edit' ? 'edit' : 
           member.perm_media_plans === 'view' ? 'view' : 'none');
        
        let effectivePerm: PlanPermissionLevel = envPerm as PlanPermissionLevel;
        if (restriction) {
          // Calcular mínimo entre ambiente e restrição
          if (restriction.permission_level === 'none') {
            effectivePerm = 'none';
          } else if (restriction.permission_level === 'view' && envPerm === 'edit') {
            effectivePerm = 'view';
          }
        }
        
        return {
          user_id: member.user_id,
          email: member.email,
          full_name: member.full_name,
          env_permission: envPerm as PlanPermissionLevel,
          plan_restriction: restriction?.permission_level as PlanPermissionLevel | null,
          effective_permission: effectivePerm,
        };
      });
      
      return result;
    },
    enabled: !!planId && isEnvironmentAdmin,
  });
  
  // Mutation para definir/atualizar restrição
  const setRestrictionMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      permissionLevel 
    }: { 
      userId: string; 
      permissionLevel: PlanPermissionLevel | null 
    }) => {
      if (!planId) throw new Error('Plan ID is required');
      
      if (permissionLevel === null) {
        // Remover restrição (usar permissão do ambiente)
        const { error } = await supabase
          .from('plan_permissions')
          .delete()
          .eq('media_plan_id', planId)
          .eq('user_id', userId);
          
        if (error) throw error;
      } else {
        // Upsert restrição
        const { error } = await supabase
          .from('plan_permissions')
          .upsert({
            media_plan_id: planId,
            user_id: userId,
            permission_level: permissionLevel,
          }, {
            onConflict: 'media_plan_id,user_id'
          });
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-permissions-management', planId] });
      queryClient.invalidateQueries({ queryKey: ['effective-plan-permission', planId] });
      toast.success('Permissão atualizada');
    },
    onError: (error) => {
      console.error('Error updating plan permission:', error);
      toast.error('Erro ao atualizar permissão');
    },
  });
  
  return {
    membersWithPermissions: membersWithPermissions || [],
    isLoading,
    refetch,
    setRestriction: setRestrictionMutation.mutate,
    isUpdating: setRestrictionMutation.isPending,
  };
}
