import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useFinancialActuals(planId?: string) {
  const { user } = useAuth();

  const { data: plans = [] } = useQuery({
    queryKey: ["media-plans-for-finance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_plans")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: actuals = [], isLoading: actualsLoading } = useQuery({
    queryKey: ["financial-actuals", planId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from("financial_actuals")
        .select("*")
        .eq("media_plan_id", planId)
        .order("period_start");
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!planId,
  });

  const { data: forecasts = [] } = useQuery({
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

  return { actuals, forecasts, plans, isLoading: actualsLoading };
}
