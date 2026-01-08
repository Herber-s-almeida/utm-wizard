import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useFinancialAudit() {
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["financial-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { logs, isLoading };
}
