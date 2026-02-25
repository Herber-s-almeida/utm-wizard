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

interface Vehicle {
  id: string;
  name: string;
}

interface ReportsDashboardProps {
  reportData: ReportData[];
  mediaLines: MediaLine[];
  totalBudget: number;
  vehicles?: Vehicle[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--ring))',
  'hsl(var(--secondary-foreground))',
];

export function ReportsDashboard({ reportData, mediaLines, totalBudget, vehicles = [] }: ReportsDashboardProps) {
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
    const totalUsers = reportData.reduce((acc, r) => acc + Number(r.total_users || 0), 0);
    const totalNewUsers = reportData.reduce((acc, r) => acc + Number(r.new_users || 0), 0);
    const totalEngagedSessions = reportData.reduce((acc, r) => acc + Number(r.engaged_sessions || 0), 0);

    // Calculated metrics
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
    const avgCPM = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
    const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;
    const newUsersPercent = totalUsers > 0 ? totalNewUsers / totalUsers : 0;
    const engagedSessionsPercent = totalSessions > 0 ? totalEngagedSessions / totalSessions : 0;

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
      totalUsers,
      totalNewUsers,
      totalEngagedSessions,
      avgCTR,
      avgCPC,
      avgCPM,
      avgCPA,
      newUsersPercent,
      engagedSessionsPercent,
      plannedBudget,
      budgetVariance,
    };
  }, [reportData, mediaLines]);

  // Budget comparison chart data - aggregate by line_code and show ALL plan lines
  const budgetComparisonData = useMemo(() => {
    // Create a map of line_code -> media line data
    const lineCodeToLine = new Map<string, MediaLine>();
    for (const line of mediaLines) {
      if (line.line_code) {
        lineCodeToLine.set(line.line_code.toLowerCase().trim(), line);
      }
    }

    // Aggregate report data by line_code
    const actualByLineCode = new Map<string, number>();
    for (const report of reportData) {
      const lc = report.line_code?.toLowerCase().trim();
      if (!lc) continue;
      actualByLineCode.set(lc, (actualByLineCode.get(lc) || 0) + Number(report.cost || 0));
    }

    // Build comparison data for ALL media lines
    const comparisonData = mediaLines.map((line) => {
      const lc = line.line_code?.toLowerCase().trim() || '';
      return {
        name: line.line_code || '-',
        planned: Number(line.budget || 0),
        actual: actualByLineCode.get(lc) || 0,
      };
    });

    // Sort by planned budget descending
    return comparisonData.sort((a, b) => b.planned - a.planned);
  }, [reportData, mediaLines]);

  // Distribution by vehicle
  const distributionData = useMemo(() => {
    // Build a map from vehicle_id to vehicle name
    const vehicleMap = new Map<string, string>();
    for (const v of vehicles) {
      vehicleMap.set(v.id, v.name);
    }

    // Build a map from media_line_id to vehicle_id
    const lineToVehicle = new Map<string, string>();
    for (const line of mediaLines) {
      if (line.vehicle_id) {
        lineToVehicle.set(line.id, line.vehicle_id);
      }
    }

    // Build a map from line_code to vehicle_id
    const lineCodeToVehicle = new Map<string, string>();
    for (const line of mediaLines) {
      if (line.line_code && line.vehicle_id) {
        lineCodeToVehicle.set(line.line_code.toLowerCase().trim(), line.vehicle_id);
      }
    }

    // Aggregate cost by vehicle
    const costByVehicle = new Map<string, number>();
    for (const report of reportData) {
      let vehicleId: string | undefined;
      
      // Try to get vehicle from media_line_id
      if (report.media_line_id) {
        vehicleId = lineToVehicle.get(report.media_line_id);
      }
      
      // Fallback: try to get from line_code
      if (!vehicleId && report.line_code) {
        vehicleId = lineCodeToVehicle.get(report.line_code.toLowerCase().trim());
      }

      const vehicleName = vehicleId ? (vehicleMap.get(vehicleId) || 'Outro') : 'Não identificado';
      costByVehicle.set(vehicleName, (costByVehicle.get(vehicleName) || 0) + Number(report.cost || 0));
    }

    return Array.from(costByVehicle.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [reportData, mediaLines, vehicles]);

  // Daily investment data
  const dailyInvestmentData = useMemo(() => {
    const costByDate = new Map<string, number>();
    
    for (const report of reportData) {
      const date = report.period_start;
      if (!date) continue;
      
      // Format date for grouping (YYYY-MM-DD)
      const dateKey = date.split('T')[0];
      costByDate.set(dateKey, (costByDate.get(dateKey) || 0) + Number(report.cost || 0));
    }

    return Array.from(costByDate.entries())
      .map(([date, cost]) => ({
        date,
        cost,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
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
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Leads</p>
              <p className="text-xl font-bold font-display">
                {formatNumber(aggregatedMetrics.totalLeads)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Sessões</p>
              <p className="text-xl font-bold font-display">
                {formatNumber(aggregatedMetrics.totalSessions)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Vendas</p>
              <p className="text-xl font-bold font-display">
                {formatNumber(aggregatedMetrics.totalSales)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Usuários</p>
              <p className="text-xl font-bold font-display">
                {formatNumber(aggregatedMetrics.totalUsers)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Novos Usuários</p>
              <p className="text-xl font-bold font-display">
                {formatNumber(aggregatedMetrics.totalNewUsers)}
              </p>
              {aggregatedMetrics.totalUsers > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatPercent(aggregatedMetrics.newUsersPercent)} do total
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Sessões Engajadas</p>
              <p className="text-xl font-bold font-display">
                {formatNumber(aggregatedMetrics.totalEngagedSessions)}
              </p>
              {aggregatedMetrics.totalSessions > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatPercent(aggregatedMetrics.engagedSessionsPercent)} das sessões
                </p>
              )}
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
              <ResponsiveContainer width="100%" height={Math.max(300, budgetComparisonData.length * 35)}>
                <BarChart data={budgetComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10 }} />
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

        {/* Distribution by Vehicle Pie Chart */}
        {distributionData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Distribuição por Veículo</CardTitle>
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
                    fill="hsl(var(--primary))"
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

      {/* Daily Investment Chart */}
      {dailyInvestmentData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Investimento por Data</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyInvestmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T00:00:00');
                    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                  }}
                />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => {
                    const d = new Date(label + 'T00:00:00');
                    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                  }}
                />
                <Bar dataKey="cost" name="Investimento" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}