import { useMemo } from 'react';
import { MediaLine, MediaCreative } from '@/types/media';
import { HierarchyLevel, DEFAULT_HIERARCHY_ORDER, getLevelLabel, getLevelLabelPlural } from '@/types/hierarchy';

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
  monthlyBudgets?: Record<string, Array<{ amount: number }>>;
  planStartDate: string | null;
  planEndDate: string | null;
  moments?: Array<{ id: string; name: string }>;
  hierarchyOrder?: HierarchyLevel[];
}

// Helper to get line's reference ID for a given level
function getLineReferenceId(line: MediaLine, level: HierarchyLevel): string | null {
  switch (level) {
    case 'subdivision':
      return line.subdivision_id || null;
    case 'moment':
      return line.moment_id || null;
    case 'funnel_stage':
      return line.funnel_stage_id || null;
    default:
      return null;
  }
}

// Helper to map distribution_type to HierarchyLevel
function distributionTypeToLevel(type: string): HierarchyLevel | null {
  switch (type) {
    case 'subdivision':
      return 'subdivision';
    case 'moment':
      return 'moment';
    case 'funnel_stage':
      return 'funnel_stage';
    default:
      return null;
  }
}

export function usePlanAlerts({
  totalBudget,
  lines,
  creatives,
  budgetDistributions,
  monthlyBudgets = {},
  planStartDate,
  planEndDate,
  moments = [],
  hierarchyOrder = DEFAULT_HIERARCHY_ORDER,
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

    // 2. Dynamic budget check for each hierarchy level
    hierarchyOrder.forEach(level => {
      const levelDists = budgetDistributions.filter(d => d.distribution_type === level);
      const levelLabel = getLevelLabel(level);
      
      levelDists.forEach(dist => {
        // Filter lines that match this distribution
        const matchingLines = lines.filter(l => {
          const lineRefId = getLineReferenceId(l, level);
          return (dist.reference_id === null && !lineRefId) || lineRefId === dist.reference_id;
        });
        
        const allocated = matchingLines.reduce((acc, l) => acc + Number(l.budget || 0), 0);
        
        // Check for budget exceeded
        if (allocated > dist.amount && dist.amount > 0) {
          result.push({
            id: `budget-exceeded-${level}-${dist.id}`,
            level: 'warning',
            title: `${levelLabel} excede orçamento`,
            description: `Uma ${levelLabel.toLowerCase()} tem R$ ${(allocated - dist.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} alocados além do planejado`,
            action: 'Redistribua o orçamento entre as linhas',
            category: 'budget',
          });
        }
        
        // Check for empty allocations (budget planned but no lines)
        if (dist.reference_id && matchingLines.length === 0 && dist.amount > 0) {
          const levelName = level === 'moment' 
            ? moments.find(m => m.id === dist.reference_id)?.name || levelLabel
            : levelLabel;
            
          result.push({
            id: `${level}-empty-${dist.id}`,
            level: level === 'moment' ? 'warning' : 'info',
            title: `${levelLabel} sem linhas`,
            description: `${levelName} tem orçamento planejado (R$ ${dist.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) mas nenhuma linha alocada`,
            action: `Adicione linhas de mídia para esta ${levelLabel.toLowerCase()}`,
            category: 'config',
          });
        }
      });
    });
    // NOTE: Legacy moment check is now handled dynamically above in section 2

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

      // 13. NEW: Budget allocation mismatch (line budget vs monthly allocated)
      const lineBudget = Number(line.budget || 0);
      const lineMonthlyBudgets = monthlyBudgets[line.id] || [];
      const allocatedBudget = lineMonthlyBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      
      if (lineBudget > 0 && Math.abs(lineBudget - allocatedBudget) > 0.01) {
        const diff = lineBudget - allocatedBudget;
        result.push({
          id: `budget-mismatch-${line.id}`,
          level: 'error',
          title: 'Orçamento alocado divergente',
          description: `A linha "${line.line_code || line.platform}" tem orçamento de R$ ${lineBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mas alocação mensal de R$ ${allocatedBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (diferença: R$ ${Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
          action: diff > 0 ? 'Distribua o orçamento restante nos meses' : 'Reduza a alocação mensal',
          lineId: line.id,
          category: 'budget',
        });
      }
    });

    return result;
  }, [totalBudget, lines, creatives, budgetDistributions, monthlyBudgets, planStartDate, planEndDate, moments, hierarchyOrder]);

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
