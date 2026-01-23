import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useFinancialVendors() {
  const { currentEnvironmentId } = useEnvironment();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["financial-vendors", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_vendors")
        .select("*")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentEnvironmentId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!currentEnvironmentId) throw new Error("Ambiente não selecionado");
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("financial_vendors")
        .insert({ 
          name, 
          environment_id: currentEnvironmentId,
          user_id: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-vendors"] });
      toast.success("Fornecedor criado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_vendors")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-vendors"] });
      toast.success("Fornecedor excluído!");
    },
  });

  return { vendors, isLoading, createVendor: createMutation.mutate, deleteVendor: deleteMutation.mutate };
}
