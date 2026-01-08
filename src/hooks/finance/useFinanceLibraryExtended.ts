import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

// Types
export interface FinanceAccountManager {
  id: string;
  user_id: string;
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
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Account Managers (Atendimento)
export function useFinanceAccountManagers() {
  const effectiveUserId = useEffectiveUserId();
  
  return useQuery({
    queryKey: ["finance_account_managers", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_account_managers")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceAccountManager[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateAccountManager() {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string }) => {
      const { error } = await supabase
        .from("finance_account_managers")
        .insert({ ...data, user_id: effectiveUserId! });
      
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
  const effectiveUserId = useEffectiveUserId();
  
  return useQuery({
    queryKey: ["finance_document_types", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_document_types")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceDocumentType[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateDocumentType() {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_document_types")
        .insert({ ...data, user_id: effectiveUserId! });
      
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
  const effectiveUserId = useEffectiveUserId();
  
  return useQuery({
    queryKey: ["finance_statuses", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_statuses")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceStatus[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateFinanceStatus() {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; color?: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_statuses")
        .insert({ ...data, user_id: effectiveUserId! });
      
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
  const effectiveUserId = useEffectiveUserId();
  
  return useQuery({
    queryKey: ["finance_campaign_projects", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_campaign_projects")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("name");
      
      if (error) throw error;
      return data as FinanceCampaignProject[];
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateCampaignProject() {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { error } = await supabase
        .from("finance_campaign_projects")
        .insert({ ...data, user_id: effectiveUserId! });
      
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
