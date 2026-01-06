import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportData } from '@/hooks/useReportData';
import { MediaLine } from '@/types/media';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  Users,
  Target,
  BarChart3,
} from 'lucide-react';

interface ReportsDashboardProps {
  reportData: ReportData[];
  mediaLines: MediaLine[];
  totalBudget: number;
}

const COLORS = [
  'hsl(265, 85%, 55%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(200, 85%, 55%)',
  'hsl(280, 70%, 60%)',
];

export function ReportsDashboard({ reportData, mediaLines, totalBudget }: ReportsDashboardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR').format(value);

  const formatPercent = (value: number) =>
    `${(value * 100).toFixed(2)}%`;

  // Aggregate metrics
  const aggregatedMetrics = useMemo(() => {
    const totalCost = reportData.reduce((acc, r) => acc + Number(r.cost || 0), 0);
    const totalImpressions = reportData.reduce((acc, r) => acc + Number(r.impressions || 0), 0);
    const totalClicks = reportData.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
    const totalLeads = reportData.reduce((acc, r) => acc + Number(r.leads || 0), 0);
    const totalConversions = reportData.reduce((acc, r) => acc + Number(r.conversions || 0), 0);
    const totalSessions = reportData.reduce((acc, r) => acc + Number(r.sessions || 0), 0);
    const totalSales = reportData.reduce((acc, r) => acc + Number(r.sales || 0), 0);

    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
    const avgCPM = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
    const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;

    // Calculate planned budget from matched lines
    const matchedLineIds = new Set(reportData.filter((r) => r.media_line_id).map((r) => r.media_line_id));
    const plannedBudget = mediaLines
      .filter((l) => matchedLineIds.has(l.id))
      .reduce((acc, l) => acc + Number(l.budget || 0), 0);

    const budgetVariance = plannedBudget > 0 ? ((totalCost - plannedBudget) / plannedBudget) * 100 : 0;

    return {
      totalCost,
      totalImpressions,
      totalClicks,
      totalLeads,
      totalConversions,
      totalSessions,
      totalSales,
      avgCTR,
      avgCPC,
      avgCPM,
      avgCPA,
      plannedBudget,
      budgetVariance,
    };
  }, [reportData, mediaLines]);

  // Budget comparison chart data
  const budgetComparisonData = useMemo(() => {
    const lineMap = new Map(mediaLines.map((l) => [l.id, l]));
    
    return reportData
      .filter((r) => r.media_line_id)
      .map((r) => {
        const line = lineMap.get(r.media_line_id!);
        return {
          name: r.line_code,
          planned: Number(line?.budget || 0),
          actual: Number(r.cost || 0),
        };
      })
      .slice(0, 10); // Show top 10
  }, [reportData, mediaLines]);

  // Cost distribution by match status
  const distributionData = useMemo(() => {
    const matched = reportData.filter((r) => r.match_status === 'matched' || r.match_status === 'manual');
    const unmatched = reportData.filter((r) => r.match_status === 'unmatched');

    return [
      { name: 'Casadas', value: matched.reduce((acc, r) => acc + Number(r.cost || 0), 0) },
      { name: 'Não Casadas', value: unmatched.reduce((acc, r) => acc + Number(r.cost || 0), 0) },
    ].filter((d) => d.value > 0);
  }, [reportData]);

  if (reportData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum dado importado ainda. Configure uma fonte de dados para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Investimento Real</p>
                <p className="text-2xl font-bold font-display">
                  {formatCurrency(aggregatedMetrics.totalCost)}
                </p>
                {aggregatedMetrics.budgetVariance !== 0 && (
                  <p
                    className={`text-xs flex items-center gap-1 ${
                      aggregatedMetrics.budgetVariance > 0 ? 'text-destructive' : 'text-success'
                    }`}
                  >
                    {aggregatedMetrics.budgetVariance > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(aggregatedMetrics.budgetVariance).toFixed(1)}% vs planejado
                  </p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impressões</p>
                <p className="text-2xl font-bold font-display">
                  {formatNumber(aggregatedMetrics.totalImpressions)}
                </p>
                <p className="text-xs text-muted-foreground">
                  CPM: {formatCurrency(aggregatedMetrics.avgCPM)}
                </p>
              </div>
              <Eye className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cliques</p>
                <p className="text-2xl font-bold font-display">
                  {formatNumber(aggregatedMetrics.totalClicks)}
                </p>
                <p className="text-xs text-muted-foreground">
                  CTR: {formatPercent(aggregatedMetrics.avgCTR)} • CPC: {formatCurrency(aggregatedMetrics.avgCPC)}
                </p>
              </div>
              <MousePointer className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversões</p>
                <p className="text-2xl font-bold font-display">
                  {formatNumber(aggregatedMetrics.totalConversions)}
                </p>
                <p className="text-xs text-muted-foreground">
                  CPA: {formatCurrency(aggregatedMetrics.avgCPA)}
                </p>
              </div>
              <Target className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads</p>
                <p className="text-2xl font-bold font-display">
                  {formatNumber(aggregatedMetrics.totalLeads)}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessões</p>
                <p className="text-2xl font-bold font-display">
                  {formatNumber(aggregatedMetrics.totalSessions)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vendas</p>
                <p className="text-2xl font-bold font-display">
                  {formatNumber(aggregatedMetrics.totalSales)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budget Comparison Chart */}
        {budgetComparisonData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Planejado vs Realizado</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Bar dataKey="planned" name="Planejado" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="actual" name="Realizado" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Distribution Pie Chart */}
        {distributionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Distribuição de Investimento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}