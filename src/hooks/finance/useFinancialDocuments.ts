import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { DocumentStatus } from "@/types/finance";

interface CreateDocumentData {
  media_plan_id: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  document_type: string;
  document_number?: string | null;
  issue_date: string;
  due_date: string;
  amount: number;
  currency: string;
  notes?: string | null;
  status: string;
}

export function useFinancialDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["financial-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_documents")
        .select("*")
        .is("deleted_at", null)
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase
        .from("financial_documents")
        .insert({
          ...data,
          user_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-documents"] });
      toast.success("Documento criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar documento: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_documents")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-documents"] });
      toast.success("Documento excluído!");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DocumentStatus }) => {
      const updateData: Record<string, any> = { status };
      
      if (status === 'approved' && user) {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("financial_documents")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-documents"] });
      queryClient.invalidateQueries({ queryKey: ["financial-document"] });
      toast.success("Status atualizado!");
    },
  });

  return { 
    documents, 
    isLoading, 
    createDocument: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteDocument: deleteMutation.mutate,
    updateDocumentStatus: updateStatusMutation.mutate,
  };
}
