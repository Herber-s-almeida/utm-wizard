import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { toast } from "sonner";

// Types
export interface FinanceCostCenter {
  id: string;
  user_id: string;
  code: string;
  name: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceTeam {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceAccount {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinancePackage {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceMacroClassification {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceExpenseClassification {
  id: string;
  user_id: string;
  name: string;
  macro_classification_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  macro_classification?: FinanceMacroClassification;
}

export interface FinanceRequestType {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Cost Centers
export function useFinanceCostCenters() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_cost_centers", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_cost_centers")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("code");
      
      if (error) throw error;
      return data as FinanceCostCenter[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateCostCenter() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { code: string; name: string }) => {
      const { error } = await supabase
        .from("finance_cost_centers")
        .insert({ ...data, user_id: user!.id, environment_id: currentEnvironmentId! });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_cost_centers"] });
      toast.success("Centro de Custo criado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao criar Centro de Custo");
    },
  });
}

export function useUpdateCostCenter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; code: string; name: string }) => {
      const { error } = await supabase
        .from("finance_cost_centers")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_cost_centers"] });
      toast.success("Centro de Custo atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar Centro de Custo");
    },
  });
}

export function useDeleteCostCenter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_cost_centers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_cost_centers"] });
      toast.success("Centro de Custo removido");
    },
    onError: () => {
      toast.error("Erro ao remover Centro de Custo");
    },
  });
}

// Teams
export function useFinanceTeams() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_teams", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_teams")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceTeam[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateTeam() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const { error } = await supabase
        .from("finance_teams")
        .insert({ ...data, user_id: user!.id, environment_id: currentEnvironmentId! });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_teams"] });
      toast.success("Equipe criada com sucesso");
    },
    onError: () => {
      toast.error("Erro ao criar Equipe");
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("finance_teams")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_teams"] });
      toast.success("Equipe atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar Equipe");
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_teams")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_teams"] });
      toast.success("Equipe removida");
    },
    onError: () => {
      toast.error("Erro ao remover Equipe");
    },
  });
}

// Financial Accounts
export function useFinanceAccounts() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_accounts", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_accounts")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceAccount[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateAccount() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; category?: string }) => {
      const { error } = await supabase
        .from("finance_accounts")
        .insert({ ...data, user_id: user!.id, environment_id: currentEnvironmentId! });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_accounts"] });
      toast.success("Conta Financeira criada");
    },
    onError: () => {
      toast.error("Erro ao criar Conta Financeira");
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; category?: string }) => {
      const { error } = await supabase
        .from("finance_accounts")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_accounts"] });
      toast.success("Conta Financeira atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar Conta Financeira");
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_accounts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_accounts"] });
      toast.success("Conta Financeira removida");
    },
    onError: () => {
      toast.error("Erro ao remover Conta Financeira");
    },
  });
}

// Packages
export function useFinancePackages() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_packages", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_packages")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinancePackage[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreatePackage() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const { error } = await supabase
        .from("finance_packages")
        .insert({ ...data, user_id: user!.id, environment_id: currentEnvironmentId! });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_packages"] });
      toast.success("Pacote criado");
    },
    onError: () => {
      toast.error("Erro ao criar Pacote");
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("finance_packages")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_packages"] });
      toast.success("Pacote atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar Pacote");
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_packages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_packages"] });
      toast.success("Pacote removido");
    },
    onError: () => {
      toast.error("Erro ao remover Pacote");
    },
  });
}

// Macro Classifications
export function useFinanceMacroClassifications() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_macro_classifications", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_macro_classifications")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceMacroClassification[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateMacroClassification() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const { error } = await supabase
        .from("finance_macro_classifications")
        .insert({ ...data, user_id: user!.id, environment_id: currentEnvironmentId! });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_macro_classifications"] });
      toast.success("Classificação Macro criada");
    },
    onError: () => {
      toast.error("Erro ao criar Classificação Macro");
    },
  });
}

export function useUpdateMacroClassification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("finance_macro_classifications")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_macro_classifications"] });
      toast.success("Classificação Macro atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar Classificação Macro");
    },
  });
}

export function useDeleteMacroClassification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_macro_classifications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_macro_classifications"] });
      toast.success("Classificação Macro removida");
    },
    onError: () => {
      toast.error("Erro ao remover Classificação Macro");
    },
  });
}

// Expense Classifications
export function useFinanceExpenseClassifications() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_expense_classifications", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_expense_classifications")
        .select("*, macro_classification:finance_macro_classifications(*)")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceExpenseClassification[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateExpenseClassification() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; macro_classification_id?: string }) => {
      const { error } = await supabase
        .from("finance_expense_classifications")
        .insert({ ...data, user_id: user!.id, environment_id: currentEnvironmentId! });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_expense_classifications"] });
      toast.success("Classificação de Despesa criada");
    },
    onError: () => {
      toast.error("Erro ao criar Classificação de Despesa");
    },
  });
}

export function useUpdateExpenseClassification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; macro_classification_id?: string }) => {
      const { error } = await supabase
        .from("finance_expense_classifications")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_expense_classifications"] });
      toast.success("Classificação de Despesa atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar Classificação de Despesa");
    },
  });
}

export function useDeleteExpenseClassification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_expense_classifications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_expense_classifications"] });
      toast.success("Classificação de Despesa removida");
    },
    onError: () => {
      toast.error("Erro ao remover Classificação de Despesa");
    },
  });
}

// Request Types
export function useFinanceRequestTypes() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_request_types", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_request_types")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceRequestType[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateRequestType() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const { error } = await supabase
        .from("finance_request_types")
        .insert({ ...data, user_id: user!.id, environment_id: currentEnvironmentId! });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_request_types"] });
      toast.success("Tipo de Solicitação criado");
    },
    onError: () => {
      toast.error("Erro ao criar Tipo de Solicitação");
    },
  });
}

export function useUpdateRequestType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("finance_request_types")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_request_types"] });
      toast.success("Tipo de Solicitação atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar Tipo de Solicitação");
    },
  });
}

export function useDeleteRequestType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_request_types")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_request_types"] });
      toast.success("Tipo de Solicitação removido");
    },
    onError: () => {
      toast.error("Erro ao remover Tipo de Solicitação");
    },
  });
}
