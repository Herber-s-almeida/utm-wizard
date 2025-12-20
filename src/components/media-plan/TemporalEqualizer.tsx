import { useState, useEffect } from 'react';
import { Edit2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TemporalPeriod {
  id: string;
  label: string;
  date: string;
  percentage: number;
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
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  const handleSliderChange = (index: number, value: number[]) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], percentage: value[0] };
    onPeriodsChange(newPeriods);
  };

  const distributeEvenly = () => {
    if (periods.length === 0) return;
    const evenPercentage = 100 / periods.length;
    const newPeriods = periods.map(p => ({ ...p, percentage: Math.round(evenPercentage * 10) / 10 }));
    // Adjust last one to make sure it sums to 100
    const sum = newPeriods.slice(0, -1).reduce((s, p) => s + p.percentage, 0);
    newPeriods[newPeriods.length - 1].percentage = Math.round((100 - sum) * 10) / 10;
    onPeriodsChange(newPeriods);
  };

  // Calculate max bar height based on percentage
  const maxPercentage = Math.max(...periods.map(p => p.percentage), 1);

  return (
    <Card className="border border-border/50 bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Distribuição Temporal</CardTitle>
              <CardDescription>Distribua o orçamento ao longo do tempo</CardDescription>
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

        {/* Equalizer Visualization */}
        <div className="relative">
          {/* Bars */}
          <div className="flex items-end gap-2 h-48 px-2">
            {periods.map((period, index) => {
              const height = (period.percentage / maxPercentage) * 100;
              const amount = (totalBudget * period.percentage) / 100;
              
              return (
                <div
                  key={period.id}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  {/* Bar */}
                  <div 
                    className="w-full bg-primary/20 rounded-t-lg relative flex items-end justify-center overflow-hidden transition-all duration-300"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  >
                    <div 
                      className="absolute inset-0 bg-gradient-to-t from-primary to-primary/70 transition-all duration-300"
                    />
                    <span className="relative z-10 text-[10px] font-bold text-primary-foreground pb-1">
                      {period.percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Slider */}
                  {!readonly && (
                    <div className="w-full px-1">
                      <Slider
                        value={[period.percentage]}
                        onValueChange={(value) => handleSliderChange(index, value)}
                        max={100}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  {/* Label */}
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground block">
                      {period.label}
                    </span>
                    <span className="text-xs font-semibold text-foreground block">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total indicator */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          isValid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}>
          <span className="text-sm font-medium">Total</span>
          <span className="font-bold">{totalPercentage.toFixed(1)}%</span>
        </div>
        
        {!isValid && (
          <p className="text-sm text-destructive">
            A soma dos percentuais deve ser exatamente 100%
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
  granularity: 'weekly' | 'monthly'
): TemporalPeriod[] {
  if (!startDate || !endDate) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periods: TemporalPeriod[] = [];
  
  if (granularity === 'monthly') {
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      periods.push({
        id: `month-${current.getFullYear()}-${current.getMonth()}`,
        label: `${monthNames[current.getMonth()]}/${current.getFullYear().toString().slice(-2)}`,
        date: current.toISOString().split('T')[0],
        percentage: 0,
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
        label: `S${weekNum}`,
        date: current.toISOString().split('T')[0],
        percentage: 0,
      });
      current.setDate(current.getDate() + 7);
      weekNum++;
    }
  }
  
  // Distribute evenly
  if (periods.length > 0) {
    const evenPercentage = 100 / periods.length;
    periods.forEach((p, i) => {
      p.percentage = i === periods.length - 1 
        ? Math.round((100 - evenPercentage * (periods.length - 1)) * 10) / 10
        : Math.round(evenPercentage * 10) / 10;
    });
  }
  
  return periods;
}
