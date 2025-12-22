import { Edit2, Calendar, DollarSign, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KPI_OPTIONS } from '@/types/media';

interface PlanSummaryCardProps {
  planData: {
    name: string;
    client: string;
    campaign: string;
    start_date: string;
    end_date: string;
    total_budget: number;
    objectives: string[];
    kpis: Record<string, number>;
  };
  onEdit: () => void;
  showEditButton?: boolean;
}

export function PlanSummaryCard({ planData, onEdit, showEditButton = true }: PlanSummaryCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getKpiLabel = (key: string) => {
    return KPI_OPTIONS.find(k => k.key === key)?.label || key.toUpperCase();
  };

  const getKpiUnit = (key: string) => {
    return KPI_OPTIONS.find(k => k.key === key)?.unit || '';
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 shadow-lg">
      <CardContent className="p-6">
        {/* Header with edit button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">Resumo do Plano</h3>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full min-w-[100px]" />
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <span className="text-success font-bold text-sm">✓</span>
            </div>
          </div>
          {showEditButton && (
            <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" />
              Editar
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Nome do Plano */}
          <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Nome do Plano</span>
            <p className="font-display text-xl font-semibold mt-1">{planData.name || '-'}</p>
          </div>

          {/* Grid de informações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campanha e Cliente */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-2">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Campanha</span>
                <p className="font-semibold text-lg">{planData.campaign || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</span>
                <p className="text-muted-foreground">{planData.client || '-'}</p>
              </div>
            </div>

            {/* Datas */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Data de Início</span>
                <span className="ml-auto font-semibold">{formatDate(planData.start_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Data de Término</span>
                <span className="ml-auto font-semibold">{formatDate(planData.end_date)}</span>
              </div>
            </div>
          </div>

          {/* Objetivos */}
          {planData.objectives.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Objetivos de Campanha</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {planData.objectives.map((obj, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {obj}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Orçamento e KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Orçamento Total */}
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Orçamento Total</span>
              </div>
              <p className="font-display text-3xl font-bold text-primary">
                {formatCurrency(planData.total_budget)}
              </p>
            </div>

            {/* KPIs */}
            {Object.keys(planData.kpis).length > 0 && (
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <span className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">KPIs</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(planData.kpis).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate">{getKpiLabel(key).split(' ')[0]}</span>
                      <span className="font-semibold">{getKpiUnit(key) === 'R$' ? formatCurrency(value) : `${value}${getKpiUnit(key)}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
