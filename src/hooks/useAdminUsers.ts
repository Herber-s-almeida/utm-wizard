import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  company: string | null;
  system_role: "system_admin" | "user";
  is_system_user: boolean;
}

export interface UserMediaPlan {
  id: string;
  name: string;
  client: string | null;
  campaign: string | null;
  status: string | null;
  total_budget: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

async function callAdminOperation(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-operations", {
    body: { action, payload },
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const result = await callAdminOperation("list_users");
      return result.users as AdminUser[];
    },
  });
}

export function useAdminUserPlans(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-plans", userId],
    queryFn: async () => {
      if (!userId) return [];
      const result = await callAdminOperation("get_user_plans", { userId });
      return result.plans as UserMediaPlan[];
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      fullName,
      company,
    }: {
      userId: string;
      fullName: string;
      company: string;
    }) => {
      return callAdminOperation("update_profile", { userId, fullName, company });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });
}

export function useUpdateSystemRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "system_admin" | "user";
    }) => {
      return callAdminOperation("update_system_role", { userId, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Permissão atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar permissão: ${error.message}`);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return callAdminOperation("delete_user", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    },
  });
}

export function useInviteSystemUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, makeAdmin }: { email: string; makeAdmin?: boolean }) => {
      return callAdminOperation("invite_user", { email, makeAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Ambiente criado! Convite enviado.");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar ambiente: ${error.message}`);
    },
  });
}

export function usePromoteToSystemUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return callAdminOperation("promote_to_system_user", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário promovido a Owner de Ambiente!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao promover usuário: ${error.message}`);
    },
  });
}
