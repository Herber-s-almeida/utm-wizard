import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportData, ReportImport, SOURCE_CATEGORIES, SourceCategory } from '@/hooks/useReportData';
import { MediaLine } from '@/types/media';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, Users, Target,
  BarChart3, Activity, Zap, ArrowUpRight, Layers, Calendar as CalendarIcon,
  Globe, Filter, Search, X,
} from 'lucide-react';
import { format, parseISO, subDays, startOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConfigEntity {
  id: string;
  name: string;
}

interface ReportsDashboardProps {
  reportData: ReportData[];
  mediaLines: MediaLine[];
  totalBudget: number;
  vehicles?: ConfigEntity[];
  reportImports?: ReportImport[];
  subdivisions?: ConfigEntity[];
  moments?: ConfigEntity[];
  funnelStages?: ConfigEntity[];
  mediums?: ConfigEntity[];
  channels?: ConfigEntity[];
  targets?: ConfigEntity[];
}

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))',
  'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))',
  'hsl(var(--ring))', 'hsl(var(--secondary-foreground))',
];
const MEDIA_COLOR = 'hsl(var(--primary))';
const ACCENT_COLOR = 'hsl(var(--success))';
const TERTIARY_COLOR = 'hsl(var(--warning))';

type DatePreset = '7d' | '30d' | 'month' | 'custom' | 'all';

