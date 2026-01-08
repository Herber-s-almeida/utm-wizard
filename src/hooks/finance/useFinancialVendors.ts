import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

export function useFinancialVendors() {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["financial-vendors", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_vendors")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!effectiveUserId) throw new Error("User not authenticated");
      const { error } = await supabase
        .from("financial_vendors")
        .insert({ name, user_id: effectiveUserId });
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
