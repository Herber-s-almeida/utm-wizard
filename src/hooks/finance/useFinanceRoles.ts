import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type FinanceRole = 'finance_admin' | 'finance_editor' | 'finance_viewer';

interface FinanceRoleRecord {
  id: string;
  user_id: string;
  role: string;
  granted_by: string | null;
  created_at: string | null;
}

export function useFinanceRoles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["financial-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FinanceRoleRecord[];
    },
    enabled: !!user,
  });

  const { data: currentUserRole } = useQuery({
    queryKey: ["current-finance-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("financial_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role as FinanceRole | null;
    },
    enabled: !!user,
  });

  const grantRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: FinanceRole }) => {
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase
        .from("financial_roles")
        .upsert({
          user_id: userId,
          role,
          granted_by: user.id,
        }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-roles"] });
      toast.success("Permissão concedida!");
    },
    onError: (error) => {
      toast.error("Erro ao conceder permissão: " + error.message);
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("financial_roles")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-roles"] });
      toast.success("Permissão revogada!");
    },
    onError: (error) => {
      toast.error("Erro ao revogar permissão: " + error.message);
    },
  });

  const hasFinanceAccess = !!currentUserRole;
  const isFinanceAdmin = currentUserRole === 'finance_admin';
  const canEdit = currentUserRole === 'finance_admin' || currentUserRole === 'finance_editor';

  return {
    roles,
    isLoading,
    currentUserRole,
    hasFinanceAccess,
    isFinanceAdmin,
    canEdit,
    grantRole: grantRoleMutation.mutate,
    revokeRole: revokeRoleMutation.mutate,
    isGranting: grantRoleMutation.isPending,
    isRevoking: revokeRoleMutation.isPending,
  };
}
