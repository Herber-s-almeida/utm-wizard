import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { toast } from "sonner";

interface CreateRevenueData {
  media_plan_id?: string | null;
  period_start: string;
  period_end: string;
  revenue_amount: number;
  product_name?: string | null;
  source?: string | null;
}

interface UpdateRevenueData {
  id: string;
  revenue_amount?: number;
  product_name?: string | null;
  source?: string | null;
}

export function useFinancialRevenues(planId?: string) {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["media-plans-for-finance", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_plans")
        .select("id, name, total_budget")
        .eq("user_id", effectiveUserId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const { data: revenues = [], isLoading } = useQuery({
    queryKey: ["financial-revenues", planId, effectiveUserId],
    queryFn: async () => {
      let query = supabase
        .from("financial_revenues")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("period_start");
      
      if (planId) {
        query = query.eq("media_plan_id", planId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  // Get total investment for ROI calculation
  const { data: totalInvestment = 0 } = useQuery({
    queryKey: ["financial-investment", planId, effectiveUserId],
    queryFn: async () => {
      let query = supabase
        .from("financial_actuals")
        .select("actual_amount")
        .eq("user_id", effectiveUserId!);
      
      if (planId) {
        query = query.eq("media_plan_id", planId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data.reduce((sum, a) => sum + Number(a.actual_amount), 0);
    },
    enabled: !!effectiveUserId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateRevenueData) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("financial_revenues")
        .insert({
          ...data,
          user_id: effectiveUserId,
        });
      
      if (error) throw error;

      // Audit log
      await supabase.from("financial_audit_log").insert([{
        user_id: effectiveUserId,
        entity_type: "revenue",
        entity_id: data.media_plan_id || "global",
        action: "create",
        after_json: data as any,
        reason: "Receita registrada",
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-revenues"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success("Receita registrada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateRevenueData) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      
      const { id, ...updateData } = data;
      
      const { error } = await supabase
        .from("financial_revenues")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;

      // Audit log
      await supabase.from("financial_audit_log").insert({
        user_id: effectiveUserId,
        entity_type: "revenue",
        entity_id: id,
        action: "update",
        after_json: updateData,
        reason: "Receita atualizada",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-revenues"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success("Receita atualizada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!effectiveUserId) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("financial_revenues")
        .delete()
        .eq("id", id);
      
      if (error) throw error;

      // Audit log
      await supabase.from("financial_audit_log").insert([{
        user_id: effectiveUserId,
        entity_type: "revenue",
        entity_id: id,
        action: "delete",
        reason: "Receita excluída",
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-revenues"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
      toast.success("Receita excluída!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  // Calculate totals and ROI
  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.revenue_amount), 0);
  const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;
  const roas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;

  return { 
    revenues, 
    plans,
    isLoading,
    totalRevenue,
    totalInvestment,
    roi,
    roas,
    createRevenue: createMutation.mutate,
    updateRevenue: updateMutation.mutate,
    deleteRevenue: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
