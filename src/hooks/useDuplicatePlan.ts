import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DuplicatePlanOptions {
  planId: string;
  newName: string;
  includeCreatives: boolean;
}

export function useDuplicatePlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { mutateAsync: duplicatePlan, isPending } = useMutation({
    mutationFn: async ({ planId, newName, includeCreatives }: DuplicatePlanOptions) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Fetch original plan
      const { data: originalPlan, error: planError } = await supabase
        .from('media_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // 2. Fetch all budget distributions
      const { data: distributions, error: distError } = await supabase
        .from('plan_budget_distributions')
        .select('*')
        .eq('media_plan_id', planId);

      if (distError) throw distError;

      // 3. Fetch all media lines
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select('*')
        .eq('media_plan_id', planId);

      if (linesError) throw linesError;

      // 4. Fetch all monthly budgets
      const lineIds = lines?.map(l => l.id) || [];
      let monthlyBudgets: any[] = [];
      if (lineIds.length > 0) {
        const { data: budgets, error: budgetsError } = await supabase
          .from('media_line_monthly_budgets')
          .select('*')
          .in('media_line_id', lineIds);

        if (budgetsError) throw budgetsError;
        monthlyBudgets = budgets || [];
      }

      // 5. If includeCreatives, fetch all creatives
      let creatives: any[] = [];
      if (includeCreatives && lineIds.length > 0) {
        const { data: creativesData, error: creativesError } = await supabase
          .from('media_creatives')
          .select('*')
          .in('media_line_id', lineIds);

        if (creativesError) throw creativesError;
        creatives = creativesData || [];
      }

      // 6. Create new plan (preserve hierarchy_order)
      const { data: newPlan, error: newPlanError } = await supabase
        .from('media_plans')
        .insert({
          user_id: user.id,
          name: newName,
          client: originalPlan.client,
          campaign: originalPlan.campaign,
          start_date: originalPlan.start_date,
          end_date: originalPlan.end_date,
          total_budget: originalPlan.total_budget,
          objectives: originalPlan.objectives,
          kpis: originalPlan.kpis,
          default_url: originalPlan.default_url,
          hierarchy_order: originalPlan.hierarchy_order, // Preserve hierarchy order
          status: 'draft',
        })
        .select()
        .single();

      if (newPlanError) throw newPlanError;

      const newPlanId = newPlan.id;
      const distributionIdMap = new Map<string, string>();
      const lineIdMap = new Map<string, string>();

      // 7. Create distributions in order (parent first)
      // Sort: those without parent first, then by parent
      const sortedDistributions = [...(distributions || [])].sort((a, b) => {
        if (!a.parent_distribution_id && b.parent_distribution_id) return -1;
        if (a.parent_distribution_id && !b.parent_distribution_id) return 1;
        return 0;
      });

      // Process in batches by depth level
      const processedIds = new Set<string>();
      let remaining = sortedDistributions;

      while (remaining.length > 0) {
        const toProcess = remaining.filter(d => 
          !d.parent_distribution_id || processedIds.has(d.parent_distribution_id)
        );

        if (toProcess.length === 0) break; // Avoid infinite loop

        for (const dist of toProcess) {
          const newParentId = dist.parent_distribution_id 
            ? distributionIdMap.get(dist.parent_distribution_id) 
            : null;

          const { data: newDist, error: distInsertError } = await supabase
            .from('plan_budget_distributions')
            .insert({
              media_plan_id: newPlanId,
              user_id: user.id,
              distribution_type: dist.distribution_type,
              reference_id: dist.reference_id,
              parent_distribution_id: newParentId,
              percentage: dist.percentage,
              amount: dist.amount,
              temporal_date: dist.temporal_date,
              temporal_period: dist.temporal_period,
              start_date: dist.start_date,
              end_date: dist.end_date,
            })
            .select()
            .single();

          if (distInsertError) throw distInsertError;

          distributionIdMap.set(dist.id, newDist.id);
          processedIds.add(dist.id);
        }

        remaining = remaining.filter(d => !processedIds.has(d.id));
      }

      // 8. Create media lines
      for (const line of lines || []) {
        const { data: newLine, error: lineInsertError } = await supabase
          .from('media_lines')
          .insert({
            media_plan_id: newPlanId,
            user_id: user.id,
            platform: line.platform,
            format: line.format,
            objective: line.objective,
            placement: line.placement,
            start_date: line.start_date,
            end_date: line.end_date,
            budget: line.budget,
            percentage_of_plan: line.percentage_of_plan,
            budget_allocation: line.budget_allocation,
            funnel_stage: line.funnel_stage,
            funnel_stage_id: line.funnel_stage_id,
            medium_id: line.medium_id,
            vehicle_id: line.vehicle_id,
            channel_id: line.channel_id,
            target_id: line.target_id,
            subdivision_id: line.subdivision_id,
            moment_id: line.moment_id,
            status_id: line.status_id,
            creative_template_id: line.creative_template_id,
            line_code: line.line_code, // Preserve line_code
            utm_source: line.utm_source,
            utm_medium: line.utm_medium,
            utm_campaign: line.utm_campaign,
            utm_content: line.utm_content,
            utm_term: line.utm_term,
            destination_url: line.destination_url,
            notes: line.notes,
          })
          .select()
          .single();

        if (lineInsertError) throw lineInsertError;

        lineIdMap.set(line.id, newLine.id);
      }

      // 9. Create monthly budgets
      for (const budget of monthlyBudgets) {
        const newLineId = lineIdMap.get(budget.media_line_id);
        if (!newLineId) continue;

        const { error: budgetInsertError } = await supabase
          .from('media_line_monthly_budgets')
          .insert({
            media_line_id: newLineId,
            user_id: user.id,
            month_date: budget.month_date,
            amount: budget.amount,
          });

        if (budgetInsertError) throw budgetInsertError;
      }

      // 10. If includeCreatives, create creatives
      if (includeCreatives) {
        for (const creative of creatives) {
          const newLineId = lineIdMap.get(creative.media_line_id);
          if (!newLineId) continue;

          const { error: creativeInsertError } = await supabase
            .from('media_creatives')
            .insert({
              media_line_id: newLineId,
              user_id: user.id,
              name: creative.name,
              creative_type: creative.creative_type,
              format_id: creative.format_id,
              copy_text: creative.copy_text,
              asset_url: creative.asset_url,
              notes: creative.notes,
              production_status: creative.production_status,
              piece_link: creative.piece_link,
              opening_date: creative.opening_date,
              received_date: creative.received_date,
              approved_date: creative.approved_date,
            });

          if (creativeInsertError) throw creativeInsertError;
        }
      }

      return { id: newPlanId, slug: newPlan.slug };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media_plans'] });
    },
    onError: (error) => {
      console.error('Error duplicating plan:', error);
      toast.error('Erro ao duplicar plano');
    },
  });

  return { duplicatePlan, isPending };
}
