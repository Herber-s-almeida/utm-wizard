import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, isBefore, startOfMonth, endOfMonth } from "date-fns";

export interface FinanceAlert {
  id: string;
  type: "overspend" | "underspend" | "overdue" | "variance" | "due_soon";
  level: "info" | "warning" | "error";
  message: string;
  planId?: string;
  entityId?: string;
  entityType?: string;
  value?: number;
  threshold?: number;
  createdAt: string;
}

interface AlertConfig {
  alert_type: string;
  threshold_percentage: number | null;
  threshold_days: number | null;
  is_active: boolean;
}

/**
 * Get all active alerts for the current user
 */
export async function getActiveAlerts(userId: string): Promise<FinanceAlert[]> {
  const alerts: FinanceAlert[] = [];

  try {
    // Get user's alert configs
    const { data: configs } = await supabase
      .from("financial_alert_configs")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const alertConfigs = configs || [];

    // Run all checks in parallel
    const [overdueAlerts, pacingAlerts, dueSoonAlerts] = await Promise.all([
      checkOverduePayments(alertConfigs),
      checkPacingVariance(alertConfigs),
      checkDueSoonPayments(alertConfigs),
    ]);

    alerts.push(...overdueAlerts, ...pacingAlerts, ...dueSoonAlerts);
  } catch (error) {
    console.error("Error getting alerts:", error);
  }

  // Sort by level (error first)
  return alerts.sort((a, b) => {
    const levelOrder = { error: 0, warning: 1, info: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  });
}

/**
 * Check for overdue payments
 */
async function checkOverduePayments(configs: AlertConfig[]): Promise<FinanceAlert[]> {
  const alerts: FinanceAlert[] = [];
  const today = new Date().toISOString().split('T')[0];

  const overdueConfig = configs.find(c => c.alert_type === "overdue");
  if (!overdueConfig) {
    // Use default behavior
  }

  try {
    const { data: overduePayments, error } = await supabase
      .from("financial_payments")
      .select(`
        id,
        planned_payment_date,
        planned_amount,
        financial_documents (
          id,
          media_plan_id,
          vendor_name,
          document_number
        )
      `)
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
      const vendorName = doc?.vendor_name || "Fornecedor";
      const docNumber = doc?.document_number ? ` #${doc.document_number}` : "";

      alerts.push({
        id: `overdue-${payment.id}`,
        type: "overdue",
        level: daysOverdue > 7 ? "error" : "warning",
        message: `Pagamento atrasado há ${daysOverdue} dia(s): ${vendorName}${docNumber}`,
        planId: doc?.media_plan_id,
        entityId: payment.id,
        entityType: "payment",
        value: Number(payment.planned_amount),
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error in checkOverduePayments:", error);
  }

  return alerts;
}

/**
 * Check for pacing variance (overspend/underspend)
 */
async function checkPacingVariance(configs: AlertConfig[]): Promise<FinanceAlert[]> {
  const alerts: FinanceAlert[] = [];

  const overspendConfig = configs.find(c => c.alert_type === "overspend");
  const underspendConfig = configs.find(c => c.alert_type === "underspend");

  if (!overspendConfig && !underspendConfig) {
    return alerts;
  }

  const overspendThreshold = overspendConfig?.threshold_percentage || 10;
  const underspendThreshold = underspendConfig?.threshold_percentage || 10;

  try {
    // Get current month boundaries
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString().split('T')[0];
    const monthEnd = endOfMonth(now).toISOString().split('T')[0];

    // Get forecasts and actuals for current month
    const [forecastsResult, actualsResult] = await Promise.all([
      supabase
        .from("financial_forecasts")
        .select("media_plan_id, planned_amount")
        .gte("period_start", monthStart)
        .lte("period_end", monthEnd),
      supabase
        .from("financial_actuals")
        .select("media_plan_id, actual_amount")
        .gte("period_start", monthStart)
        .lte("period_end", monthEnd),
    ]);

    const forecasts = forecastsResult.data || [];
    const actuals = actualsResult.data || [];

    // Group by plan
    const planData: Record<string, { planned: number; actual: number }> = {};

    for (const f of forecasts) {
      if (!planData[f.media_plan_id]) {
        planData[f.media_plan_id] = { planned: 0, actual: 0 };
      }
      planData[f.media_plan_id].planned += Number(f.planned_amount);
    }

    for (const a of actuals) {
      if (!planData[a.media_plan_id]) {
        planData[a.media_plan_id] = { planned: 0, actual: 0 };
      }
      planData[a.media_plan_id].actual += Number(a.actual_amount);
    }

    // Check each plan
    for (const [planId, data] of Object.entries(planData)) {
      if (data.planned === 0) continue;

      const variance = ((data.actual - data.planned) / data.planned) * 100;

      if (overspendConfig && variance > overspendThreshold) {
        alerts.push({
          id: `overspend-${planId}`,
          type: "overspend",
          level: variance > overspendThreshold * 2 ? "error" : "warning",
          message: `Plano com gastos ${variance.toFixed(1)}% acima do planejado neste mês`,
          planId,
          entityType: "plan",
          value: variance,
          threshold: overspendThreshold,
          createdAt: new Date().toISOString(),
        });
      }

      if (underspendConfig && variance < -underspendThreshold) {
        // Only alert for underspend if we're past mid-month
        const dayOfMonth = now.getDate();
        const daysInMonth = endOfMonth(now).getDate();
        
        if (dayOfMonth > daysInMonth / 2) {
          alerts.push({
            id: `underspend-${planId}`,
            type: "underspend",
            level: "warning",
            message: `Plano com gastos ${Math.abs(variance).toFixed(1)}% abaixo do planejado neste mês`,
            planId,
            entityType: "plan",
            value: variance,
            threshold: underspendThreshold,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in checkPacingVariance:", error);
  }

  return alerts;
}

/**
 * Check for payments due soon (next 7 days)
 */
async function checkDueSoonPayments(configs: AlertConfig[]): Promise<FinanceAlert[]> {
  const alerts: FinanceAlert[] = [];
  
  const today = new Date();
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const in7DaysStr = in7Days.toISOString().split('T')[0];

  try {
    const { data: upcomingPayments, error } = await supabase
      .from("financial_payments")
      .select(`
        id,
        planned_payment_date,
        planned_amount,
        financial_documents (
          id,
          media_plan_id,
          vendor_name
        )
      `)
      .gte("planned_payment_date", todayStr)
      .lte("planned_payment_date", in7DaysStr)
      .eq("status", "scheduled")
      .is("deleted_at", null);

    if (error) {
      console.error("Error checking upcoming payments:", error);
      return alerts;
    }

    // Group by day
    const paymentsByDay: Record<string, number> = {};
    let totalAmount = 0;

    for (const payment of upcomingPayments || []) {
      const date = payment.planned_payment_date;
      paymentsByDay[date] = (paymentsByDay[date] || 0) + Number(payment.planned_amount);
      totalAmount += Number(payment.planned_amount);
    }

    if (totalAmount > 0) {
      const paymentCount = upcomingPayments?.length || 0;
      alerts.push({
        id: `due-soon-summary`,
        type: "due_soon",
        level: "info",
        message: `${paymentCount} pagamento(s) nos próximos 7 dias: R$ ${totalAmount.toLocaleString("pt-BR")}`,
        entityType: "payment",
        value: totalAmount,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error in checkDueSoonPayments:", error);
  }

  return alerts;
}
