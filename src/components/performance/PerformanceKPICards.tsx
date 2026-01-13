import { Card, CardContent } from '@/components/ui/card';
import { PerformanceSummary } from '@/hooks/usePerformanceData';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  Users,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PerformanceKPICardsProps {
  summary: PerformanceSummary;
  previousSummary?: PerformanceSummary;
  showSecondary?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
  `${(value * 100).toFixed(2)}%`;

const formatCompact = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return formatNumber(value);
};

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variance?: number;
  varianceLabel?: string;
  isPositiveGood?: boolean;
  delay?: number;
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  variance,
  varianceLabel,
  isPositiveGood = true,
  delay = 0,
}: KPICardProps) {
  const showVariance = variance !== undefined && variance !== 0;
  const isPositive = variance ? variance > 0 : false;
  const isGood = isPositiveGood ? isPositive : !isPositive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold font-display tracking-tight">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {showVariance && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    isGood ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(variance).toFixed(1)}%
                  {varianceLabel && (
                    <span className="text-muted-foreground font-normal ml-1">
                      {varianceLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PerformanceKPICards({
  summary,
  previousSummary,
  showSecondary = true,
}: PerformanceKPICardsProps) {
  // Calculate variance from previous period if available
  const getVariance = (current: number, previous?: number) => {
    if (!previous || previous === 0) return undefined;
    return ((current - previous) / previous) * 100;
  };

  const costVariance = previousSummary
    ? getVariance(summary.totalCost, previousSummary.totalCost)
    : undefined;
  const impressionsVariance = previousSummary
    ? getVariance(summary.totalImpressions, previousSummary.totalImpressions)
    : undefined;
  const clicksVariance = previousSummary
    ? getVariance(summary.totalClicks, previousSummary.totalClicks)
    : undefined;
  const conversionsVariance = previousSummary
    ? getVariance(summary.totalConversions, previousSummary.totalConversions)
    : undefined;

  return (
    <div className="space-y-4">
      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Investimento Real"
          value={formatCurrency(summary.totalCost)}
          subtitle={`Planejado: ${formatCurrency(summary.plannedBudget)}`}
          icon={<DollarSign className="w-5 h-5" />}
          variance={summary.budgetVariancePercent}
          varianceLabel="vs planejado"
          isPositiveGood={false}
          delay={0}
        />

        <KPICard
          title="Impressões"
          value={formatCompact(summary.totalImpressions)}
          subtitle={`CPM: ${formatCurrency(summary.avgCPM)}`}
          icon={<Eye className="w-5 h-5" />}
          variance={impressionsVariance}
          varianceLabel="vs período anterior"
          delay={0.1}
        />

        <KPICard
          title="Cliques"
          value={formatCompact(summary.totalClicks)}
          subtitle={`CTR: ${formatPercent(summary.avgCTR)} • CPC: ${formatCurrency(summary.avgCPC)}`}
          icon={<MousePointer className="w-5 h-5" />}
          variance={clicksVariance}
          varianceLabel="vs período anterior"
          delay={0.2}
        />

        <KPICard
          title="Conversões"
          value={formatNumber(summary.totalConversions)}
          subtitle={`CPA: ${formatCurrency(summary.avgCPA)}`}
          icon={<Target className="w-5 h-5" />}
          variance={conversionsVariance}
          varianceLabel="vs período anterior"
          delay={0.3}
        />
      </div>

      {/* Secondary KPIs */}
      {showSecondary && (
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Leads"
            value={formatNumber(summary.totalLeads)}
            icon={<Users className="w-5 h-5" />}
            delay={0.4}
          />

          <KPICard
            title="Receita"
            value={formatCurrency(summary.totalRevenue)}
            subtitle={summary.roas > 0 ? `ROAS: ${summary.roas.toFixed(2)}x` : undefined}
            icon={<ShoppingCart className="w-5 h-5" />}
            delay={0.5}
          />

          <Card className="overflow-hidden">
            <CardContent className="pt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="flex items-start justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Variação Orçamentária</p>
                  <p
                    className={`text-2xl font-bold font-display tracking-tight ${
                      summary.budgetVariance > 0
                        ? 'text-destructive'
                        : summary.budgetVariance < 0
                        ? 'text-success'
                        : ''
                    }`}
                  >
                    {summary.budgetVariance > 0 ? '+' : ''}
                    {formatCurrency(summary.budgetVariance)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.budgetVariance > 0
                      ? 'Acima do orçamento'
                      : summary.budgetVariance < 0
                      ? 'Abaixo do orçamento'
                      : 'No orçamento'}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-2.5 ${
                    summary.budgetVariance > 0
                      ? 'bg-destructive/10 text-destructive'
                      : summary.budgetVariance < 0
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {summary.budgetVariance > 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : summary.budgetVariance < 0 ? (
                    <TrendingDown className="w-5 h-5" />
                  ) : (
                    <Minus className="w-5 h-5" />
                  )}
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
