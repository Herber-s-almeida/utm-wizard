import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportData, ReportImport, SOURCE_CATEGORIES, SourceCategory } from '@/hooks/useReportData';
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
  Activity,
  UserPlus,
  Globe,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--ring))',
  'hsl(var(--secondary-foreground))',
];

export function ReportsDashboard({ reportData, mediaLines, totalBudget, vehicles = [], reportImports = [] }: ReportsDashboardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR').format(value);
  const formatPercent = (value: number) =>
    `${(value * 100).toFixed(2)}%`;

  // Build import category map
  const importCategoryMap = useMemo(() => {
    const map = new Map<string, SourceCategory>();
    for (const imp of reportImports) {
      map.set(imp.id, (imp.source_category || 'media') as SourceCategory);
    }
    return map;
  }, [reportImports]);

  // Split data by category
  const dataByCategory = useMemo(() => {
    const result: Record<SourceCategory, ReportData[]> = {
      media: [],
      analytics: [],
      conversions: [],
      social_organic: [],
    };
    for (const r of reportData) {
      const cat = importCategoryMap.get(r.import_id) || 'media';
      result[cat].push(r);
    }
    return result;
  }, [reportData, importCategoryMap]);

  // Media metrics
  const mediaMetrics = useMemo(() => {
    const data = dataByCategory.media;
    const totalCost = data.reduce((acc, r) => acc + Number(r.cost || 0), 0);
    const totalImpressions = data.reduce((acc, r) => acc + Number(r.impressions || 0), 0);
    const totalClicks = data.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
    const totalConversions = data.reduce((acc, r) => acc + Number(r.conversions || 0), 0);
    const totalLeads = data.reduce((acc, r) => acc + Number(r.leads || 0), 0);
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
    const avgCPM = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
    const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;

    const matchedLineIds = new Set(data.filter((r) => r.media_line_id).map((r) => r.media_line_id));
    const plannedBudget = mediaLines
      .filter((l) => matchedLineIds.has(l.id))
      .reduce((acc, l) => acc + Number(l.budget || 0), 0);
    const budgetVariance = plannedBudget > 0 ? ((totalCost - plannedBudget) / plannedBudget) * 100 : 0;

    return { totalCost, totalImpressions, totalClicks, totalConversions, totalLeads, avgCTR, avgCPC, avgCPM, avgCPA, plannedBudget, budgetVariance };
  }, [dataByCategory.media, mediaLines]);

  // Analytics metrics
  const analyticsMetrics = useMemo(() => {
    const data = dataByCategory.analytics;
    const totalUsers = data.reduce((acc, r) => acc + Number(r.total_users || 0), 0);
    const totalNewUsers = data.reduce((acc, r) => acc + Number(r.new_users || 0), 0);
    const totalSessions = data.reduce((acc, r) => acc + Number(r.sessions || 0), 0);
    const totalEngaged = data.reduce((acc, r) => acc + Number(r.engaged_sessions || 0), 0);
    const totalPageviews = data.reduce((acc, r) => acc + Number(r.pageviews || 0), 0);
    const newUsersPercent = totalUsers > 0 ? totalNewUsers / totalUsers : 0;
    const engagedPercent = totalSessions > 0 ? totalEngaged / totalSessions : 0;
    return { totalUsers, totalNewUsers, totalSessions, totalEngaged, totalPageviews, newUsersPercent, engagedPercent };
  }, [dataByCategory.analytics]);

  // Conversions metrics
  const conversionMetrics = useMemo(() => {
    const data = dataByCategory.conversions;
    const totalLeads = data.reduce((acc, r) => acc + Number(r.leads || 0), 0);
    const totalSales = data.reduce((acc, r) => acc + Number(r.sales || 0), 0);
    const totalConversions = data.reduce((acc, r) => acc + Number(r.conversions || 0), 0);
    const totalCost = data.reduce((acc, r) => acc + Number(r.cost || 0), 0);
    return { totalLeads, totalSales, totalConversions, totalCost };
  }, [dataByCategory.conversions]);

  // Social organic metrics
  const socialMetrics = useMemo(() => {
    const data = dataByCategory.social_organic;
    const totalReach = data.reduce((acc, r) => acc + Number(r.impressions || 0), 0);
    const totalEngagement = data.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
    const totalFollowers = data.reduce((acc, r) => acc + Number(r.total_users || 0), 0);
    return { totalReach, totalEngagement, totalFollowers };
  }, [dataByCategory.social_organic]);

  // Budget comparison chart - only media data
  const budgetComparisonData = useMemo(() => {
    const actualByLineCode = new Map<string, number>();
    for (const report of dataByCategory.media) {
      const lc = report.line_code?.toLowerCase().trim();
      if (!lc) continue;
      actualByLineCode.set(lc, (actualByLineCode.get(lc) || 0) + Number(report.cost || 0));
    }
    return mediaLines
      .map((line) => ({
        name: line.line_code || '-',
        planned: Number(line.budget || 0),
        actual: actualByLineCode.get((line.line_code || '').toLowerCase().trim()) || 0,
      }))
      .sort((a, b) => b.planned - a.planned);
  }, [dataByCategory.media, mediaLines]);

  // Distribution by vehicle - only media data
  const distributionData = useMemo(() => {
    const vehicleMap = new Map<string, string>();
    for (const v of vehicles) vehicleMap.set(v.id, v.name);
    const lineCodeToVehicle = new Map<string, string>();
    for (const line of mediaLines) {
      if (line.line_code && line.vehicle_id) {
        lineCodeToVehicle.set(line.line_code.toLowerCase().trim(), line.vehicle_id);
      }
    }
    const lineToVehicle = new Map<string, string>();
    for (const line of mediaLines) {
      if (line.vehicle_id) lineToVehicle.set(line.id, line.vehicle_id);
    }

    const costByVehicle = new Map<string, number>();
    for (const report of dataByCategory.media) {
      let vehicleId: string | undefined;
      if (report.media_line_id) vehicleId = lineToVehicle.get(report.media_line_id);
      if (!vehicleId && report.line_code) vehicleId = lineCodeToVehicle.get(report.line_code.toLowerCase().trim());
      const vehicleName = vehicleId ? (vehicleMap.get(vehicleId) || 'Outro') : 'Não identificado';
      costByVehicle.set(vehicleName, (costByVehicle.get(vehicleName) || 0) + Number(report.cost || 0));
    }

    return Array.from(costByVehicle.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [dataByCategory.media, mediaLines, vehicles]);

  const hasMedia = dataByCategory.media.length > 0;
  const hasAnalytics = dataByCategory.analytics.length > 0;
  const hasConversions = dataByCategory.conversions.length > 0;
  const hasSocial = dataByCategory.social_organic.length > 0;

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
      {/* ===== MÍDIA PAGA ===== */}
      {hasMedia && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <h2 className="text-lg font-semibold font-display">Mídia Paga</h2>
            <Badge variant="secondary" className="text-xs">{dataByCategory.media.length} linhas</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Investimento</p>
                    <p className="text-2xl font-bold font-display">{formatCurrency(mediaMetrics.totalCost)}</p>
                    {mediaMetrics.budgetVariance !== 0 && (
                      <p className={`text-xs flex items-center gap-1 ${mediaMetrics.budgetVariance > 0 ? 'text-destructive' : 'text-success'}`}>
                        {mediaMetrics.budgetVariance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(mediaMetrics.budgetVariance).toFixed(1)}% vs planejado
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
                    <p className="text-2xl font-bold font-display">{formatNumber(mediaMetrics.totalImpressions)}</p>
                    <p className="text-xs text-muted-foreground">CPM: {formatCurrency(mediaMetrics.avgCPM)}</p>
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
                    <p className="text-2xl font-bold font-display">{formatNumber(mediaMetrics.totalClicks)}</p>
                    <p className="text-xs text-muted-foreground">CTR: {formatPercent(mediaMetrics.avgCTR)} • CPC: {formatCurrency(mediaMetrics.avgCPC)}</p>
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
                    <p className="text-2xl font-bold font-display">{formatNumber(mediaMetrics.totalConversions)}</p>
                    <p className="text-xs text-muted-foreground">CPA: {formatCurrency(mediaMetrics.avgCPA)}</p>
                  </div>
                  <Target className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {budgetComparisonData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium">Planejado vs Realizado</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(300, budgetComparisonData.length * 35)}>
                    <BarChart data={budgetComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="planned" name="Planejado" fill="hsl(var(--muted-foreground))" />
                      <Bar dataKey="actual" name="Realizado" fill="hsl(var(--primary))" />
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
                      <Pie data={distributionData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} fill="hsl(var(--primary))" dataKey="value">
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
        </section>
      )}

      {/* ===== ANALYTICS / SITE ===== */}
      {hasAnalytics && (
        <section className="space-y-4">
          {hasMedia && <Separator />}
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="text-lg font-semibold font-display">Analytics / Site</h2>
            <Badge variant="secondary" className="text-xs">{dataByCategory.analytics.length} linhas</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Usuários</p>
                    <p className="text-2xl font-bold font-display">{formatNumber(analyticsMetrics.totalUsers)}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Novos Usuários</p>
                  <p className="text-2xl font-bold font-display">{formatNumber(analyticsMetrics.totalNewUsers)}</p>
                  {analyticsMetrics.totalUsers > 0 && (
                    <p className="text-xs text-muted-foreground">{formatPercent(analyticsMetrics.newUsersPercent)} do total</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sessões</p>
                    <p className="text-2xl font-bold font-display">{formatNumber(analyticsMetrics.totalSessions)}</p>
                  </div>
                  <Activity className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Sessões Engajadas</p>
                  <p className="text-2xl font-bold font-display">{formatNumber(analyticsMetrics.totalEngaged)}</p>
                  {analyticsMetrics.totalSessions > 0 && (
                    <p className="text-xs text-muted-foreground">{formatPercent(analyticsMetrics.engagedPercent)} das sessões</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pageviews</p>
                    <p className="text-2xl font-bold font-display">{formatNumber(analyticsMetrics.totalPageviews)}</p>
                  </div>
                  <Globe className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ===== CONVERSÕES / CRM ===== */}
      {hasConversions && (
        <section className="space-y-4">
          {(hasMedia || hasAnalytics) && <Separator />}
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h2 className="text-lg font-semibold font-display">Conversões / CRM</h2>
            <Badge variant="secondary" className="text-xs">{dataByCategory.conversions.length} linhas</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Leads</p>
                  <p className="text-2xl font-bold font-display">{formatNumber(conversionMetrics.totalLeads)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Vendas</p>
                  <p className="text-2xl font-bold font-display">{formatNumber(conversionMetrics.totalSales)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Conversões</p>
                  <p className="text-2xl font-bold font-display">{formatNumber(conversionMetrics.totalConversions)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold font-display">{formatCurrency(conversionMetrics.totalCost)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ===== REDES SOCIAIS (ORGÂNICO) ===== */}
      {hasSocial && (
        <section className="space-y-4">
          {(hasMedia || hasAnalytics || hasConversions) && <Separator />}
          <div className="flex items-center gap-2">
            <span className="text-lg">📱</span>
            <h2 className="text-lg font-semibold font-display">Redes Sociais (Orgânico)</h2>
            <Badge variant="secondary" className="text-xs">{dataByCategory.social_organic.length} linhas</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Alcance</p>
                  <p className="text-2xl font-bold font-display">{formatNumber(socialMetrics.totalReach)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Engajamento</p>
                  <p className="text-2xl font-bold font-display">{formatNumber(socialMetrics.totalEngagement)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Seguidores</p>
                  <p className="text-2xl font-bold font-display">{formatNumber(socialMetrics.totalFollowers)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