export function ReportsDashboard({
  reportData, mediaLines, totalBudget, vehicles = [], reportImports = [],
  subdivisions = [], moments = [], funnelStages = [], mediums = [], channels = [], targets = [],
}: ReportsDashboardProps) {
  // ──── Filter State ────
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [campaignIdSearch, setCampaignIdSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterMedium, setFilterMedium] = useState<string>('all');
  const [filterFunnel, setFilterFunnel] = useState<string>('all');
  const [filterSubdivision, setFilterSubdivision] = useState<string>('all');
  const [filterMoment, setFilterMoment] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');

  // ──── Formatters ────
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR').format(value);
  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return formatNumber(value);
  };
  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  // ──── Available filter options from current plan lines ────
  const availableFilters = useMemo(() => {
    const vIds = new Set(mediaLines.map(l => l.vehicle_id).filter(Boolean));
    const mIds = new Set(mediaLines.map(l => l.medium_id).filter(Boolean));
    const fIds = new Set(mediaLines.map(l => l.funnel_stage_id).filter(Boolean));
    const sIds = new Set(mediaLines.map(l => l.subdivision_id).filter(Boolean));
    const moIds = new Set(mediaLines.map(l => l.moment_id).filter(Boolean));
    const cIds = new Set(mediaLines.map(l => l.channel_id).filter(Boolean));
    const tIds = new Set(mediaLines.map(l => l.target_id).filter(Boolean));
    return {
      vehicles: vehicles.filter(v => vIds.has(v.id)),
      mediums: mediums.filter(m => mIds.has(m.id)),
      funnelStages: funnelStages.filter(f => fIds.has(f.id)),
      subdivisions: subdivisions.filter(s => sIds.has(s.id)),
      moments: moments.filter(m => moIds.has(m.id)),
      channels: channels.filter(c => cIds.has(c.id)),
      targets: targets.filter(t => tIds.has(t.id)),
    };
  }, [mediaLines, vehicles, mediums, funnelStages, subdivisions, moments, channels, targets]);

  // ──── Date range from preset ────
  const effectiveDateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case '7d': return { from: subDays(now, 7), to: now };
      case '30d': return { from: subDays(now, 30), to: now };
      case 'month': return { from: startOfMonth(subMonths(now, 1)), to: now };
      case 'custom': return { from: dateFrom, to: dateTo };
      default: return { from: undefined, to: undefined };
    }
  }, [datePreset, dateFrom, dateTo]);

  // ──── Filter media lines by advanced filters ────
  const filteredLineIds = useMemo(() => {
    let lines = mediaLines;
    if (filterVehicle !== 'all') lines = lines.filter(l => l.vehicle_id === filterVehicle);
    if (filterMedium !== 'all') lines = lines.filter(l => l.medium_id === filterMedium);
    if (filterFunnel !== 'all') lines = lines.filter(l => l.funnel_stage_id === filterFunnel);
    if (filterSubdivision !== 'all') lines = lines.filter(l => l.subdivision_id === filterSubdivision);
    if (filterMoment !== 'all') lines = lines.filter(l => l.moment_id === filterMoment);
    if (filterChannel !== 'all') lines = lines.filter(l => l.channel_id === filterChannel);
    if (filterTarget !== 'all') lines = lines.filter(l => l.target_id === filterTarget);
    return new Set(lines.map(l => l.id));
  }, [mediaLines, filterVehicle, filterMedium, filterFunnel, filterSubdivision, filterMoment, filterChannel, filterTarget]);

  const hasAdvancedFilter = filterVehicle !== 'all' || filterMedium !== 'all' || filterFunnel !== 'all' ||
    filterSubdivision !== 'all' || filterMoment !== 'all' || filterChannel !== 'all' || filterTarget !== 'all';

  // ──── Filtered line codes for campaign search ────
  const filteredLineCodes = useMemo(() => {
    if (!campaignIdSearch) return null;
    const search = campaignIdSearch.toLowerCase().trim();
    return new Set(
      mediaLines
        .filter(l => l.line_code?.toLowerCase().includes(search))
        .map(l => l.line_code?.toLowerCase().trim())
        .filter(Boolean)
    );
  }, [campaignIdSearch, mediaLines]);

  // ──── Apply all filters to reportData ────
  const filteredReportData = useMemo(() => {
    let data = reportData;

    // Date filter
    if (effectiveDateRange.from || effectiveDateRange.to) {
      data = data.filter(r => {
        const dateStr = r.period_start || r.period_end;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        if (effectiveDateRange.from && date < effectiveDateRange.from) return false;
        if (effectiveDateRange.to && date > effectiveDateRange.to) return false;
        return true;
      });
    }

    // Advanced filters (by line association)
    if (hasAdvancedFilter) {
      data = data.filter(r => {
        if (r.media_line_id) return filteredLineIds.has(r.media_line_id);
        // Try matching by line_code
        if (r.line_code) {
          const code = r.line_code.toLowerCase().trim();
          return mediaLines.some(l => l.line_code?.toLowerCase().trim() === code && filteredLineIds.has(l.id));
        }
        return false;
      });
    }

    // Campaign ID filter
    if (filteredLineCodes) {
      data = data.filter(r => {
        const code = r.line_code?.toLowerCase().trim();
        return code && filteredLineCodes.has(code);
      });
    }

    return data;
  }, [reportData, effectiveDateRange, hasAdvancedFilter, filteredLineIds, filteredLineCodes, mediaLines]);

  // ──── Aggregate metrics ────
  const allMetrics = useMemo(() => {
    const totalCost = filteredReportData.reduce((acc, r) => acc + Number(r.cost || 0), 0);
    const totalImpressions = filteredReportData.reduce((acc, r) => acc + Number(r.impressions || 0), 0);
    const totalClicks = filteredReportData.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
    const totalConversions = filteredReportData.reduce((acc, r) => acc + Number(r.conversions || 0), 0);
    const totalLeads = filteredReportData.reduce((acc, r) => acc + Number(r.leads || 0), 0);
    const totalSales = filteredReportData.reduce((acc, r) => acc + Number(r.sales || 0), 0);
    const totalSessions = filteredReportData.reduce((acc, r) => acc + Number(r.sessions || 0), 0);
    const totalUsers = filteredReportData.reduce((acc, r) => acc + Number(r.total_users || 0), 0);
    const totalNewUsers = filteredReportData.reduce((acc, r) => acc + Number(r.new_users || 0), 0);
    const totalEngaged = filteredReportData.reduce((acc, r) => acc + Number(r.engaged_sessions || 0), 0);
    const totalPageviews = filteredReportData.reduce((acc, r) => acc + Number(r.pageviews || 0), 0);

    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
    const avgCPM = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
    const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;
    const newUsersPercent = totalUsers > 0 ? totalNewUsers / totalUsers : 0;
    const engagedPercent = totalSessions > 0 ? totalEngaged / totalSessions : 0;
    const costPerSession = totalSessions > 0 ? totalCost / totalSessions : 0;
    const costPerUser = totalUsers > 0 ? totalCost / totalUsers : 0;
    const pagesPerSession = totalSessions > 0 ? totalPageviews / totalSessions : 0;

    const matchedLineIds = new Set(filteredReportData.filter(r => r.media_line_id).map(r => r.media_line_id));
    const plannedBudget = mediaLines
      .filter(l => matchedLineIds.has(l.id))
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
  }, [filteredReportData, mediaLines, totalBudget]);

  // ──── Daily timeline data ────
  const dailyData = useMemo(() => {
    const byDate = new Map<string, {
      cost: number; impressions: number; clicks: number; conversions: number;
      sessions: number; users: number; newUsers: number; engaged: number; pageviews: number;
    }>();
    for (const r of filteredReportData) {
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
        date, dateLabel: (() => { try { return format(parseISO(date), 'dd/MM', { locale: ptBR }); } catch { return date; } })(),
        ...v,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        cpc: v.clicks > 0 ? v.cost / v.clicks : 0,
        engagementRate: v.sessions > 0 ? (v.engaged / v.sessions) * 100 : 0,
      }));
  }, [filteredReportData]);

  // ──── Budget comparison ────
  const budgetComparisonData = useMemo(() => {
    const actualByLineCode = new Map<string, number>();
    for (const r of filteredReportData) {
      const lc = r.line_code?.toLowerCase().trim();
      if (!lc) continue;
      actualByLineCode.set(lc, (actualByLineCode.get(lc) || 0) + Number(r.cost || 0));
    }
    return mediaLines
      .map(line => ({
        name: line.line_code || '-',
        planned: Number(line.budget || 0),
        actual: actualByLineCode.get((line.line_code || '').toLowerCase().trim()) || 0,
      }))
      .filter(d => d.planned > 0 || d.actual > 0)
      .sort((a, b) => b.planned - a.planned);
  }, [filteredReportData, mediaLines]);

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
    for (const r of filteredReportData) {
      if (Number(r.cost || 0) === 0) continue;
      let vehicleId: string | undefined;
      if (r.media_line_id) vehicleId = lineToVehicle.get(r.media_line_id);
      if (!vehicleId && r.line_code) vehicleId = lineCodeToVehicle.get(r.line_code.toLowerCase().trim());
      const vehicleName = vehicleId ? (vehicleMap.get(vehicleId) || 'Outro') : 'Não identificado';
      costByVehicle.set(vehicleName, (costByVehicle.get(vehicleName) || 0) + Number(r.cost || 0));
    }
    return Array.from(costByVehicle.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredReportData, mediaLines, vehicles]);

  // ──── Source breakdown ────
  const sourceBreakdown = useMemo(() => {
    const bySource = new Map<string, { cost: number; impressions: number; clicks: number; sessions: number; users: number }>();
    const importNameMap = new Map<string, string>();
    for (const imp of reportImports) importNameMap.set(imp.id, imp.source_name);
    for (const r of filteredReportData) {
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
  }, [filteredReportData, reportImports]);

  // ──── Distribution by Funnel Stage ────
  const funnelDistributionData = useMemo(() => {
    if (funnelStages.length === 0) return [];
    const funnelMap = new Map<string, string>();
    for (const f of funnelStages) funnelMap.set(f.id, f.name);
    const lineToFunnel = new Map<string, string>();
    const lineCodeToFunnel = new Map<string, string>();
    for (const line of mediaLines) {
      if (line.funnel_stage_id) {
        lineToFunnel.set(line.id, line.funnel_stage_id);
        if (line.line_code) lineCodeToFunnel.set(line.line_code.toLowerCase().trim(), line.funnel_stage_id);
      }
    }
    const costByFunnel = new Map<string, number>();
    for (const r of filteredReportData) {
      const cost = Number(r.cost || 0);
      if (cost === 0) continue;
      let funnelId: string | undefined;
      if (r.media_line_id) funnelId = lineToFunnel.get(r.media_line_id);
      if (!funnelId && r.line_code) funnelId = lineCodeToFunnel.get(r.line_code.toLowerCase().trim());
      const name = funnelId ? (funnelMap.get(funnelId) || 'Outro') : 'Não identificado';
      costByFunnel.set(name, (costByFunnel.get(name) || 0) + cost);
    }
    return Array.from(costByFunnel.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredReportData, mediaLines, funnelStages]);

  // ──── Distribution by Subdivision ────
  const subdivisionDistributionData = useMemo(() => {
    if (subdivisions.length === 0) return [];
    const subMap = new Map<string, string>();
    for (const s of subdivisions) subMap.set(s.id, s.name);
    const lineToSub = new Map<string, string>();
    const lineCodeToSub = new Map<string, string>();
    for (const line of mediaLines) {
      if (line.subdivision_id) {
        lineToSub.set(line.id, line.subdivision_id);
        if (line.line_code) lineCodeToSub.set(line.line_code.toLowerCase().trim(), line.subdivision_id);
      }
    }
    const costBySub = new Map<string, number>();
    for (const r of filteredReportData) {
      const cost = Number(r.cost || 0);
      if (cost === 0) continue;
      let subId: string | undefined;
      if (r.media_line_id) subId = lineToSub.get(r.media_line_id);
      if (!subId && r.line_code) subId = lineCodeToSub.get(r.line_code.toLowerCase().trim());
      const name = subId ? (subMap.get(subId) || 'Outro') : 'Não identificado';
      costBySub.set(name, (costBySub.get(name) || 0) + cost);
    }
    return Array.from(costBySub.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredReportData, mediaLines, subdivisions]);

  // ──── Distribution by Moment ────
  const momentDistributionData = useMemo(() => {
    if (moments.length === 0) return [];
    const momMap = new Map<string, string>();
    for (const m of moments) momMap.set(m.id, m.name);
    const lineToMom = new Map<string, string>();
    const lineCodeToMom = new Map<string, string>();
    for (const line of mediaLines) {
      if (line.moment_id) {
        lineToMom.set(line.id, line.moment_id);
        if (line.line_code) lineCodeToMom.set(line.line_code.toLowerCase().trim(), line.moment_id);
      }
    }
    const costByMom = new Map<string, number>();
    for (const r of filteredReportData) {
      const cost = Number(r.cost || 0);
      if (cost === 0) continue;
      let momId: string | undefined;
      if (r.media_line_id) momId = lineToMom.get(r.media_line_id);
      if (!momId && r.line_code) momId = lineCodeToMom.get(r.line_code.toLowerCase().trim());
      const name = momId ? (momMap.get(momId) || 'Outro') : 'Não identificado';
      costByMom.set(name, (costByMom.get(name) || 0) + cost);
    }
    return Array.from(costByMom.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredReportData, mediaLines, moments]);

  // ──── Campaign ID table data (only matching plan line_codes) ────
  const planLineCodes = useMemo(() => {
    return new Set(mediaLines.map(l => l.line_code?.trim().toLowerCase()).filter(Boolean));
  }, [mediaLines]);

  const campaignTableData = useMemo(() => {
    const byCode = new Map<string, {
      impressions: number; clicks: number; cost: number; sessions: number; engaged: number;
    }>();
    for (const r of filteredReportData) {
      const code = r.line_code?.trim();
      if (!code) continue;
      // Only include codes that match plan line_codes
      if (!planLineCodes.has(code.toLowerCase())) continue;
      const existing = byCode.get(code) || { impressions: 0, clicks: 0, cost: 0, sessions: 0, engaged: 0 };
      existing.impressions += Number(r.impressions || 0);
      existing.clicks += Number(r.clicks || 0);
      existing.cost += Number(r.cost || 0);
      existing.sessions += Number(r.sessions || 0);
      existing.engaged += Number(r.engaged_sessions || 0);
      byCode.set(code, existing);
    }
    return Array.from(byCode.entries())
      .map(([code, v]) => ({
        code, ...v,
        ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
        cpc: v.clicks > 0 ? v.cost / v.clicks : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [filteredReportData, planLineCodes]);

  const hasDailyData = dailyData.length > 1;
  const hasCost = allMetrics.totalCost > 0;
  const hasImpressions = allMetrics.totalImpressions > 0;
  const hasSessions = allMetrics.totalSessions > 0;
  const hasUsers = allMetrics.totalUsers > 0;
  const hasEngaged = allMetrics.totalEngaged > 0;
  const hasPageviews = allMetrics.totalPageviews > 0;
  const hasConversions = allMetrics.totalConversions > 0 || allMetrics.totalLeads > 0;

  const clearAllFilters = () => {
    setDatePreset('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCampaignIdSearch('');
    setFilterVehicle('all');
    setFilterMedium('all');
    setFilterFunnel('all');
    setFilterSubdivision('all');
    setFilterMoment('all');
    setFilterChannel('all');
    setFilterTarget('all');
  };

  const activeFilterCount = [
    datePreset !== 'all',
    campaignIdSearch !== '',
    filterVehicle !== 'all', filterMedium !== 'all', filterFunnel !== 'all',
    filterSubdivision !== 'all', filterMoment !== 'all', filterChannel !== 'all', filterTarget !== 'all',
  ].filter(Boolean).length;

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

  const FilterSelect = ({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void; options: ConfigEntity[];
  }) => {
    if (options.length === 0) return null;
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {options.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* ═══════════════ FILTROS ═══════════════ */}
      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Presets */}
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-1">
                {([
                  { value: 'all' as DatePreset, label: 'Tudo' },
                  { value: '7d' as DatePreset, label: '7 dias' },
                  { value: '30d' as DatePreset, label: '30 dias' },
                  { value: 'month' as DatePreset, label: 'Último mês' },
                  { value: 'custom' as DatePreset, label: 'Personalizado' },
                ]).map(p => (
                  <Button
                    key={p.value}
                    variant={datePreset === p.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom date pickers */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-7 text-xs", !dateFrom && "text-muted-foreground")}>
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'De'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-7 text-xs", !dateTo && "text-muted-foreground")}>
                      {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Até'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Campaign ID Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar ID de campanha..."
                value={campaignIdSearch}
                onChange={e => setCampaignIdSearch(e.target.value)}
                className="h-7 text-xs pl-7 w-52"
              />
              {campaignIdSearch && (
                <button onClick={() => setCampaignIdSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            <Button
              variant={showAdvancedFilters ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="w-3 h-3" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{activeFilterCount}</Badge>
              )}
            </Button>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAllFilters}>
                <X className="w-3 h-3 mr-1" /> Limpar
              </Button>
            )}

            <div className="ml-auto">
              <Badge variant="outline" className="text-xs">
                {formatNumber(filteredReportData.length)} / {formatNumber(reportData.length)} registros
              </Badge>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2 border-t">
              <FilterSelect label="Veículo" value={filterVehicle} onChange={setFilterVehicle} options={availableFilters.vehicles} />
              <FilterSelect label="Meio" value={filterMedium} onChange={setFilterMedium} options={availableFilters.mediums} />
              <FilterSelect label="Fase do Funil" value={filterFunnel} onChange={setFilterFunnel} options={availableFilters.funnelStages} />
              <FilterSelect label="Subdivisão" value={filterSubdivision} onChange={setFilterSubdivision} options={availableFilters.subdivisions} />
              <FilterSelect label="Momento" value={filterMoment} onChange={setFilterMoment} options={availableFilters.moments} />
              <FilterSelect label="Canal" value={filterChannel} onChange={setFilterChannel} options={availableFilters.channels} />
              <FilterSelect label="Target" value={filterTarget} onChange={setFilterTarget} options={availableFilters.targets} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════ VISÃO GERAL ═══════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold font-display">Visão Geral</h2>
          {dailyData.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <CalendarIcon className="w-3 h-3" />
              {dailyData[0].dateLabel} – {dailyData[dailyData.length - 1].dateLabel}
            </Badge>
          )}
        </div>

        {/* KPI Row 1 */}
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

        {/* KPI Row 2: Analytics */}
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
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-display">Evolução Diária</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {hasCost && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />Investimento Diário</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyData}>
                      <defs><linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={MEDIA_COLOR} stopOpacity={0.3} /><stop offset="95%" stopColor={MEDIA_COLOR} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={label => `Data: ${label}`} contentStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="cost" name="Investimento" stroke={MEDIA_COLOR} fill="url(#costGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {hasImpressions && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Eye className="w-4 h-4 text-primary" />Impressões & Cliques</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} contentStyle={{ fontSize: 12 }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="impressions" name="Impressões" fill={MEDIA_COLOR} opacity={0.3} />
                      <Line yAxisId="right" type="monotone" dataKey="clicks" name="Cliques" stroke={ACCENT_COLOR} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {hasSessions && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Sessões & Usuários</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} contentStyle={{ fontSize: 12 }} /><Legend />
                      <Line type="monotone" dataKey="sessions" name="Sessões" stroke={MEDIA_COLOR} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="users" name="Usuários" stroke={ACCENT_COLOR} strokeWidth={2} dot={false} />
                      {hasEngaged && <Line type="monotone" dataKey="engaged" name="Engajadas" stroke={TERTIARY_COLOR} strokeWidth={2} dot={false} />}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {hasEngaged && hasDailyData && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Taxa de Engajamento (%)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dailyData}>
                      <defs><linearGradient id="engGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ACCENT_COLOR} stopOpacity={0.3} /><stop offset="95%" stopColor={ACCENT_COLOR} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Engajamento']} contentStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="engagementRate" name="Engajamento" stroke={ACCENT_COLOR} fill="url(#engGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {hasImpressions && hasDailyData && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><MousePointer className="w-4 h-4 text-primary" />CTR Diário (%)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(3)}%`, 'CTR']} contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="ctr" name="CTR" stroke={MEDIA_COLOR} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {hasCost && allMetrics.totalClicks > 0 && hasDailyData && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />CPC Diário</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyData.filter(d => d.cpc > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => `R$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'CPC']} contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="cpc" name="CPC" stroke={MEDIA_COLOR} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {funnelDistributionData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium">Distribuição por Fase do Funil</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={funnelDistributionData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} dataKey="value">
                        {funnelDistributionData.map((_, index) => <Cell key={`funnel-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {subdivisionDistributionData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium">Distribuição por Subdivisão</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={subdivisionDistributionData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} dataKey="value">
                        {subdivisionDistributionData.map((_, index) => <Cell key={`sub-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {momentDistributionData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-medium">Distribuição por Momento</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={momentDistributionData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} dataKey="value">
                        {momentDistributionData.map((_, index) => <Cell key={`mom-${index}`} fill={COLORS[index % COLORS.length]} />)}
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

      {/* ═══════════════ CAMPAIGN ID TABLE ═══════════════ */}
      {campaignTableData.length > 0 && (
        <section className="space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-display">Resultados por ID de Campanha</h2>
            <Badge variant="secondary" className="text-xs">{campaignTableData.length} IDs</Badge>
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead className="text-right">Impressões</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">Investimento</TableHead>
                      <TableHead className="text-right">Sessões</TableHead>
                      <TableHead className="text-right">Sess. Engajadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignTableData.map(row => (
                      <TableRow key={row.code}>
                        <TableCell className="font-mono text-xs font-medium">{row.code}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCompact(row.impressions)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCompact(row.clicks)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPercent(row.ctr)}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.cpc > 0 ? formatCurrency(row.cpc) : '-'}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.cost > 0 ? formatCurrency(row.cost) : '-'}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCompact(row.sessions)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCompact(row.engaged)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ═══════════════ COMPARATIVO ═══════════════ */}
      {(budgetComparisonData.length > 0 || distributionData.length > 0 || funnelDistributionData.length > 0 || subdivisionDistributionData.length > 0 || momentDistributionData.length > 0 || sourceBreakdown.length > 1) && (
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
                      <XAxis type="number" tickFormatter={v => formatCompact(v)} />
                      <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend />
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
                        {distributionData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
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
                        {sourceBreakdown.map(src => (
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
