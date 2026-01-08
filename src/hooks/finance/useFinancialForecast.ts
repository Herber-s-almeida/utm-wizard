import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { generateForecastFromPlan } from "@/utils/finance/forecastGenerator";

export function useFinancialForecast(planId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["media-plans-for-finance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_plans")
        .select("id, name, start_date, end_date, total_budget")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ["financial-forecasts", planId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from("financial_forecasts")
        .select("*")
        .eq("media_plan_id", planId)
        .order("period_start");
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!planId,
  });

  const generateMutation = useMutation({
    mutationFn: async ({ planId, granularity }: { planId: string; granularity: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      const result = await generateForecastFromPlan(
        planId, 
        granularity as "day" | "week" | "month", 
        user.id
      );
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["financial-forecasts"] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao gerar forecast");
    },
  });

  const lockMutation = useMutation({
    mutationFn: async ({ forecastId, lock }: { forecastId: string; lock: boolean }) => {
      const { error } = await supabase
        .from("financial_forecasts")
        .update({ is_locked: lock })
        .eq("id", forecastId);
      if (error) throw error;

      // Audit log
      if (user) {
        await supabase.from("financial_audit_log").insert({
          user_id: user.id,
          entity_type: "forecast",
          entity_id: forecastId,
          action: lock ? "lock" : "unlock",
          after_json: { is_locked: lock },
          reason: lock ? "Forecast travado" : "Forecast destravado",
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["financial-forecasts"] });
      toast.success(variables.lock ? "Forecast travado!" : "Forecast destravado!");
    },
  });

  return {
    forecasts,
    plans,
    isLoading,
    generateForecast: generateMutation.mutate,
    lockForecast: lockMutation.mutate,
    isGenerating: generateMutation.isPending,
  };
}
