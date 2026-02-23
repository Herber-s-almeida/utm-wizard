import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface PlanVersion {
  id: string;
  media_plan_id: string;
  version_number: number;
  snapshot_data: {
    plan: Record<string, unknown>;
    lines: Record<string, unknown>[];
    distributions?: Record<string, unknown>[];
    budget_distributions?: Record<string, unknown>[];
    monthly_budgets: Record<string, unknown>[];
    line_details?: Record<string, unknown>[];
    line_detail_items?: Record<string, unknown>[];
    line_detail_links?: Record<string, unknown>[];
  };
  change_log: string | null;
  created_by: string;
  created_at: string;
  is_active: boolean;
  is_auto_backup: boolean;
}

export function usePlanVersions(planId: string | undefined) {
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ['plan-versions', planId],
    queryFn: async () => {
      if (!planId) return [];

      const { data, error } = await supabase
        .from('media_plan_versions')
        .select('*')
        .eq('media_plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        snapshot_data: v.snapshot_data as PlanVersion['snapshot_data'],
      })) as PlanVersion[];
    },
    enabled: !!planId,
  });

  const createVersionMutation = useMutation({
    mutationFn: async ({ planId, changeLog }: { planId: string; changeLog?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc('create_plan_version_snapshot', {
        _plan_id: planId,
        _user_id: user.id,
        _change_log: changeLog || 'Versão salva manualmente',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-versions', planId] });
      toast.success('Versão salva com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating version:', error);
      toast.error('Erro ao salvar versão');
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (version: PlanVersion) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const snapshot = version.snapshot_data;

      // First, create a new version of current state before restoring
      await supabase.rpc('create_plan_version_snapshot', {
        _plan_id: planId,
        _user_id: user.id,
        _change_log: `Estado antes de restaurar versão ${version.version_number}`,
      });

      // Restore plan data (including hierarchy_order)
      const planData = snapshot.plan as Record<string, unknown>;
      const { error: planError } = await supabase
        .from('media_plans')
        .update({
          name: planData.name as string,
          client: planData.client as string | null,
          campaign: planData.campaign as string | null,
          start_date: planData.start_date as string | null,
          end_date: planData.end_date as string | null,
          total_budget: planData.total_budget as number,
          objectives: planData.objectives as string[] | null,
          kpis: planData.kpis as Json | null,
          hierarchy_order: planData.hierarchy_order as string[] | null,
        })
        .eq('id', planId);

      if (planError) throw planError;

      // Delete current lines and recreate from snapshot
      await supabase
        .from('media_lines')
        .delete()
        .eq('media_plan_id', planId);

      // Delete current budget distributions and recreate from snapshot
      await supabase
        .from('plan_budget_distributions')
        .delete()
        .eq('media_plan_id', planId);

      // Recreate budget distributions (support both old 'budget_distributions' and new 'distributions' keys)
      const distributions = snapshot.distributions || snapshot.budget_distributions || [];
      if (distributions.length > 0) {
        const distData = distributions.map(d => ({
          id: d.id as string,
          media_plan_id: planId,
          user_id: user.id,
          distribution_type: d.distribution_type as string,
          reference_id: d.reference_id as string | null,
          parent_distribution_id: d.parent_distribution_id as string | null,
          percentage: d.percentage as number,
          amount: d.amount as number,
          temporal_period: d.temporal_period as string | null,
          temporal_date: d.temporal_date as string | null,
        }));

        const { error: distError } = await supabase
          .from('plan_budget_distributions')
          .insert(distData);

        if (distError) throw distError;
      }

      // Recreate lines
      if (snapshot.lines && snapshot.lines.length > 0) {
        const lines = snapshot.lines.map(l => ({
          id: l.id as string,
          media_plan_id: planId,
          user_id: user.id,
          platform: l.platform as string,
          format: l.format as string | null,
          objective: l.objective as string | null,
          funnel_stage: l.funnel_stage as string,
          placement: l.placement as string | null,
          start_date: l.start_date as string | null,
          end_date: l.end_date as string | null,
          budget: l.budget as number,
          impressions: l.impressions as number,
          clicks: l.clicks as number,
          ctr: l.ctr as number,
          cpc: l.cpc as number,
          cpm: l.cpm as number,
          conversions: l.conversions as number,
          utm_source: l.utm_source as string | null,
          utm_medium: l.utm_medium as string | null,
          utm_campaign: l.utm_campaign as string | null,
          utm_content: l.utm_content as string | null,
          utm_term: l.utm_term as string | null,
          destination_url: l.destination_url as string | null,
          notes: l.notes as string | null,
          subdivision_id: l.subdivision_id as string | null,
          moment_id: l.moment_id as string | null,
          funnel_stage_id: l.funnel_stage_id as string | null,
          medium_id: l.medium_id as string | null,
          vehicle_id: l.vehicle_id as string | null,
          channel_id: l.channel_id as string | null,
          target_id: l.target_id as string | null,
          creative_template_id: l.creative_template_id as string | null,
          status_id: l.status_id as string | null,
          budget_allocation: l.budget_allocation as string,
          percentage_of_plan: l.percentage_of_plan as number,
          line_code: l.line_code as string | null,
        }));

        const { error: linesError } = await supabase
          .from('media_lines')
          .insert(lines);

        if (linesError) throw linesError;

        // Recreate monthly budgets
        if (snapshot.monthly_budgets && snapshot.monthly_budgets.length > 0) {
          const monthlyBudgets = snapshot.monthly_budgets.map(mb => ({
            id: mb.id as string,
            media_line_id: mb.media_line_id as string,
            user_id: user.id,
            month_date: mb.month_date as string,
            amount: mb.amount as number,
          }));

          await supabase
            .from('media_line_monthly_budgets')
            .insert(monthlyBudgets);
        }
      }

      // Restore line_details if present in snapshot
      // First delete existing line_details (cascade will handle items and links)
      await supabase
        .from('line_details')
        .delete()
        .eq('media_plan_id', planId!);

      if (snapshot.line_details && snapshot.line_details.length > 0) {
        const detailsData = snapshot.line_details.map(ld => ({
          id: ld.id as string,
          media_plan_id: planId!,
          user_id: user.id,
          detail_type_id: ld.detail_type_id as string | null,
          name: ld.name as string,
          description: ld.description as string | null,
        }));

        const { error: detailsError } = await supabase
          .from('line_details')
          .insert(detailsData);

        if (detailsError) throw detailsError;

        // Restore line_detail_items
        if (snapshot.line_detail_items && snapshot.line_detail_items.length > 0) {
          const itemsData = snapshot.line_detail_items.map(ldi => ({
            id: ldi.id as string,
            line_detail_id: ldi.line_detail_id as string,
            user_id: user.id,
            environment_id: ldi.environment_id as string | null,
            data: ldi.data as Json,
            format_id: ldi.format_id as string | null,
            creative_id: ldi.creative_id as string | null,
            status_id: ldi.status_id as string | null,
            period_start: ldi.period_start as string | null,
            period_end: ldi.period_end as string | null,
            days_of_week: ldi.days_of_week as string[] | null,
            total_gross: ldi.total_gross as number | null,
            total_net: ldi.total_net as number | null,
            total_insertions: ldi.total_insertions as number | null,
            sort_order: ldi.sort_order as number | null,
            is_active: ldi.is_active as boolean | null,
          }));

          await supabase
            .from('line_detail_items')
            .insert(itemsData);
        }

        // Restore line_detail_line_links
        if (snapshot.line_detail_links && snapshot.line_detail_links.length > 0) {
          const linksData = snapshot.line_detail_links.map(ldl => ({
            id: ldl.id as string,
            line_detail_id: ldl.line_detail_id as string,
            media_line_id: ldl.media_line_id as string,
            user_id: user.id,
            environment_id: ldl.environment_id as string | null,
            allocated_amount: ldl.allocated_amount as number | null,
            allocated_percentage: ldl.allocated_percentage as number | null,
            is_primary: ldl.is_primary as boolean | null,
          }));

          await supabase
            .from('line_detail_line_links')
            .insert(linksData);
        }
      }

      // Create a version after restore
      await supabase.rpc('create_plan_version_snapshot', {
        _plan_id: planId,
        _user_id: user.id,
        _change_log: `Restaurado para versão ${version.version_number}`,
      });

      return version;
    },
    onSuccess: (version) => {
      queryClient.invalidateQueries({ queryKey: ['plan-versions', planId] });
      queryClient.invalidateQueries({ queryKey: ['media-plan', planId] });
      toast.success(`Plano restaurado para versão ${version.version_number}!`);
    },
    onError: (error) => {
      console.error('Error restoring version:', error);
      toast.error('Erro ao restaurar versão');
    },
  });

  return {
    versions: versionsQuery.data || [],
    isLoading: versionsQuery.isLoading,
    error: versionsQuery.error,
    createVersion: createVersionMutation.mutate,
    isCreating: createVersionMutation.isPending,
    restoreVersion: restoreVersionMutation.mutate,
    isRestoring: restoreVersionMutation.isPending,
  };
}
