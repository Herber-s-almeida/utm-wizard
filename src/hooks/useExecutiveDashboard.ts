import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { format, parseISO } from 'date-fns';

interface MediaLine {
  id: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  medium_id: string | null;
  vehicle_id: string | null;
  channel_id: string | null;
  funnel_stage_id: string | null;
  media_plan_id: string;
}

interface MediaPlan {
  id: string;
  name: string;
  client: string | null;
  campaign: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number | null;
  status: string | null;
}

interface Medium {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  name: string;
  medium_id: string | null;
}

interface Channel {
  id: string;
  name: string;
  vehicle_id: string;
}

interface FunnelStage {
  id: string;
  name: string;
  slug: string | null;
  order_index: number;
}

export interface MonthlyData {
  month: string;
  monthLabel: string;
  total: number;
}

export interface MediaBreakdown {
  name: string;
  value: number;
  percentage: number;
}

export interface FunnelBreakdown {
  name: string;
  value: number;
  percentage: number;
  order: number;
}

export interface PlanSummary {
  id: string;
  name: string;
  client: string | null;
  campaign: string | null;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
}

export interface DashboardData {
  totalActivePlans: number;
  totalPlannedBudget: number;
  avgBudgetPerPlan: number;
  monthlyDistribution: MonthlyData[];
  mediaBreakdown: MediaBreakdown[];
  funnelBreakdown: FunnelBreakdown[];
  planSummaries: PlanSummary[];
}

interface MonthlyBudget {
  month_date: string;
  amount: number;
}

function calculateMonthlyDistribution(monthlyBudgets: MonthlyBudget[]): MonthlyData[] {
  const monthlyTotals: Record<string, number> = {};

  monthlyBudgets.forEach(mb => {
    const monthKey = format(parseISO(mb.month_date), 'yyyy-MM');
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + mb.amount;
  });

  return Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month,
      monthLabel: format(parseISO(`${month}-01`), 'MMM/yy'),
      total,
    }));
}

