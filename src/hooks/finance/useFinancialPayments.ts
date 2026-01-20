import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { toast } from "sonner";
import { registerPayment } from "@/utils/finance/documentWorkflow";

export function useFinancialPayments() {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["financial-payments", currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_payments")
        .select("*, financial_documents(vendor_name, document_number, media_plan_id)")
        .eq("environment_id", currentEnvironmentId!)
        .is("deleted_at", null)
        .order("planned_payment_date");
      if (error) throw error;
      return data;
    },
    enabled: !!currentEnvironmentId,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error("Payment not found");

      const result = await registerPayment(
        paymentId,
        user.id,
        Number(payment.planned_amount),
        "other" // Default method
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["financial-payments"] });
      queryClient.invalidateQueries({ queryKey: ["financial-documents"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const registerPaymentMutation = useMutation({
    mutationFn: async ({ 
      paymentId, 
      paidAmount, 
      paymentMethod,
      proofUrl 
    }: { 
      paymentId: string; 
      paidAmount: number; 
      paymentMethod: string;
      proofUrl?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const result = await registerPayment(
        paymentId,
        user.id,
        paidAmount,
        paymentMethod,
        proofUrl
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["financial-payments"] });
      queryClient.invalidateQueries({ queryKey: ["financial-documents"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { 
    payments, 
    isLoading, 
    markAsPaid: markAsPaidMutation.mutate,
    registerPayment: registerPaymentMutation.mutate,
    isRegistering: registerPaymentMutation.isPending,
  };
}
