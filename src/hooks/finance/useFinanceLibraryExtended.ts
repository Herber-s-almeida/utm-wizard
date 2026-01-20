import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { toast } from "sonner";

// Types
export interface FinanceAccountManager {
  id: string;
  user_id: string;
  environment_id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceDocumentType {
  id: string;
  user_id: string;
  environment_id?: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceStatus {
  id: string;
  user_id: string;
  environment_id?: string;
  name: string;
  color: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceCampaignProject {
  id: string;
  user_id: string;
  environment_id?: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Account Managers (Atendimento)
export function useFinanceAccountManagers() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_account_managers", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_account_managers")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceAccountManager[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateAccountManager() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string }) => {
      const { error } = await supabase
        .from("finance_account_managers")
        .insert({ 
          ...data, 
          user_id: user!.id,
          environment_id: currentEnvironmentId!
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_account_managers"] });
      toast.success("Atendimento criado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao criar Atendimento");
    },
  });
}

export function useUpdateAccountManager() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; email?: string; phone?: string }) => {
      const { error } = await supabase
        .from("finance_account_managers")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_account_managers"] });
      toast.success("Atendimento atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar Atendimento");
    },
  });
}

export function useDeleteAccountManager() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_account_managers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_account_managers"] });
      toast.success("Atendimento removido");
    },
    onError: () => {
      toast.error("Erro ao remover Atendimento");
    },
  });
}

// Document Types
export function useFinanceDocumentTypes() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_document_types", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_document_types")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceDocumentType[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateDocumentType() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_document_types")
        .insert({ 
          ...data, 
          user_id: user!.id,
          environment_id: currentEnvironmentId!
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_document_types"] });
      toast.success("Tipo de Documento criado");
    },
    onError: () => {
      toast.error("Erro ao criar Tipo de Documento");
    },
  });
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_document_types")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_document_types"] });
      toast.success("Tipo de Documento atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar Tipo de Documento");
    },
  });
}

export function useDeleteDocumentType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_document_types")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_document_types"] });
      toast.success("Tipo de Documento removido");
    },
    onError: () => {
      toast.error("Erro ao remover Tipo de Documento");
    },
  });
}

// Finance Statuses
export function useFinanceStatuses() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_statuses", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_statuses")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceStatus[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateFinanceStatus() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; color?: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_statuses")
        .insert({ 
          ...data, 
          user_id: user!.id,
          environment_id: currentEnvironmentId!
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_statuses"] });
      toast.success("Status criado");
    },
    onError: () => {
      toast.error("Erro ao criar Status");
    },
  });
}

export function useUpdateFinanceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; color?: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_statuses")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_statuses"] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar Status");
    },
  });
}

export function useDeleteFinanceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_statuses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_statuses"] });
      toast.success("Status removido");
    },
    onError: () => {
      toast.error("Erro ao remover Status");
    },
  });
}

// Campaign/Projects
export function useFinanceCampaignProjects() {
  const { currentEnvironmentId } = useEnvironment();
  
  return useQuery({
    queryKey: ["finance_campaign_projects", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_campaign_projects")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceCampaignProject[];
    },
    enabled: !!currentEnvironmentId,
  });
}

export function useCreateCampaignProject() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_campaign_projects")
        .insert({ 
          ...data, 
          user_id: user!.id,
          environment_id: currentEnvironmentId!
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_campaign_projects"] });
      toast.success("Campanha/Projeto criado");
    },
    onError: () => {
      toast.error("Erro ao criar Campanha/Projeto");
    },
  });
}

export function useUpdateCampaignProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_campaign_projects")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_campaign_projects"] });
      toast.success("Campanha/Projeto atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar Campanha/Projeto");
    },
  });
}

export function useDeleteCampaignProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("finance_campaign_projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_campaign_projects"] });
      toast.success("Campanha/Projeto removido");
    },
    onError: () => {
      toast.error("Erro ao remover Campanha/Projeto");
    },
  });
}
