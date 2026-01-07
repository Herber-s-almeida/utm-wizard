import { useMemo } from 'react';
import { MediaLine, MediaCreative } from '@/types/media';

export type AlertLevel = 'error' | 'warning' | 'info';

export interface PlanAlert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  action?: string;
  lineId?: string;
  category: 'budget' | 'creative' | 'config' | 'timing' | 'utm';
}

interface UsePlanAlertsParams {
  totalBudget: number;
  lines: MediaLine[];
  creatives: Record<string, MediaCreative[]>;
  budgetDistributions: Array<{
    id: string;
    distribution_type: string;
    reference_id: string | null;
    amount: number;
    percentage: number;
    parent_distribution_id?: string | null;
  }>;
  planStartDate: string | null;
  planEndDate: string | null;
  moments?: Array<{ id: string; name: string }>;
}

export function usePlanAlerts({
  totalBudget,
  lines,
  creatives,
  budgetDistributions,
  planStartDate,
  planEndDate,
  moments = [],
}: UsePlanAlertsParams) {
  const alerts = useMemo(() => {
    const result: PlanAlert[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Check total budget allocation
    const totalAllocated = lines.reduce((acc, line) => acc + Number(line.budget || 0), 0);
    if (totalAllocated > totalBudget && totalBudget > 0) {
      const excess = totalAllocated - totalBudget;
      const percentage = ((excess / totalBudget) * 100).toFixed(1);
      result.push({
        id: 'budget-exceeded-total',
        level: 'error',
        title: 'Orçamento excedido',
        description: `O orçamento alocado excede o planejado em R$ ${excess.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)`,
        action: 'Reduza o orçamento das linhas ou aumente o orçamento do plano',
        category: 'budget',
      });
    }

    // 2. Check budget allocation by subdivision
    const subdivisionDists = budgetDistributions.filter(d => d.distribution_type === 'subdivision');
    subdivisionDists.forEach(dist => {
      const subLines = lines.filter(l => 
        (dist.reference_id === null && !l.subdivision_id) || l.subdivision_id === dist.reference_id
      );
      const subAllocated = subLines.reduce((acc, l) => acc + Number(l.budget || 0), 0);
      
      if (subAllocated > dist.amount && dist.amount > 0) {
        result.push({
          id: `budget-exceeded-sub-${dist.id}`,
          level: 'warning',
          title: 'Subdivisão excede orçamento',
          description: `Uma subdivisão tem R$ ${(subAllocated - dist.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} alocados além do planejado`,
          action: 'Redistribua o orçamento entre as linhas',
          category: 'budget',
        });
      }
    });

    // 3. Check funnel stages without allocation
    const funnelDists = budgetDistributions.filter(d => d.distribution_type === 'funnel_stage');
    if (funnelDists.length > 0) {
      funnelDists.forEach(dist => {
        if (dist.reference_id) {
          const funnelLines = lines.filter(l => l.funnel_stage_id === dist.reference_id);
          const funnelAllocated = funnelLines.reduce((acc, l) => acc + Number(l.budget || 0), 0);
          
          if (funnelAllocated === 0 && dist.amount > 0) {
            result.push({
              id: `funnel-empty-${dist.id}`,
              level: 'info',
              title: 'Fase do funil sem linhas',
              description: `Uma fase do funil tem orçamento planejado mas nenhuma linha alocada`,
              action: 'Adicione linhas de mídia para esta fase do funil',
              category: 'config',
            });
          }
        }
      });
    }

    // 4. NEW: Check moments without lines
    const momentDists = budgetDistributions.filter(d => d.distribution_type === 'moment');
    momentDists.forEach(dist => {
      if (dist.reference_id) {
        const momentLines = lines.filter(l => l.moment_id === dist.reference_id);
        const momentName = moments.find(m => m.id === dist.reference_id)?.name || 'Momento';
        
        if (momentLines.length === 0 && dist.amount > 0) {
          result.push({
            id: `moment-empty-${dist.id}`,
            level: 'warning',
            title: 'Momento sem linhas',
            description: `O momento "${momentName}" tem orçamento planejado (R$ ${dist.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) mas nenhuma linha alocada`,
            action: 'Adicione linhas de mídia para este momento',
            category: 'config',
          });
        }
      }
    });

    // 5. NEW: Check budget concentration (single line > 50% of total)
    if (totalBudget > 0 && lines.length > 1) {
      lines.forEach(line => {
        const lineBudget = Number(line.budget || 0);
        const concentration = (lineBudget / totalBudget) * 100;
        
        if (concentration > 50) {
          result.push({
            id: `budget-concentration-${line.id}`,
            level: 'warning',
            title: 'Concentração de orçamento',
            description: `A linha "${line.line_code || line.platform}" concentra ${concentration.toFixed(1)}% do orçamento total`,
            action: 'Considere diversificar o orçamento entre mais linhas',
            lineId: line.id,
            category: 'budget',
          });
        }
      });
    }

    // 6. NEW: Budget redistribution suggestion when allocated < 80% of planned
    if (totalBudget > 0) {
      const utilizationRate = (totalAllocated / totalBudget) * 100;
      if (utilizationRate < 80 && lines.length > 0) {
        const remaining = totalBudget - totalAllocated;
        result.push({
          id: 'budget-underutilized',
          level: 'info',
          title: 'Orçamento subutilizado',
          description: `Apenas ${utilizationRate.toFixed(1)}% do orçamento foi alocado. Restam R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          action: 'Distribua o orçamento restante entre as linhas existentes ou crie novas linhas',
          category: 'budget',
        });
      }
    }

    // Per-line checks
    lines.forEach(line => {
      const lineCreatives = creatives[line.id] || [];

      // 7. Lines without creatives
      if (lineCreatives.length === 0) {
        result.push({
          id: `no-creatives-${line.id}`,
          level: 'warning',
          title: 'Linha sem criativos',
          description: `A linha "${line.line_code || line.platform}" não possui criativos cadastrados`,
          action: 'Adicione criativos para esta linha',
          lineId: line.id,
          category: 'creative',
        });
      }

      // 8. Creatives without format specification
      lineCreatives.forEach(creative => {
        if (!creative.format_id) {
          result.push({
            id: `creative-no-format-${creative.id}`,
            level: 'info',
            title: 'Criativo sem formato',
            description: `O criativo "${creative.name}" não tem especificação de formato`,
            action: 'Defina um formato para o criativo',
            lineId: line.id,
            category: 'creative',
          });
        }
      });

      // 9. Lines without UTMs configured
      if (!line.utm_source && !line.utm_medium && !line.utm_campaign) {
        result.push({
          id: `no-utms-${line.id}`,
          level: 'info',
          title: 'UTMs não configurados',
          description: `A linha "${line.line_code || line.platform}" não possui parâmetros UTM`,
          action: 'Configure os UTMs para rastreamento',
          lineId: line.id,
          category: 'utm',
        });
      } else if (!(line as any).utm_validated) {
        // UTM exists but not validated
        result.push({
          id: `utm-pending-${line.id}`,
          level: 'info',
          title: 'UTM pendente validação',
          description: `A linha "${line.line_code || line.platform}" tem UTMs configurados mas não validados`,
          action: 'Revise e valide os parâmetros UTM',
          lineId: line.id,
          category: 'utm',
        });
      }

      // 10. Active lines outside period
      if (line.start_date && line.end_date) {
        const lineStart = line.start_date;
        const lineEnd = line.end_date;

        // Check if line is outside plan period
        if (planStartDate && lineStart < planStartDate) {
          result.push({
            id: `line-before-plan-${line.id}`,
            level: 'warning',
            title: 'Linha inicia antes do plano',
            description: `A linha "${line.line_code || line.platform}" começa antes da data de início do plano`,
            action: 'Ajuste a data de início da linha',
            lineId: line.id,
            category: 'timing',
          });
        }

        if (planEndDate && lineEnd > planEndDate) {
          result.push({
            id: `line-after-plan-${line.id}`,
            level: 'warning',
            title: 'Linha termina após o plano',
            description: `A linha "${line.line_code || line.platform}" termina após a data final do plano`,
            action: 'Ajuste a data final da linha',
            lineId: line.id,
            category: 'timing',
          });
        }

        // Check if line has ended but no status update
        if (lineEnd < today && line.budget && Number(line.budget) > 0) {
          result.push({
            id: `line-ended-${line.id}`,
            level: 'info',
            title: 'Linha encerrada',
            description: `A linha "${line.line_code || line.platform}" já passou da data final`,
            action: 'Verifique os resultados e atualize o status',
            lineId: line.id,
            category: 'timing',
          });
        }
      }

      // 11. Lines without dates
      if (!line.start_date || !line.end_date) {
        result.push({
          id: `no-dates-${line.id}`,
          level: 'info',
          title: 'Datas não definidas',
          description: `A linha "${line.line_code || line.platform}" não possui período definido`,
          action: 'Defina as datas de início e fim',
          lineId: line.id,
          category: 'timing',
        });
      }

      // 12. NEW: Lines with zero budget
      if (Number(line.budget || 0) === 0) {
        result.push({
          id: `zero-budget-${line.id}`,
          level: 'warning',
          title: 'Linha sem orçamento',
          description: `A linha "${line.line_code || line.platform}" não possui orçamento definido`,
          action: 'Defina um orçamento para esta linha',
          lineId: line.id,
          category: 'budget',
        });
      }
    });

    return result;
  }, [totalBudget, lines, creatives, budgetDistributions, planStartDate, planEndDate, moments]);

  // Group alerts by level
  const errorAlerts = alerts.filter(a => a.level === 'error');
  const warningAlerts = alerts.filter(a => a.level === 'warning');
  const infoAlerts = alerts.filter(a => a.level === 'info');

  // Group alerts by category
  const budgetAlerts = alerts.filter(a => a.category === 'budget');
  const creativeAlerts = alerts.filter(a => a.category === 'creative');
  const configAlerts = alerts.filter(a => a.category === 'config');
  const timingAlerts = alerts.filter(a => a.category === 'timing');
  const utmAlerts = alerts.filter(a => a.category === 'utm');

  // Get alerts for a specific line
  const getLineAlerts = (lineId: string) => {
    return alerts.filter(a => a.lineId === lineId);
  };

  // Get lines with alerts
  const linesWithAlerts = new Set(alerts.filter(a => a.lineId).map(a => a.lineId));

  return {
    alerts,
    errorAlerts,
    warningAlerts,
    infoAlerts,
    budgetAlerts,
    creativeAlerts,
    configAlerts,
    timingAlerts,
    utmAlerts,
    getLineAlerts,
    linesWithAlerts,
    hasErrors: errorAlerts.length > 0,
    hasWarnings: warningAlerts.length > 0,
    totalAlerts: alerts.length,
  };
}
