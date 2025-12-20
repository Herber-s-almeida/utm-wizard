import { useState, useEffect } from 'react';
import { Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TemporalPeriod {
  id: string;
  label: string;
  date: string;
  percentage: number;
  amount: number;
}

interface TemporalEqualizerProps {
  startDate: string;
  endDate: string;
  totalBudget: number;
  granularity: 'weekly' | 'monthly';
  periods: TemporalPeriod[];
  onGranularityChange: (granularity: 'weekly' | 'monthly') => void;
  onPeriodsChange: (periods: TemporalPeriod[]) => void;
  readonly?: boolean;
}

export function TemporalEqualizer({
  startDate,
  endDate,
  totalBudget,
  granularity,
  periods,
  onGranularityChange,
  onPeriodsChange,
  readonly = false,
}: TemporalEqualizerProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalPercentage = periods.reduce((sum, p) => sum + p.percentage, 0);
  const totalAmount = periods.reduce((sum, p) => sum + p.amount, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  const handleAmountChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newPeriods = [...periods];
    const percentage = totalBudget > 0 ? (numValue / totalBudget) * 100 : 0;
    newPeriods[index] = { 
      ...newPeriods[index], 
      amount: numValue,
      percentage: Math.round(percentage * 100) / 100
    };
    onPeriodsChange(newPeriods);
  };

  const handlePercentageChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newPeriods = [...periods];
    const amount = (totalBudget * numValue) / 100;
    newPeriods[index] = { 
      ...newPeriods[index], 
      percentage: numValue,
      amount: Math.round(amount * 100) / 100
    };
    onPeriodsChange(newPeriods);
  };

  const distributeEvenly = () => {
    if (periods.length === 0) return;
    const evenPercentage = 100 / periods.length;
    const evenAmount = totalBudget / periods.length;
    const newPeriods = periods.map((p, i) => {
      const isLast = i === periods.length - 1;
      const sum = periods.slice(0, -1).reduce((s, _) => s + evenPercentage, 0);
      return {
        ...p,
        percentage: isLast ? Math.round((100 - sum) * 100) / 100 : Math.round(evenPercentage * 100) / 100,
        amount: isLast ? Math.round((totalBudget - evenAmount * (periods.length - 1)) * 100) / 100 : Math.round(evenAmount * 100) / 100,
      };
    });
    onPeriodsChange(newPeriods);
  };

  // Calculate daily budget for each period
  const getDailyBudget = (period: TemporalPeriod, index: number) => {
    const daysInPeriod = granularity === 'monthly' ? 30 : 7;
    return period.amount / daysInPeriod;
  };

  // Calculate max amount for chart
  const maxAmount = Math.max(...periods.map(p => p.amount), 1);

  return (
    <Card className="border border-border/50 bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Distribuição Temporal</CardTitle>
              <CardDescription>
                Distribua o orçamento ao longo do tempo. Você poderá ajustar isso a qualquer momento no plano final.
              </CardDescription>
            </div>
          </div>
          {!readonly && (
            <Button variant="outline" size="sm" onClick={distributeEvenly}>
              Distribuir igualmente
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Granularity Selector */}
        {!readonly && (
          <Tabs value={granularity} onValueChange={(v) => onGranularityChange(v as 'weekly' | 'monthly')}>
            <TabsList className="grid w-full max-w-[300px] grid-cols-2">
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Table view */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-semibold text-foreground">
                  {granularity === 'monthly' ? 'Mês' : 'Semana'}
                </th>
                <th className="text-right py-3 px-2 font-semibold text-foreground">Valor (R$)</th>
                <th className="text-right py-3 px-2 font-semibold text-foreground">% do total</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground">
                  Orçamento/{granularity === 'monthly' ? 'dia' : 'dia'}
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period, index) => (
                <tr key={period.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2">
                    <span className="font-medium text-foreground">{period.label}</span>
                  </td>
                  <td className="py-3 px-2">
                    {readonly ? (
                      <span className="text-right block">{formatCurrency(period.amount)}</span>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-32 text-right ml-auto"
                        value={period.amount || ''}
                        onChange={(e) => handleAmountChange(index, e.target.value)}
                        placeholder="0"
                      />
                    )}
                  </td>
                  <td className="py-3 px-2">
                    {readonly ? (
                      <span className="text-right block text-primary font-medium">{period.percentage.toFixed(1)}%</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-20 text-right"
                          value={period.percentage || ''}
                          onChange={(e) => handlePercentageChange(index, e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right text-muted-foreground">
                    {formatCurrency(getDailyBudget(period, index))}/dia
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={cn(
                "font-semibold",
                isValid ? "text-success" : "text-destructive"
              )}>
                <td className="py-3 px-2">Total</td>
                <td className="py-3 px-2 text-right">{formatCurrency(totalAmount)}</td>
                <td className="py-3 px-2 text-right">{totalPercentage.toFixed(1)}%</td>
                <td className="py-3 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bar Chart Visualization */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Distribuição {granularity === 'monthly' ? 'mensal' : 'semanal'}</span>
          </div>
          <div className="flex items-end gap-1 h-32">
            {periods.map((period) => {
              const height = (period.amount / maxAmount) * 100;
              return (
                <div
                  key={period.id}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div 
                    className="w-full bg-primary rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground text-center whitespace-nowrap overflow-hidden">
                    {period.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {!isValid && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            A soma dos percentuais deve ser exatamente 100%. Atual: {totalPercentage.toFixed(1)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to generate periods based on date range and granularity
export function generateTemporalPeriods(
  startDate: string, 
  endDate: string, 
  granularity: 'weekly' | 'monthly',
  totalBudget: number = 0
): TemporalPeriod[] {
  if (!startDate || !endDate) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periods: TemporalPeriod[] = [];
  
  if (granularity === 'monthly') {
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      periods.push({
        id: `month-${current.getFullYear()}-${current.getMonth()}`,
        label: monthNames[current.getMonth()],
        date: current.toISOString().split('T')[0],
        percentage: 0,
        amount: 0,
      });
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    // Weekly
    let current = new Date(start);
    // Find the start of the week (Monday)
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);
    
    let weekNum = 1;
    while (current <= end) {
      periods.push({
        id: `week-${current.toISOString().split('T')[0]}`,
        label: `Semana ${weekNum}`,
        date: current.toISOString().split('T')[0],
        percentage: 0,
        amount: 0,
      });
      current.setDate(current.getDate() + 7);
      weekNum++;
    }
  }
  
  // Distribute evenly
  if (periods.length > 0) {
    const evenPercentage = 100 / periods.length;
    const evenAmount = totalBudget / periods.length;
    periods.forEach((p, i) => {
      const isLast = i === periods.length - 1;
      const sum = evenPercentage * (periods.length - 1);
      p.percentage = isLast 
        ? Math.round((100 - sum) * 100) / 100
        : Math.round(evenPercentage * 100) / 100;
      p.amount = isLast
        ? Math.round((totalBudget - evenAmount * (periods.length - 1)) * 100) / 100
        : Math.round(evenAmount * 100) / 100;
    });
  }
  
  return periods;
}
