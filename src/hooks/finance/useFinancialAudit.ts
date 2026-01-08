import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export function useFinancialAudit() {
  const effectiveUserId = useEffectiveUserId();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["financial-audit-logs", effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_audit_log")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  return { logs, isLoading };
}
