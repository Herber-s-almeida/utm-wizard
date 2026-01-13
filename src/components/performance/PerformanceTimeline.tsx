import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReportMetric, ReportPeriod, groupMetricsByDate } from '@/hooks/usePerformanceData';
import { Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface PerformanceTimelineProps {
  metrics: (ReportMetric & { report_periods: ReportPeriod })[];
  plannedBudget: number;
  planStartDate?: string;
  planEndDate?: string;
  moments?: { id: string; name: string; start_date: string }[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export function PerformanceTimeline({
  metrics,
  plannedBudget,
  planStartDate,
  planEndDate,
  moments = [],
}: PerformanceTimelineProps) {
  const chartData = useMemo(() => {
    const groupedByDate = groupMetricsByDate(metrics);
    const sortedDates = Object.keys(groupedByDate).sort();

    // Calculate daily planned budget
    const totalDays = sortedDates.length || 1;
    const dailyPlannedBudget = plannedBudget / totalDays;

    let cumulativeActual = 0;
    let cumulativePlanned = 0;

    return sortedDates.map((date) => {
      const dayMetrics = groupedByDate[date];
      const dayCost = dayMetrics.reduce((acc, m) => acc + Number(m.cost || 0), 0);
      const dayImpressions = dayMetrics.reduce((acc, m) => acc + Number(m.impressions || 0), 0);
      const dayClicks = dayMetrics.reduce((acc, m) => acc + Number(m.clicks || 0), 0);

      cumulativeActual += dayCost;
      cumulativePlanned += dailyPlannedBudget;

      return {
        date,
        dateFormatted: format(parseISO(date), 'dd/MM', { locale: ptBR }),
        cost: dayCost,
        impressions: dayImpressions,
        clicks: dayClicks,
        cumulativeActual,
        cumulativePlanned,
        variance: ((cumulativeActual - cumulativePlanned) / cumulativePlanned) * 100,
      };
    });
  }, [metrics, plannedBudget]);

  const momentLines = useMemo(() => {
    return moments
      .filter((m) => m.start_date)
      .map((m) => ({
        id: m.id,
        name: m.name,
        date: m.start_date,
      }));
  }, [moments]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum dado temporal disponível ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evolução Temporal
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary" />
                Investimento Real
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                Planejado
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium mb-2">{label}</p>
                      <div className="space-y-1">
                        <p className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Investido:</span>
                          <span className="font-medium">{formatCurrency(data.cumulativeActual)}</span>
                        </p>
                        <p className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Planejado:</span>
                          <span className="font-medium">{formatCurrency(data.cumulativePlanned)}</span>
                        </p>
                        <p
                          className={`flex items-center justify-between gap-4 ${
                            data.variance > 0 ? 'text-destructive' : 'text-success'
                          }`}
                        >
                          <span>Variação:</span>
                          <span className="font-medium">
                            {data.variance > 0 ? '+' : ''}
                            {data.variance.toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Moment reference lines */}
              {momentLines.map((moment) => (
                <ReferenceLine
                  key={moment.id}
                  x={format(parseISO(moment.date), 'dd/MM', { locale: ptBR })}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  label={{
                    value: moment.name,
                    position: 'top',
                    fill: 'hsl(var(--primary))',
                    fontSize: 10,
                  }}
                />
              ))}

              <Area
                type="monotone"
                dataKey="cumulativePlanned"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#colorPlanned)"
                name="Planejado"
              />
              <Area
                type="monotone"
                dataKey="cumulativeActual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorActual)"
                name="Investimento Real"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