function calculateMediaBreakdown(
  lines: MediaLine[],
  mediums: Medium[],
  vehicles: Vehicle[]
): MediaBreakdown[] {
  const vehicleTotals: Record<string, number> = {};
  const vehicleNames: Record<string, string> = {};

  vehicles.forEach(v => {
    vehicleNames[v.id] = v.name;
  });

  lines.forEach(line => {
    if (!line.budget) return;
    
    const key = line.vehicle_id || 'unknown';
    vehicleTotals[key] = (vehicleTotals[key] || 0) + line.budget;
  });

  const total = Object.values(vehicleTotals).reduce((sum, val) => sum + val, 0);

  return Object.entries(vehicleTotals)
    .map(([id, value]) => ({
      name: vehicleNames[id] || 'Não definido',
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function calculateFunnelBreakdown(
  lines: MediaLine[],
  funnelStages: FunnelStage[]
): FunnelBreakdown[] {
  const funnelTotals: Record<string, number> = {};
  const funnelInfo: Record<string, { name: string; order: number }> = {};

  funnelStages.forEach(f => {
    funnelInfo[f.id] = { name: f.name, order: f.order_index };
  });

  lines.forEach(line => {
    if (!line.budget) return;
    
    const key = line.funnel_stage_id || 'unknown';
    funnelTotals[key] = (funnelTotals[key] || 0) + line.budget;
  });

  const total = Object.values(funnelTotals).reduce((sum, val) => sum + val, 0);

  return Object.entries(funnelTotals)
    .map(([id, value]) => ({
      name: funnelInfo[id]?.name || 'Não definido',
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      order: funnelInfo[id]?.order ?? 999,
    }))
    .sort((a, b) => a.order - b.order);
}

export function useExecutiveDashboard(statusFilter: string = 'active') {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ['executive-dashboard', effectiveUserId, statusFilter],
    queryFn: async (): Promise<DashboardData> => {
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      // First get plan IDs where user has a role (shared plans)
      const { data: sharedPlanRoles } = await supabase
        .from('plan_roles')
        .select('media_plan_id')
        .eq('user_id', effectiveUserId);
      
      const sharedPlanIds = sharedPlanRoles?.map(r => r.media_plan_id) || [];

      // Fetch plans owned by user
      let ownedPlansQuery = supabase
        .from('media_plans')
        .select('*')
        .eq('user_id', effectiveUserId)
        .is('deleted_at', null);

      if (statusFilter === 'active') {
        ownedPlansQuery = ownedPlansQuery.eq('status', 'active');
      } else if (statusFilter === 'finished') {
        ownedPlansQuery = ownedPlansQuery.eq('status', 'finished');
      } else if (statusFilter === 'draft') {
        ownedPlansQuery = ownedPlansQuery.eq('status', 'draft');
      }
      // 'all' = no status filter

      const { data: ownedPlans, error: ownedError } = await ownedPlansQuery;
      if (ownedError) throw ownedError;

      // Fetch shared plans if any
      let sharedPlans: typeof ownedPlans = [];
      if (sharedPlanIds.length > 0) {
        let sharedPlansQuery = supabase
          .from('media_plans')
          .select('*')
          .in('id', sharedPlanIds)
          .is('deleted_at', null);

        if (statusFilter === 'active') {
          sharedPlansQuery = sharedPlansQuery.eq('status', 'active');
        } else if (statusFilter === 'finished') {
          sharedPlansQuery = sharedPlansQuery.eq('status', 'finished');
        } else if (statusFilter === 'draft') {
          sharedPlansQuery = sharedPlansQuery.eq('status', 'draft');
        }

        const { data: sharedData, error: sharedError } = await sharedPlansQuery;
        if (sharedError) throw sharedError;
        sharedPlans = sharedData || [];
      }

      // Combine and deduplicate plans
      const allPlansMap = new Map<string, typeof ownedPlans extends (infer T)[] ? T : never>();
      (ownedPlans || []).forEach(p => allPlansMap.set(p.id, p));
      (sharedPlans || []).forEach(p => allPlansMap.set(p.id, p));
      const plans = Array.from(allPlansMap.values());

      const planIds = plans.map(p => p.id);

      if (planIds.length === 0) {
        return {
          totalActivePlans: 0,
          totalPlannedBudget: 0,
          avgBudgetPerPlan: 0,
          monthlyDistribution: [],
          mediaBreakdown: [],
          funnelBreakdown: [],
          planSummaries: [],
        };
      }

      // Fetch media lines for these plans
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select('*')
        .in('media_plan_id', planIds);
      if (linesError) throw linesError;

      const lineIds = lines?.map(l => l.id) || [];

      // Fetch monthly budgets from media_line_monthly_budgets
      let monthlyBudgets: MonthlyBudget[] = [];
      if (lineIds.length > 0) {
        const { data: budgetsData, error: budgetsError } = await supabase
          .from('media_line_monthly_budgets')
          .select('month_date, amount')
          .in('media_line_id', lineIds);
        if (budgetsError) throw budgetsError;
        monthlyBudgets = budgetsData || [];
      }

      // Fetch reference data - get all user IDs from plans to fetch their config data
      const planOwnerIds = [...new Set(plans.map(p => p.user_id))];
      
      const [
        { data: mediums },
        { data: vehicles },
        { data: funnelStages },
      ] = await Promise.all([
        supabase.from('mediums').select('id, name').in('user_id', planOwnerIds).is('deleted_at', null),
        supabase.from('vehicles').select('id, name, medium_id').in('user_id', planOwnerIds).is('deleted_at', null),
        supabase.from('funnel_stages').select('id, name, slug, order_index').in('user_id', planOwnerIds).is('deleted_at', null),
      ]);

      // Calculate metrics
      const totalPlannedBudget = plans?.reduce((sum, p) => sum + (p.total_budget || 0), 0) || 0;

      // Calculate plan summaries
      const planSummaries: PlanSummary[] = (plans || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        client: plan.client,
        campaign: plan.campaign,
        startDate: plan.start_date,
        endDate: plan.end_date,
        totalBudget: plan.total_budget || 0,
      }));

      return {
        totalActivePlans: plans?.length || 0,
        totalPlannedBudget,
        avgBudgetPerPlan: plans?.length ? totalPlannedBudget / plans.length : 0,
        monthlyDistribution: calculateMonthlyDistribution(monthlyBudgets),
        mediaBreakdown: calculateMediaBreakdown(lines || [], mediums || [], vehicles || []),
        funnelBreakdown: calculateFunnelBreakdown(lines || [], funnelStages || []),
        planSummaries,
      };
    },
    enabled: !!effectiveUserId,
  });
}
