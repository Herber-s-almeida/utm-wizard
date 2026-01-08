import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export function useFinancialAlertConfigs() {
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["financial-alert-configs", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_alert_configs")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("alert_type");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, isActive, thresholdPercentage }: { id: string; isActive?: boolean; thresholdPercentage?: number }) => {
      const updates: Record<string, unknown> = {};
      if (isActive !== undefined) updates.is_active = isActive;
      if (thresholdPercentage !== undefined) updates.threshold_percentage = thresholdPercentage;
      
      const { error } = await supabase
        .from("financial_alert_configs")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financial-alert-configs"] }),
  });

  return { configs, isLoading, updateConfig: updateMutation.mutate };
}
