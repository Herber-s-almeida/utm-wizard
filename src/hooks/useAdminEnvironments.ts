import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EnvironmentMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_environment_admin: boolean;
}

export interface AdminEnvironment {
  id: string;
  name: string;
  company_name: string | null;
  cnpj: string | null;
  created_at: string;
  created_by: string | null;
  members: EnvironmentMember[];
  admin_count: number;
  member_count: number;
}

async function callAdminOperation(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-operations", {
    body: { action, payload },
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data;
}

export function useAdminEnvironments() {
  return useQuery({
    queryKey: ["admin-environments"],
    queryFn: async () => {
      const result = await callAdminOperation("list_environments");
      return result.environments as AdminEnvironment[];
    },
  });
}

export function useCreateEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      companyName,
      initialAdminEmail,
    }: {
      name: string;
      companyName?: string;
      initialAdminEmail?: string;
    }) => {
      return callAdminOperation("create_environment", {
        name,
        companyName,
        initialAdminEmail,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-environments"] });
      toast.success("Ambiente criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar ambiente: ${error.message}`);
    },
  });
}

export function useUpdateEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      environmentId,
      name,
      companyName,
      cnpj,
    }: {
      environmentId: string;
      name?: string;
      companyName?: string;
      cnpj?: string;
    }) => {
      return callAdminOperation("update_environment", {
        environmentId,
        name,
        companyName,
        cnpj,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-environments"] });
      toast.success("Ambiente atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar ambiente: ${error.message}`);
    },
  });
}

export function useDeleteEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (environmentId: string) => {
      return callAdminOperation("delete_environment", { environmentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-environments"] });
      toast.success("Ambiente excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir ambiente: ${error.message}`);
    },
  });
}

export function useAddEnvironmentMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      environmentId,
      email,
      isAdmin,
    }: {
      environmentId: string;
      email: string;
      isAdmin?: boolean;
    }) => {
      return callAdminOperation("add_environment_member", {
        environmentId,
        email,
        isAdmin,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-environments"] });
      if (data.type === "invited") {
        toast.success("Convite enviado com sucesso!");
      } else {
        toast.success("Membro adicionado ao ambiente!");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar membro: ${error.message}`);
    },
  });
}

export function useUpdateEnvironmentMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      environmentId,
      userId,
      isAdmin,
    }: {
      environmentId: string;
      userId: string;
      isAdmin: boolean;
    }) => {
      return callAdminOperation("update_environment_member", {
        environmentId,
        userId,
        isAdmin,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-environments"] });
      toast.success("Permissões atualizadas!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar permissões: ${error.message}`);
    },
  });
}

export function useRemoveEnvironmentMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      environmentId,
      userId,
    }: {
      environmentId: string;
      userId: string;
    }) => {
      return callAdminOperation("remove_environment_member", {
        environmentId,
        userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-environments"] });
      toast.success("Membro removido do ambiente!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover membro: ${error.message}`);
    },
  });
}
