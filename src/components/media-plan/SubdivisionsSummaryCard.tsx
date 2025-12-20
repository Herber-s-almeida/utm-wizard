import { Edit2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetAllocation } from '@/hooks/useMediaPlanWizard';

interface SubdivisionsSummaryCardProps {
  subdivisions: BudgetAllocation[];
  totalBudget: number;
  onEdit: () => void;
}

export function SubdivisionsSummaryCard({ subdivisions, totalBudget, onEdit }: SubdivisionsSummaryCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (subdivisions.length === 0) {
    return null;
  }

  return (
    <Card className="border border-border/50 bg-card">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-semibold">Subdivisões do Plano</h3>
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

        {/* Subdivision Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subdivisions.map((sub) => {
            const amount = (totalBudget * sub.percentage) / 100;
            return (
              <div
                key={sub.id}
                className="bg-muted/50 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <span className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">
                  {sub.name}
                </span>
                <p className="font-display text-2xl font-bold text-foreground">
                  {formatCurrency(amount)}
                </p>
                <span className="text-sm text-primary font-medium">
                  {sub.percentage}% do plano
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
