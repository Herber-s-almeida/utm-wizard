import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useFinancialPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["financial-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_payments")
        .select("*")
        .is("deleted_at", null)
        .order("planned_payment_date");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const payment = payments.find(p => p.id === id);
      const { error } = await supabase
        .from("financial_payments")
        .update({ 
          status: "paid", 
          actual_payment_date: new Date().toISOString().split("T")[0],
          paid_amount: payment?.planned_amount 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-payments"] });
      toast.success("Pagamento registrado!");
    },
  });

  return { payments, isLoading, markAsPaid: markAsPaidMutation.mutate };
}
