import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useFinancialVendors() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["financial-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_vendors")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const { error } = await supabase
        .from("financial_vendors")
        .insert({ name, user_id: user?.id });
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
