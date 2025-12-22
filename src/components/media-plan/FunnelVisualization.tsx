import { Edit2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetAllocation } from '@/hooks/useMediaPlanWizard';

interface FunnelVisualizationProps {
  funnelStages: BudgetAllocation[];
  parentBudget: number;
  parentName: string;
  onEdit: () => void;
}

export function FunnelVisualization({ 
  funnelStages, 
  parentBudget, 
  parentName,
  onEdit,
}: FunnelVisualizationProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (funnelStages.length === 0) {
    return null;
  }

  // Calculate widths for funnel visualization
  const maxWidth = 100;
  const minWidth = 40;
  const widthStep = (maxWidth - minWidth) / Math.max(funnelStages.length - 1, 1);

  return (
    <Card className="border border-border/50 bg-card overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-semibold">Fases do Funil</h3>
            <span className="text-sm text-muted-foreground">({parentName})</span>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full min-w-[80px]" />
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <span className="text-success font-bold text-sm">✓</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Visual */}
          <div className="flex flex-col items-center justify-center py-4">
            <svg viewBox="0 0 200 180" className="w-full max-w-[280px] h-auto">
              {funnelStages.map((stage, index) => {
                const width = maxWidth - (index * widthStep);
                const x = (100 - width) / 2;
                const y = index * (160 / funnelStages.length) + 10;
                const height = 150 / funnelStages.length - 4;
                const amount = (parentBudget * stage.percentage) / 100;
                
                return (
                  <g key={stage.id}>
                    {/* Funnel segment */}
                    <path
                      d={`
                        M ${x} ${y}
                        L ${x + width} ${y}
                        L ${x + width - (widthStep / 2)} ${y + height}
                        L ${x + (widthStep / 2)} ${y + height}
                        Z
                      `}
                      fill="hsl(var(--primary))"
                      fillOpacity={1 - (index * 0.15)}
                      stroke="hsl(var(--primary-foreground))"
                      strokeWidth="0.5"
                      strokeOpacity="0.3"
                    />
                    {/* Label */}
                    <text
                      x="100"
                      y={y + height / 2 - 2}
                      textAnchor="middle"
                      fill="hsl(var(--primary-foreground))"
                      className="font-semibold"
                      style={{ fontSize: Math.max(7, 10 - funnelStages.length) }}
                    >
                      {stage.name}
                    </text>
                    {/* Percentage */}
                    <text
                      x="100"
                      y={y + height / 2 + 8}
                      textAnchor="middle"
                      fill="hsl(var(--primary-foreground))"
                      style={{ fontSize: Math.max(6, 9 - funnelStages.length), opacity: 0.9 }}
                    >
                      {stage.percentage}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Stage Cards - NO DRAG here, just display */}
          <div className="space-y-3">
            {funnelStages.map((stage) => {
              const amount = (parentBudget * stage.percentage) / 100;
              return (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 bg-muted/50 rounded-xl p-4 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide block">
                      {stage.name}
                    </span>
                    <p className="font-display text-xl font-bold text-foreground">
                      {formatCurrency(amount)}
                    </p>
                    <span className="text-sm text-primary font-medium">
                      {stage.percentage}% da verba ({parentName})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
