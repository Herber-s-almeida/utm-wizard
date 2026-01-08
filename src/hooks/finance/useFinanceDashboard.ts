import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FinanceDashboardData } from "@/types/finance";

export function useFinanceDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["finance-dashboard", user?.id],
    queryFn: async (): Promise<FinanceDashboardData> => {
      // Return empty data for now - will be populated when data exists
      return {
        plannedThisMonth: 0,
        actualThisMonth: 0,
        variance: 0,
        variancePercentage: 0,
        payableNext30Days: 0,
        paidLast30Days: 0,
        overduePayments: 0,
        pacingData: [],
        alerts: [],
      };
    },
    enabled: !!user,
  });
}
