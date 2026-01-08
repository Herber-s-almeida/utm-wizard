import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getActiveAlerts, type FinanceAlert } from "@/utils/finance/alertsChecker";

export type { FinanceAlert };

export function useFinanceAlerts() {
  const { user } = useAuth();

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ["finance-alerts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return getActiveAlerts(user.id);
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  const criticalAlerts = alerts.filter((a: FinanceAlert) => a.level === 'error');
  const warningAlerts = alerts.filter((a: FinanceAlert) => a.level === 'warning');
  const infoAlerts = alerts.filter((a: FinanceAlert) => a.level === 'info');

  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    isLoading,
    refetch,
    hasAlerts: alerts.length > 0,
    criticalCount: criticalAlerts.length,
    warningCount: warningAlerts.length,
  };
}
