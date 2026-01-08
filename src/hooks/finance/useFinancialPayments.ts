import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";
import { registerPayment } from "@/utils/finance/documentWorkflow";

export function useFinancialPayments() {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["financial-payments", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_payments")
        .select("*, financial_documents(vendor_name, document_number, media_plan_id)")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("planned_payment_date");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!effectiveUserId) throw new Error("User not authenticated");
      
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) throw new Error("Payment not found");

      const result = await registerPayment(
        paymentId,
        effectiveUserId,
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
      if (!effectiveUserId) throw new Error("User not authenticated");

      const result = await registerPayment(
        paymentId,
        effectiveUserId,
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
