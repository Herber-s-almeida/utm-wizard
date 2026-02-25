import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportData, ReportImport, SOURCE_CATEGORIES, SourceCategory } from '@/hooks/useReportData';
import { MediaLine } from '@/types/media';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
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
  Activity,
  UserPlus,
  Globe,
  Calendar,
  Zap,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Vehicle {
  id: string;
  name: string;
}

interface ReportsDashboardProps {
  reportData: ReportData[];
  mediaLines: MediaLine[];
  totalBudget: number;
  vehicles?: Vehicle[];
  reportImports?: ReportImport[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--ring))',
  'hsl(var(--secondary-foreground))',
];

const MEDIA_COLOR = 'hsl(var(--primary))';
const ANALYTICS_COLOR = 'hsl(var(--chart-2))';
const CONVERSION_COLOR = 'hsl(var(--chart-3))';

export function ReportsDashboard({ reportData, mediaLines, totalBudget, vehicles = [], reportImports = [] }: ReportsDashboardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR').format(value);
  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return formatNumber(value);
  };
  const formatPercent = (value: number) =>
    `${(value * 100).toFixed(2)}%`;

  // ──── Aggregate all metrics (category-agnostic for maximum coverage) ────
  const allMetrics = useMemo(() => {
    const totalCost = reportData.reduce((acc, r) => acc + Number(r.cost || 0), 0);
    const totalImpressions = reportData.reduce((acc, r) => acc + Number(r.impressions || 0), 0);
    const totalClicks = reportData.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
    const totalConversions = reportData.reduce((acc, r) => acc + Number(r.conversions || 0), 0);
    const totalLeads = reportData.reduce((acc, r) => acc + Number(r.leads || 0), 0);
    const totalSales = reportData.reduce((acc, r) => acc + Number(r.sales || 0), 0);
    const totalSessions = reportData.reduce((acc, r) => acc + Number(r.sessions || 0), 0);
    const totalUsers = reportData.reduce((acc, r) => acc + Number(r.total_users || 0), 0);
    const totalNewUsers = reportData.reduce((acc, r) => acc + Number(r.new_users || 0), 0);
    const totalEngaged = reportData.reduce((acc, r) => acc + Number(r.engaged_sessions || 0), 0);
    const totalPageviews = reportData.reduce((acc, r) => acc + Number(r.pageviews || 0), 0);

    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
    const avgCPM = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
    const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;
    const newUsersPercent = totalUsers > 0 ? totalNewUsers / totalUsers : 0;
    const engagedPercent = totalSessions > 0 ? totalEngaged / totalSessions : 0;
    const costPerSession = totalSessions > 0 ? totalCost / totalSessions : 0;
    const costPerUser = totalUsers > 0 ? totalCost / totalUsers : 0;
    const pagesPerSession = totalSessions > 0 ? totalPageviews / totalSessions : 0;

    const matchedLineIds = new Set(reportData.filter((r) => r.media_line_id).map((r) => r.media_line_id));
    const plannedBudget = mediaLines
      .filter((l) => matchedLineIds.has(l.id))
      .reduce((acc, l) => acc + Number(l.budget || 0), 0);
    const budgetVariance = plannedBudget > 0 ? ((totalCost - plannedBudget) / plannedBudget) * 100 : 0;
    const budgetExecution = totalBudget > 0 ? (totalCost / totalBudget) * 100 : 0;

    return {
      totalCost, totalImpressions, totalClicks, totalConversions, totalLeads, totalSales,
      totalSessions, totalUsers, totalNewUsers, totalEngaged, totalPageviews,
      avgCTR, avgCPC, avgCPM, avgCPA,
      newUsersPercent, engagedPercent, costPerSession, costPerUser, pagesPerSession,
      plannedBudget, budgetVariance, budgetExecution,
    };
  }, [reportData, mediaLines, totalBudget]);

  // ──── Daily timeline data ────
  const dailyData = useMemo(() => {
    const byDate = new Map<string, {
      cost: number; impressions: number; clicks: number; conversions: number;
      sessions: number; users: number; newUsers: number; engaged: number; pageviews: number;
    }>();

    for (const r of reportData) {
      const dateKey = r.period_start || r.period_end;
      if (!dateKey) continue;
      const d = dateKey.substring(0, 10);
      const existing = byDate.get(d) || { cost: 0, impressions: 0, clicks: 0, conversions: 0, sessions: 0, users: 0, newUsers: 0, engaged: 0, pageviews: 0 };
      existing.cost += Number(r.cost || 0);
      existing.impressions += Number(r.impressions || 0);
      existing.clicks += Number(r.clicks || 0);
      existing.conversions += Number(r.conversions || 0);
      existing.sessions += Number(r.sessions || 0);
      existing.users += Number(r.total_users || 0);
      existing.newUsers += Number(r.new_users || 0);
      existing.engaged += Number(r.engaged_sessions || 0);
      existing.pageviews += Number(r.pageviews || 0);
      byDate.set(d, existing);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        dateLabel: (() => { try { return format(parseISO(date), 'dd/MM', { locale: ptBR }); } catch { return date; } })(),
        ...v,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        cpc: v.clicks > 0 ? v.cost / v.clicks : 0,
        engagementRate: v.sessions > 0 ? (v.engaged / v.sessions) * 100 : 0,
      }));
  }, [reportData]);

  // ──── Budget comparison by line code ────
  const budgetComparisonData = useMemo(() => {
    const actualByLineCode = new Map<string, number>();
    for (const r of reportData) {
      const lc = r.line_code?.toLowerCase().trim();
      if (!lc) continue;
      actualByLineCode.set(lc, (actualByLineCode.get(lc) || 0) + Number(r.cost || 0));
    }
    return mediaLines
      .map((line) => ({
        name: line.line_code || '-',
        planned: Number(line.budget || 0),
        actual: actualByLineCode.get((line.line_code || '').toLowerCase().trim()) || 0,
      }))
      .filter((d) => d.planned > 0 || d.actual > 0)
      .sort((a, b) => b.planned - a.planned);
  }, [reportData, mediaLines]);

  // ──── Distribution by vehicle ────
  const distributionData = useMemo(() => {
    const vehicleMap = new Map<string, string>();
    for (const v of vehicles) vehicleMap.set(v.id, v.name);
    const lineToVehicle = new Map<string, string>();
    const lineCodeToVehicle = new Map<string, string>();
    for (const line of mediaLines) {
      if (line.vehicle_id) {
        lineToVehicle.set(line.id, line.vehicle_id);
        if (line.line_code) lineCodeToVehicle.set(line.line_code.toLowerCase().trim(), line.vehicle_id);
      }
    }
    const costByVehicle = new Map<string, number>();
    for (const r of reportData) {
      if (Number(r.cost || 0) === 0) continue;
      let vehicleId: string | undefined;
      if (r.media_line_id) vehicleId = lineToVehicle.get(r.media_line_id);
      if (!vehicleId && r.line_code) vehicleId = lineCodeToVehicle.get(r.line_code.toLowerCase().trim());
      const vehicleName = vehicleId ? (vehicleMap.get(vehicleId) || 'Outro') : 'Não identificado';
      costByVehicle.set(vehicleName, (costByVehicle.get(vehicleName) || 0) + Number(r.cost || 0));
    }
    return Array.from(costByVehicle.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [reportData, mediaLines, vehicles]);

  // ──── Impressions/clicks by source ────
  const sourceBreakdown = useMemo(() => {
    const bySource = new Map<string, { cost: number; impressions: number; clicks: number; sessions: number; users: number }>();
    const importNameMap = new Map<string, string>();
    for (const imp of reportImports) importNameMap.set(imp.id, imp.source_name);

    for (const r of reportData) {
      const name = importNameMap.get(r.import_id) || 'Desconhecido';
      const existing = bySource.get(name) || { cost: 0, impressions: 0, clicks: 0, sessions: 0, users: 0 };
      existing.cost += Number(r.cost || 0);
      existing.impressions += Number(r.impressions || 0);
      existing.clicks += Number(r.clicks || 0);
      existing.sessions += Number(r.sessions || 0);
      existing.users += Number(r.total_users || 0);
      bySource.set(name, existing);
    }
    return Array.from(bySource.entries()).map(([name, v]) => ({ name, ...v }));
  }, [reportData, reportImports]);

  const hasDailyData = dailyData.length > 1;
  const hasCost = allMetrics.totalCost > 0;
  const hasImpressions = allMetrics.totalImpressions > 0;
  const hasSessions = allMetrics.totalSessions > 0;
  const hasUsers = allMetrics.totalUsers > 0;
  const hasEngaged = allMetrics.totalEngaged > 0;
  const hasPageviews = allMetrics.totalPageviews > 0;
  const hasConversions = allMetrics.totalConversions > 0 || allMetrics.totalLeads > 0;

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
    <div className="space-y-8">
      {/* ═══════════════ VISÃO GERAL ═══════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold font-display">Visão Geral</h2>
          <Badge variant="secondary" className="text-xs">{formatNumber(reportData.length)} registros</Badge>
          {dailyData.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Calendar className="w-3 h-3" />
              {dailyData[0].dateLabel} – {dailyData[dailyData.length - 1].dateLabel}
            </Badge>
          )}
        </div>

        {/* KPI Row 1: Investment & Media Performance */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {hasCost && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Investimento Total</p>
                    <p className="text-2xl font-bold font-display">{formatCurrency(allMetrics.totalCost)}</p>
                    {allMetrics.budgetVariance !== 0 && (
                      <p className={`text-xs flex items-center gap-1 ${allMetrics.budgetVariance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {allMetrics.budgetVariance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(allMetrics.budgetVariance).toFixed(1)}% vs planejado
                      </p>
                    )}
                    {totalBudget > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {allMetrics.budgetExecution.toFixed(1)}% do orçamento executado
                      </p>
                    )}
                  </div>
                  <DollarSign className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          )}
          {hasImpressions && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Impressões</p>
                    <p className="text-2xl font-bold font-display">{formatCompact(allMetrics.totalImpressions)}</p>
                    {hasCost && <p className="text-xs text-muted-foreground">CPM: {formatCurrency(allMetrics.avgCPM)}</p>}
                  </div>
                  <Eye className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          )}
          {allMetrics.totalClicks > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliques</p>
                    <p className="text-2xl font-bold font-display">{formatCompact(allMetrics.totalClicks)}</p>
                    <p className="text-xs text-muted-foreground">
                      CTR: {formatPercent(allMetrics.avgCTR)}
                      {hasCost && <> • CPC: {formatCurrency(allMetrics.avgCPC)}</>}
                    </p>
                  </div>
                  <MousePointer className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          )}
          {hasConversions && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Conversões</p>
                    <p className="text-2xl font-bold font-display">{formatNumber(allMetrics.totalConversions)}</p>
                    {hasCost && allMetrics.totalConversions > 0 && (
                      <p className="text-xs text-muted-foreground">CPA: {formatCurrency(allMetrics.avgCPA)}</p>
                    )}
                    {allMetrics.totalLeads > 0 && (
                      <p className="text-xs text-muted-foreground">Leads: {formatNumber(allMetrics.totalLeads)}</p>
                    )}
                  </div>
                  <Target className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          )}
          {allMetrics.totalSales > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas</p>
                    <p className="text-2xl font-bold font-display">{formatNumber(allMetrics.totalSales)}</p>
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* KPI Row 2: Site / Analytics */}
        {(hasUsers || hasSessions || hasEngaged || hasPageviews) && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {hasUsers && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Usuários</p>
                      <p className="text-2xl font-bold font-display">{formatCompact(allMetrics.totalUsers)}</p>
                      {hasCost && <p className="text-xs text-muted-foreground">Custo/Usuário: {formatCurrency(allMetrics.costPerUser)}</p>}
                    </div>
                    <Users className="w-8 h-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
            )}
            {allMetrics.totalNewUsers > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Novos Usuários</p>
                    <p className="text-2xl font-bold font-display">{formatCompact(allMetrics.totalNewUsers)}</p>
                    {allMetrics.totalUsers > 0 && (
                      <p className="text-xs text-muted-foreground">{formatPercent(allMetrics.newUsersPercent)} do total</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {hasSessions && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sessões</p>
                      <p className="text-2xl font-bold font-display">{formatCompact(allMetrics.totalSessions)}</p>
                      {hasCost && <p className="text-xs text-muted-foreground">Custo/Sessão: {formatCurrency(allMetrics.costPerSession)}</p>}
                    </div>
                    <Activity className="w-8 h-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
            )}
            {hasEngaged && (
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Sessões Engajadas</p>
                    <p className="text-2xl font-bold font-display">{formatCompact(allMetrics.totalEngaged)}</p>
                    {hasSessions && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {formatPercent(allMetrics.engagedPercent)} de engajamento
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {hasPageviews && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pageviews</p>
                      <p className="text-2xl font-bold font-display">{formatCompact(allMetrics.totalPageviews)}</p>
                      {hasSessions && (
                        <p className="text-xs text-muted-foreground">{allMetrics.pagesPerSession.toFixed(1)} págs/sessão</p>
                      )}
                    </div>
                    <Globe className="w-8 h-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════ TIMELINE CHARTS ═══════════════ */}
      {hasDailyData && (
        <section className="space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-display">Evolução Diária</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Investment */}
            {hasCost && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Investimento Diário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={MEDIA_COLOR} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={MEDIA_COLOR} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Data: ${label}`}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="cost" name="Investimento" stroke={MEDIA_COLOR} fill="url(#costGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Daily Impressions & Clicks */}
            {hasImpressions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Impressões & Cliques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} contentStyle={{ fontSize: 12 }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="impressions" name="Impressões" fill={MEDIA_COLOR} opacity={0.3} />
                      <Line yAxisId="right" type="monotone" dataKey="clicks" name="Cliques" stroke={CONVERSION_COLOR} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Daily Sessions & Users */}
            {hasSessions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Sessões & Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} contentStyle={{ fontSize: 12 }} />
                      <Legend />
                      <Line type="monotone" dataKey="sessions" name="Sessões" stroke={ANALYTICS_COLOR} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="users" name="Usuários" stroke={MEDIA_COLOR} strokeWidth={2} dot={false} />
                      {hasEngaged && (
                        <Line type="monotone" dataKey="engaged" name="Engajadas" stroke={CONVERSION_COLOR} strokeWidth={2} dot={false} strokeDasharray="4 4" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Engagement Rate over time */}
            {hasEngaged && hasDailyData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Taxa de Engajamento (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="engGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CONVERSION_COLOR} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CONVERSION_COLOR} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Engajamento']} contentStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="engagementRate" name="Engajamento" stroke={CONVERSION_COLOR} fill="url(#engGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* CTR over time */}
            {hasImpressions && hasDailyData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-primary" />
                    CTR Diário (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(3)}%`, 'CTR']} contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="ctr" name="CTR" stroke={MEDIA_COLOR} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* CPC over time */}
            {hasCost && allMetrics.totalClicks > 0 && hasDailyData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    CPC Diário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyData.filter((d) => d.cpc > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `R$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'CPC']} contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="cpc" name="CPC" stroke={ANALYTICS_COLOR} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════ PLANEJADO vs REALIZADO + DISTRIBUIÇÃO ═══════════════ */}
      {(budgetComparisonData.length > 0 || distributionData.length > 0 || sourceBreakdown.length > 1) && (
        <section className="space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-display">Análise Comparativa</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {budgetComparisonData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium">Planejado vs Realizado</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(300, budgetComparisonData.length * 40)}>
                    <BarChart data={budgetComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => formatCompact(v)} />
                      <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="planned" name="Planejado" fill="hsl(var(--muted-foreground))" />
                      <Bar dataKey="actual" name="Realizado" fill={MEDIA_COLOR} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {distributionData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium">Distribuição por Veículo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={distributionData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} fill={MEDIA_COLOR} dataKey="value">
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

            {/* Source breakdown table */}
            {sourceBreakdown.length > 1 && (
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base font-medium">Comparativo por Fonte de Dados</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fonte</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Investimento</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Impressões</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Cliques</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">CTR</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Sessões</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Usuários</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceBreakdown.map((src) => (
                          <tr key={src.name} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 px-3 font-medium">{src.name}</td>
                            <td className="py-2 px-3 text-right">{src.cost > 0 ? formatCurrency(src.cost) : '-'}</td>
                            <td className="py-2 px-3 text-right">{src.impressions > 0 ? formatCompact(src.impressions) : '-'}</td>
                            <td className="py-2 px-3 text-right">{src.clicks > 0 ? formatCompact(src.clicks) : '-'}</td>
                            <td className="py-2 px-3 text-right">{src.impressions > 0 ? formatPercent(src.clicks / src.impressions) : '-'}</td>
                            <td className="py-2 px-3 text-right">{src.sessions > 0 ? formatCompact(src.sessions) : '-'}</td>
                            <td className="py-2 px-3 text-right">{src.users > 0 ? formatCompact(src.users) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
