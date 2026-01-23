import { supabase } from "@/integrations/supabase/client";
import { addDays, addWeeks, addMonths, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from "date-fns";

type Granularity = "day" | "week" | "month";

interface MediaPlan {
  id: string;
  start_date: string;
  end_date: string;
  total_budget: number;
}

interface MediaLine {
  id: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  subdivision_id: string | null;
  funnel_stage_id: string | null;
  vehicle_id: string | null;
  channel_id: string | null;
  medium_id: string | null;
  moment_id: string | null;
}

interface ForecastPeriod {
  period_start: string;
  period_end: string;
  planned_amount: number;
  dimensions_json: Record<string, string | null>;
}

/**
 * Generates forecast periods from a media plan
 */
export async function generateForecastFromPlan(
  planId: string,
  granularity: Granularity,
  userId: string,
  environmentId: string
): Promise<{ success: boolean; message: string; periodsCreated: number }> {
  try {
    // 1. Fetch media plan
    const { data: plan, error: planError } = await supabase
      .from("media_plans")
      .select("id, start_date, end_date, total_budget")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return { success: false, message: "Plano não encontrado", periodsCreated: 0 };
    }

    if (!plan.start_date || !plan.end_date) {
      return { success: false, message: "Plano sem datas definidas", periodsCreated: 0 };
    }

    // 2. Fetch media lines
    const { data: lines, error: linesError } = await supabase
      .from("media_lines")
      .select("id, budget, start_date, end_date, subdivision_id, funnel_stage_id, vehicle_id, channel_id, medium_id, moment_id")
      .eq("media_plan_id", planId)
      .is("deleted_at", null);

    if (linesError) {
      return { success: false, message: "Erro ao buscar linhas de mídia", periodsCreated: 0 };
    }

    // 3. Get next version number
    const { data: existingForecasts } = await supabase
      .from("financial_forecasts")
      .select("version")
      .eq("media_plan_id", planId)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = (existingForecasts?.[0]?.version || 0) + 1;

    // 4. Generate periods
    const periods = generatePeriods(plan, lines || [], granularity);

    if (periods.length === 0) {
      return { success: false, message: "Nenhum período gerado", periodsCreated: 0 };
    }

    // 5. Delete existing unlocked forecasts for this plan and granularity
    await supabase
      .from("financial_forecasts")
      .delete()
      .eq("media_plan_id", planId)
      .eq("granularity", granularity)
      .eq("is_locked", false);

    // 6. Insert new forecasts
    const forecastsToInsert = periods.map(period => ({
      user_id: userId,
      environment_id: environmentId,
      media_plan_id: planId,
      version: nextVersion,
      granularity,
      period_start: period.period_start,
      period_end: period.period_end,
      planned_amount: period.planned_amount,
      dimensions_json: period.dimensions_json,
      source: "derived_from_plan",
      is_locked: false,
    }));

    const { error: insertError } = await supabase
      .from("financial_forecasts")
      .insert(forecastsToInsert);

    if (insertError) {
      return { success: false, message: "Erro ao salvar forecast: " + insertError.message, periodsCreated: 0 };
    }

    // 7. Create audit log
    await supabase.from("financial_audit_log").insert({
      user_id: userId,
      entity_type: "forecast",
      entity_id: planId,
      action: "create",
      after_json: { version: nextVersion, periods_count: periods.length, granularity },
      reason: `Forecast gerado automaticamente do plano (v${nextVersion})`,
    });

    return { 
      success: true, 
      message: `Forecast v${nextVersion} gerado com ${periods.length} períodos`, 
      periodsCreated: periods.length 
    };
  } catch (error) {
    console.error("Error generating forecast:", error);
    return { success: false, message: "Erro inesperado ao gerar forecast", periodsCreated: 0 };
  }
}

/**
 * Generate periods based on granularity
 */
function generatePeriods(
  plan: MediaPlan,
  lines: MediaLine[],
  granularity: Granularity
): ForecastPeriod[] {
  const startDate = new Date(plan.start_date);
  const endDate = new Date(plan.end_date);
  const totalBudget = plan.total_budget || 0;
  
  // Calculate total lines budget
  const linesBudget = lines.reduce((sum, line) => sum + (line.budget || 0), 0);
  
  // Use lines budget if available, otherwise use plan total
  const budgetToDistribute = linesBudget > 0 ? linesBudget : totalBudget;

  const periods: ForecastPeriod[] = [];
  let currentStart = getStartOfPeriod(startDate, granularity);
  
  // Count total periods for equal distribution
  let totalPeriods = 0;
  let tempStart = new Date(currentStart);
  while (tempStart <= endDate) {
    totalPeriods++;
    tempStart = getNextPeriodStart(tempStart, granularity);
  }

  if (totalPeriods === 0) return [];

  const amountPerPeriod = budgetToDistribute / totalPeriods;

  // Generate each period
  while (currentStart <= endDate) {
    const periodEnd = getEndOfPeriod(currentStart, granularity);
    const actualEnd = periodEnd > endDate ? endDate : periodEnd;

    // Aggregate dimensions from lines that overlap with this period
    const overlappingLines = lines.filter(line => {
      const lineStart = line.start_date ? new Date(line.start_date) : startDate;
      const lineEnd = line.end_date ? new Date(line.end_date) : endDate;
      return lineStart <= actualEnd && lineEnd >= currentStart;
    });

    // For simplicity, use first overlapping line's dimensions
    const dimensions = overlappingLines.length > 0 
      ? {
          subdivision_id: overlappingLines[0].subdivision_id,
          funnel_stage_id: overlappingLines[0].funnel_stage_id,
          vehicle_id: overlappingLines[0].vehicle_id,
          channel_id: overlappingLines[0].channel_id,
          medium_id: overlappingLines[0].medium_id,
          moment_id: overlappingLines[0].moment_id,
        }
      : {};

    periods.push({
      period_start: currentStart.toISOString().split('T')[0],
      period_end: actualEnd.toISOString().split('T')[0],
      planned_amount: Math.round(amountPerPeriod * 100) / 100,
      dimensions_json: dimensions,
    });

    currentStart = getNextPeriodStart(currentStart, granularity);
  }

  return periods;
}

function getStartOfPeriod(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 }); // Monday
    case "month":
      return startOfMonth(date);
  }
}

function getEndOfPeriod(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case "day":
      return endOfDay(date);
    case "week":
      return endOfWeek(date, { weekStartsOn: 1 });
    case "month":
      return endOfMonth(date);
  }
}

function getNextPeriodStart(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case "day":
      return addDays(date, 1);
    case "week":
      return addWeeks(date, 1);
    case "month":
      return addMonths(date, 1);
  }
}
