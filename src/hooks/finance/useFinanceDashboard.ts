import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { getActiveAlerts } from "@/utils/finance/alertsChecker";
import { startOfMonth, endOfMonth, subDays, addDays } from "date-fns";

interface DashboardData {
  plannedThisMonth: number;
  actualThisMonth: number;
  variance: number;
  variancePercentage: number;
  payableNext30Days: number;
  paidLast30Days: number;
  overduePayments: number;
  pacingData: { period: string; planned: number; actual: number }[];
  alerts: { id: string; message: string; level: "info" | "warning" | "error" }[];
}

export function useFinanceDashboard() {
  const { currentEnvironmentId } = useEnvironment();

  return useQuery({
    queryKey: ["finance-dashboard", currentEnvironmentId],
    queryFn: async (): Promise<DashboardData> => {
      if (!currentEnvironmentId) throw new Error("Ambiente não selecionado");

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString().split('T')[0];
      const monthEnd = endOfMonth(now).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      const in30Days = addDays(now, 30).toISOString().split('T')[0];
      const thirtyDaysAgo = subDays(now, 30).toISOString().split('T')[0];

      // Parallel queries
      const [
        forecastsResult,
        actualsResult,
        payableResult,
        paidResult,
        overdueResult,
        pacingResult,
        alertsData,
      ] = await Promise.all([
        // Forecasts this month
        supabase
          .from("financial_forecasts")
          .select("planned_amount")
          .eq("environment_id", currentEnvironmentId)
          .gte("period_start", monthStart)
          .lte("period_end", monthEnd),
        
        // Actuals this month
        supabase
          .from("financial_actuals")
          .select("actual_amount")
          .eq("environment_id", currentEnvironmentId)
          .gte("period_start", monthStart)
          .lte("period_end", monthEnd),
        
        // Payable next 30 days
        supabase
          .from("financial_payments")
          .select("planned_amount")
          .eq("environment_id", currentEnvironmentId)
          .gte("planned_payment_date", today)
          .lte("planned_payment_date", in30Days)
          .eq("status", "scheduled")
          .is("deleted_at", null),
        
        // Paid last 30 days
        supabase
          .from("financial_payments")
          .select("paid_amount")
          .eq("environment_id", currentEnvironmentId)
          .gte("actual_payment_date", thirtyDaysAgo)
          .eq("status", "paid")
          .is("deleted_at", null),
        
        // Overdue count
        supabase
          .from("financial_payments")
          .select("id", { count: "exact" })
          .eq("environment_id", currentEnvironmentId)
          .lt("planned_payment_date", today)
          .in("status", ["scheduled", "overdue"])
          .is("deleted_at", null),
        
        // Monthly pacing data (last 6 months)
        getPacingDataForChart(currentEnvironmentId),
        
        // Active alerts
        getActiveAlerts(currentEnvironmentId),
      ]);

      const plannedThisMonth = (forecastsResult.data || []).reduce(
        (sum, f) => sum + Number(f.planned_amount), 0
      );
      const actualThisMonth = (actualsResult.data || []).reduce(
        (sum, a) => sum + Number(a.actual_amount), 0
      );
      const variance = actualThisMonth - plannedThisMonth;
      const variancePercentage = plannedThisMonth > 0 
        ? (variance / plannedThisMonth) * 100 
        : 0;

      const payableNext30Days = (payableResult.data || []).reduce(
        (sum, p) => sum + Number(p.planned_amount), 0
      );
      const paidLast30Days = (paidResult.data || []).reduce(
        (sum, p) => sum + Number(p.paid_amount || 0), 0
      );

      return {
        plannedThisMonth,
        actualThisMonth,
        variance,
        variancePercentage,
        payableNext30Days,
        paidLast30Days,
        overduePayments: overdueResult.count || 0,
        pacingData: pacingResult,
        alerts: alertsData.map(a => ({
          id: a.id,
          message: a.message,
          level: a.level,
        })),
      };
    },
    enabled: !!currentEnvironmentId,
    refetchInterval: 60000, // Refresh every minute
  });
}

async function getPacingDataForChart(environmentId: string): Promise<{ period: string; planned: number; actual: number }[]> {
  const now = new Date();
  const results: { period: string; planned: number; actual: number }[] = [];

  // Get last 6 months of data
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = startOfMonth(monthDate).toISOString().split('T')[0];
    const monthEnd = endOfMonth(monthDate).toISOString().split('T')[0];

    const [forecastsResult, actualsResult] = await Promise.all([
      supabase
        .from("financial_forecasts")
        .select("planned_amount")
        .eq("environment_id", environmentId)
        .gte("period_start", monthStart)
        .lte("period_end", monthEnd),
      supabase
        .from("financial_actuals")
        .select("actual_amount")
        .eq("environment_id", environmentId)
        .gte("period_start", monthStart)
        .lte("period_end", monthEnd),
    ]);

    const planned = (forecastsResult.data || []).reduce(
      (sum, f) => sum + Number(f.planned_amount), 0
    );
    const actual = (actualsResult.data || []).reduce(
      (sum, a) => sum + Number(a.actual_amount), 0
    );

    results.push({
      period: monthStart,
      planned,
      actual,
    });
  }

  return results;
}
