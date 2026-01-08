import { Calendar, DollarSign, AlertTriangle, LayoutList, Palette, ChevronDown, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { KPI_OPTIONS } from '@/types/media';
import { AnimatedCollapsible, AnimatedCollapsibleContent, AnimatedCollapsibleTrigger } from '@/components/ui/animated-collapsible';
import { motion } from 'framer-motion';

interface PlanDetailSummaryCardProps {
  plan: {
    name: string;
    client: string | null;
    campaign: string | null;
    start_date: string | null;
    end_date: string | null;
    total_budget: number | null;
    objectives: string[] | null;
    kpis: Record<string, number> | null;
  };
  totalLinesBudget: number;
  linesCount: number;
  creativesCount: number;
  customKpis?: Array<{ key: string; name: string; unit: string }>;
  onHide?: () => void;
}

export function PlanDetailSummaryCard({ 
  plan, 
  totalLinesBudget, 
  linesCount, 
  creativesCount,
  customKpis = [],
  onHide,
}: PlanDetailSummaryCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getKpiLabel = (key: string) => {
    const standardKpi = KPI_OPTIONS.find(k => k.key === key);
    if (standardKpi) return standardKpi.label;
    const customKpi = customKpis.find(k => k.key === key);
    if (customKpi) return customKpi.name;
    return key.toUpperCase();
  };

  const getKpiUnit = (key: string) => {
    const standardKpi = KPI_OPTIONS.find(k => k.key === key);
    if (standardKpi) return standardKpi.unit;
    const customKpi = customKpis.find(k => k.key === key);
    if (customKpi) return customKpi.unit;
    return '';
  };

  const totalBudget = Number(plan.total_budget) || 0;
  const isOverBudget = totalLinesBudget > totalBudget;
  const objectives = plan.objectives || [];
  const kpis = plan.kpis || {};

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 shadow-lg overflow-hidden">
      <AnimatedCollapsible defaultOpen={true} storageKey="plan-summary-card">
        <div className="w-full flex items-center justify-between p-6 pb-4">
          <AnimatedCollapsibleTrigger asChild>
            <button className="flex-1 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left rounded-lg -m-2 p-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <h3 className="font-display text-lg font-semibold text-foreground">Resumo do Plano</h3>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full min-w-[100px]" />
            </button>
          </AnimatedCollapsibleTrigger>
          
          <div className="flex items-center gap-1">
            {onHide && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onHide();
                      }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Ocultar esta seção
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <AnimatedCollapsibleTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-muted/50 transition-colors">
                <motion.div
                  initial={false}
                  className="[[data-state=open]_&]:rotate-180 transition-transform duration-200"
                >
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </button>
            </AnimatedCollapsibleTrigger>
          </div>
        </div>
        
        <AnimatedCollapsibleContent>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="space-y-4">
              {/* Nome do Plano */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Nome do Plano</span>
                <p className="font-display text-xl font-semibold mt-1">{plan.name || '-'}</p>
                {objectives.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Objetivos de Campanha</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {objectives.map((obj, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Grid: Cliente + Datas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</span>
                  <p className="font-semibold text-lg">{plan.client || '-'}</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Data de Início</span>
                    <span className="ml-auto font-semibold">{formatDate(plan.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Data de Término</span>
                    <span className="ml-auto font-semibold">{formatDate(plan.end_date)}</span>
                  </div>
                </div>
              </div>

              {/* Grid: Orçamento + Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Orçamento */}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Orçamento Total</span>
                  </div>
                  <p className="font-display text-3xl font-bold text-primary">
                    {formatCurrency(totalBudget)}
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/10">
                    <span className="text-xs text-muted-foreground">Alocado:</span>
                    <span className="font-semibold text-sm">{formatCurrency(totalLinesBudget)}</span>
                    {isOverBudget && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="w-4 h-4 text-destructive animate-pulse cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Orçamento alocado excede o planejado!</p>
                            <p className="font-bold">Excedente: {formatCurrency(totalLinesBudget - totalBudget)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>

                {/* Métricas */}
                <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">Métricas</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <LayoutList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-display text-2xl font-bold">{linesCount}</p>
                        <span className="text-xs text-muted-foreground">Linhas</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Palette className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-display text-2xl font-bold">{creativesCount}</p>
                        <span className="text-xs text-muted-foreground">Criativos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              {Object.keys(kpis).length > 0 && (
                <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">KPIs</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(kpis).map(([key, value]) => {
                      const unit = getKpiUnit(key);
                      return (
                        <div key={key} className="bg-background/50 rounded-lg p-3 border border-border/30">
                          <span className="text-xs text-muted-foreground block truncate">{getKpiLabel(key)}</span>
                          <span className="font-semibold text-lg">
                            {unit === 'R$' ? formatCurrency(value) : `${value}${unit}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCollapsibleContent>
      </AnimatedCollapsible>
    </Card>
  );
}
