import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error("Plano não encontrado");
      toast.success("Forecast gerado com sucesso!");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financial-forecasts"] }),
  });

  const lockMutation = useMutation({
    mutationFn: async ({ forecastId, lock }: { forecastId: string; lock: boolean }) => {
      const { error } = await supabase
        .from("financial_forecasts")
        .update({ is_locked: lock })
        .eq("id", forecastId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-forecasts"] });
      toast.success("Status atualizado!");
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
