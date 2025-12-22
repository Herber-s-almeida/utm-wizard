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
  days: number;
}

interface TemporalEqualizerProps {
  startDate: string;
  endDate: string;
  totalBudget: number;
  granularity: 'monthly' | 'quarterly';
  periods: TemporalPeriod[];
  onGranularityChange: (granularity: 'monthly' | 'quarterly') => void;
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
  const formatCurrency = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const totalPercentage = Math.round(periods.reduce((sum, p) => sum + p.percentage, 0) * 100) / 100;
  const totalAmount = Math.round(periods.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
  const totalDays = periods.reduce((sum, p) => sum + p.days, 0);
  const isValid = totalPercentage === 100;

  const handleAmountChange = (index: number, value: string) => {
    const numValue = Math.round((parseFloat(value) || 0) * 100) / 100;
    const newPeriods = [...periods];
    const percentage = totalBudget > 0 ? Math.round((numValue / totalBudget) * 10000) / 100 : 0;
    newPeriods[index] = { 
      ...newPeriods[index], 
      amount: numValue,
      percentage
    };
    onPeriodsChange(newPeriods);
  };

  const distributeEvenly = () => {
    if (periods.length === 0) return;
    
    const basePercentage = Math.floor((100 / periods.length) * 100) / 100;
    const baseAmount = Math.floor((totalBudget / periods.length) * 100) / 100;
    
    const newPeriods = periods.map((p, i) => {
      if (i === periods.length - 1) {
        const sumPercentage = basePercentage * (periods.length - 1);
        const sumAmount = baseAmount * (periods.length - 1);
        return {
          ...p,
          percentage: Math.round((100 - sumPercentage) * 100) / 100,
          amount: Math.round((totalBudget - sumAmount) * 100) / 100,
        };
      }
      return {
        ...p,
        percentage: basePercentage,
        amount: baseAmount,
      };
    });
    
    onPeriodsChange(newPeriods);
  };

  // Calculate daily budget for each period
  const getDailyBudget = (period: TemporalPeriod) => {
    if (period.days === 0) return 0;
    return period.amount / period.days;
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
          <Tabs value={granularity} onValueChange={(v) => onGranularityChange(v as 'monthly' | 'quarterly')}>
            <TabsList className="grid w-full max-w-[300px] grid-cols-2">
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="quarterly">Trimestral</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Table view */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-semibold text-foreground">
                  {granularity === 'monthly' ? 'Mês' : 'Trimestre'}
                </th>
                <th className="text-right py-3 px-2 font-semibold text-foreground">Dias</th>
                <th className="text-right py-3 px-2 font-semibold text-foreground">Valor (R$)</th>
                <th className="text-right py-3 px-2 font-semibold text-foreground">% do total</th>
                <th className="text-right py-3 px-2 font-semibold text-muted-foreground">
                  Orçamento/dia
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period, index) => (
                <tr key={period.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2">
                    <span className="font-medium text-foreground">{period.label}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-muted-foreground">{period.days}</span>
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
                  <td className="py-3 px-2 text-right">
                    <span className="text-primary font-medium">{period.percentage.toFixed(2)}%</span>
                  </td>
                  <td className="py-3 px-2 text-right text-muted-foreground">
                    {formatCurrency(getDailyBudget(period), 2)}/dia
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
                <td className="py-3 px-2 text-right">{totalDays}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(totalAmount)}</td>
                <td className="py-3 px-2 text-right">{totalPercentage.toFixed(2)}%</td>
                <td className="py-3 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bar Chart Visualization */}
        {periods.length > 0 && maxAmount > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Distribuição {granularity === 'monthly' ? 'mensal' : 'trimestral'}
              </span>
            </div>
            <div className="flex items-end gap-1 h-40 bg-muted/20 rounded-lg p-2">
              {periods.map((period) => {
                const height = maxAmount > 0 ? (period.amount / maxAmount) * 100 : 0;
                return (
                  <div
                    key={period.id}
                    className="flex-1 flex flex-col items-center justify-end h-full"
                  >
                    <div className="text-center mb-1">
                      <span className="text-[8px] text-muted-foreground font-medium block">
                        {period.percentage.toFixed(0)}%
                      </span>
                      <span className="text-[7px] text-muted-foreground block">
                        R$ {period.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div 
                      className="w-full bg-primary rounded-t transition-all duration-300 min-h-[4px] relative"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground text-center mt-1 whitespace-nowrap overflow-hidden max-w-full truncate">
                      {granularity === 'monthly' ? period.label.slice(0, 3) : period.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isValid && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            A soma dos percentuais deve ser exatamente 100%. Atual: {totalPercentage.toFixed(2)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to calculate days in a period considering campaign start/end dates
function calculateDaysInPeriod(
  periodStart: Date, 
  periodEnd: Date, 
  campaignStart: Date, 
  campaignEnd: Date
): number {
  const effectiveStart = periodStart < campaignStart ? campaignStart : periodStart;
  const effectiveEnd = periodEnd > campaignEnd ? campaignEnd : periodEnd;
  
  if (effectiveStart > effectiveEnd) return 0;
  
  const diffTime = effectiveEnd.getTime() - effectiveStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// Helper function to generate periods based on date range and granularity
export function generateTemporalPeriods(
  startDate: string, 
  endDate: string, 
  granularity: 'monthly' | 'quarterly',
  totalBudget: number = 0
): TemporalPeriod[] {
  if (!startDate || !endDate) return [];
  
  const campaignStart = new Date(startDate);
  const campaignEnd = new Date(endDate);
  const periods: TemporalPeriod[] = [];
  
  if (granularity === 'monthly') {
    let current = new Date(campaignStart.getFullYear(), campaignStart.getMonth(), 1);
    while (current <= campaignEnd) {
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      
      // Calculate the last day of the month
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      
      const days = calculateDaysInPeriod(monthStart, monthEnd, campaignStart, campaignEnd);
      
      if (days > 0) {
        periods.push({
          id: `month-${current.getFullYear()}-${current.getMonth()}`,
          label: `${monthNames[current.getMonth()]} ${current.getFullYear()}`,
          date: current.toISOString().split('T')[0],
          percentage: 0,
          amount: 0,
          days,
        });
      }
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    // Quarterly
    const getQuarter = (month: number) => Math.floor(month / 3) + 1;
    const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    
    let currentYear = campaignStart.getFullYear();
    let currentQuarter = getQuarter(campaignStart.getMonth());
    
    while (true) {
      const quarterStartMonth = (currentQuarter - 1) * 3;
      const quarterStart = new Date(currentYear, quarterStartMonth, 1);
      const quarterEnd = new Date(currentYear, quarterStartMonth + 3, 0);
      
      if (quarterStart > campaignEnd) break;
      
      const days = calculateDaysInPeriod(quarterStart, quarterEnd, campaignStart, campaignEnd);
      
      if (days > 0) {
        periods.push({
          id: `quarter-${currentYear}-Q${currentQuarter}`,
          label: `${quarterNames[currentQuarter - 1]} ${currentYear}`,
          date: quarterStart.toISOString().split('T')[0],
          percentage: 0,
          amount: 0,
          days,
        });
      }
      
      currentQuarter++;
      if (currentQuarter > 4) {
        currentQuarter = 1;
        currentYear++;
      }
    }
  }
  
  // Distribute evenly with 2 decimal places
  if (periods.length > 0) {
    const basePercentage = Math.floor((100 / periods.length) * 100) / 100;
    const baseAmount = Math.floor((totalBudget / periods.length) * 100) / 100;
    
    periods.forEach((p, i) => {
      if (i === periods.length - 1) {
        const sumPercentage = basePercentage * (periods.length - 1);
        const sumAmount = baseAmount * (periods.length - 1);
        p.percentage = Math.round((100 - sumPercentage) * 100) / 100;
        p.amount = Math.round((totalBudget - sumAmount) * 100) / 100;
      } else {
        p.percentage = basePercentage;
        p.amount = baseAmount;
      }
    });
  }
  
  return periods;
}
