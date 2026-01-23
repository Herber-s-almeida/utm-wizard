import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, isAfter } from "date-fns";

export interface PacingData {
  period_start: string;
  period_end: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: "on_track" | "overspend" | "underspend" | "pending";
  hasActual: boolean;
}

export interface PacingAlert {
  id: string;
  type: "overspend" | "underspend" | "overdue" | "variance";
  level: "warning" | "error" | "info";
  message: string;
  planId: string;
  period?: string;
  value?: number;
  threshold?: number;
}

interface AlertConfig {
  alert_type: string;
  threshold_percentage: number | null;
  threshold_days: number | null;
  is_active: boolean;
}

/**
 * Calculate pacing for a plan
 */
export async function calculatePacing(
  planId: string,
  environmentId: string
): Promise<{ pacingData: PacingData[]; alerts: PacingAlert[] }> {
  try {
    // 1. Get locked forecasts
    const { data: forecasts, error: forecastError } = await supabase
      .from("financial_forecasts")
      .select("*")
      .eq("media_plan_id", planId)
      .eq("environment_id", environmentId)
      .order("period_start");

    if (forecastError) {
      console.error("Error fetching forecasts:", forecastError);
      return { pacingData: [], alerts: [] };
    }

    // 2. Get actuals
    const { data: actuals, error: actualsError } = await supabase
      .from("financial_actuals")
      .select("*")
      .eq("media_plan_id", planId)
      .eq("environment_id", environmentId);

    if (actualsError) {
      console.error("Error fetching actuals:", actualsError);
      return { pacingData: [], alerts: [] };
    }

    // 3. Get alert configs
    const { data: alertConfigs } = await supabase
      .from("financial_alert_configs")
      .select("*")
      .eq("environment_id", environmentId)
      .eq("is_active", true);

    const configs = alertConfigs || [];

    // 4. Calculate pacing for each forecast period
    const pacingData: PacingData[] = [];
    const alerts: PacingAlert[] = [];

    for (const forecast of forecasts || []) {
      const matchingActual = actuals?.find(a => 
        a.period_start === forecast.period_start && 
        a.period_end === forecast.period_end
      );

      const planned = Number(forecast.planned_amount);
      const actual = matchingActual ? Number(matchingActual.actual_amount) : 0;
      const variance = actual - planned;
      const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;
      const hasActual = !!matchingActual;

      let status: PacingData["status"] = "pending";
      if (hasActual) {
        if (variancePercent > 10) {
          status = "overspend";
        } else if (variancePercent < -10) {
          status = "underspend";
        } else {
          status = "on_track";
        }
      }

      pacingData.push({
        period_start: forecast.period_start,
        period_end: forecast.period_end,
        planned,
        actual,
        variance,
        variancePercent,
        status,
        hasActual,
      });

      // Generate alerts based on configs
      if (hasActual) {
        const overspendConfig = configs.find(c => c.alert_type === "overspend");
        if (overspendConfig && variancePercent > (overspendConfig.threshold_percentage || 10)) {
          alerts.push({
            id: `overspend-${forecast.id}`,
            type: "overspend",
            level: "error",
            message: `Período ${forecast.period_start}: gastos ${variancePercent.toFixed(1)}% acima do planejado`,
            planId,
            period: forecast.period_start,
            value: variancePercent,
            threshold: overspendConfig.threshold_percentage || 10,
          });
        }

        const underspendConfig = configs.find(c => c.alert_type === "underspend");
        if (underspendConfig && variancePercent < -(underspendConfig.threshold_percentage || 10)) {
          // Check if enough time has passed (using threshold_days)
          const today = new Date();
          const periodEnd = parseISO(forecast.period_end);
          if (isAfter(today, periodEnd)) {
            alerts.push({
              id: `underspend-${forecast.id}`,
              type: "underspend",
              level: "warning",
              message: `Período ${forecast.period_start}: gastos ${Math.abs(variancePercent).toFixed(1)}% abaixo do planejado`,
              planId,
              period: forecast.period_start,
              value: variancePercent,
              threshold: underspendConfig.threshold_percentage || 10,
            });
          }
        }
      }
    }

    return { pacingData, alerts };
  } catch (error) {
    console.error("Error calculating pacing:", error);
    return { pacingData: [], alerts: [] };
  }
}

/**
 * Check for overdue payments and generate alerts
 */
export async function checkOverduePayments(environmentId: string): Promise<PacingAlert[]> {
  const alerts: PacingAlert[] = [];
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: overduePayments, error } = await supabase
      .from("financial_payments")
      .select("*, financial_documents(media_plan_id, vendor_name)")
      .eq("environment_id", environmentId)
      .lt("planned_payment_date", today)
      .in("status", ["scheduled", "overdue"])
      .is("deleted_at", null);

    if (error) {
      console.error("Error checking overdue payments:", error);
      return alerts;
    }

    for (const payment of overduePayments || []) {
      const daysOverdue = differenceInDays(new Date(), parseISO(payment.planned_payment_date));
      const doc = payment.financial_documents as any;
      
      alerts.push({
        id: `overdue-${payment.id}`,
        type: "overdue",
        level: daysOverdue > 7 ? "error" : "warning",
        message: `Pagamento atrasado há ${daysOverdue} dia(s): ${doc?.vendor_name || "Fornecedor"} - R$ ${Number(payment.planned_amount).toLocaleString("pt-BR")}`,
        planId: doc?.media_plan_id || "",
        value: Number(payment.planned_amount),
      });
    }
  } catch (error) {
    console.error("Error checking overdue:", error);
  }

  return alerts;
}

/**
 * Get summary of pacing across all plans
 */
export async function getPacingSummary(environmentId: string): Promise<{
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  variancePercent: number;
}> {
  try {
    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Get forecasts for current month
    const { data: forecasts } = await supabase
      .from("financial_forecasts")
      .select("planned_amount")
      .eq("environment_id", environmentId)
      .gte("period_start", monthStart)
      .lte("period_end", monthEnd);

    // Get actuals for current month
    const { data: actuals } = await supabase
      .from("financial_actuals")
      .select("actual_amount")
      .eq("environment_id", environmentId)
      .gte("period_start", monthStart)
      .lte("period_end", monthEnd);

    const totalPlanned = (forecasts || []).reduce((sum, f) => sum + Number(f.planned_amount), 0);
    const totalActual = (actuals || []).reduce((sum, a) => sum + Number(a.actual_amount), 0);
    const totalVariance = totalActual - totalPlanned;
    const variancePercent = totalPlanned > 0 ? (totalVariance / totalPlanned) * 100 : 0;

    return { totalPlanned, totalActual, totalVariance, variancePercent };
  } catch (error) {
    console.error("Error getting pacing summary:", error);
    return { totalPlanned: 0, totalActual: 0, totalVariance: 0, variancePercent: 0 };
  }
}
