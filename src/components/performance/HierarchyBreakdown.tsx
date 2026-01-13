import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Monitor,
  Radio,
  MapPin,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportMetric, calculatePerformanceSummary } from '@/hooks/usePerformanceData';
import { MediaLine } from '@/types/media';

interface HierarchyBreakdownProps {
  metrics: ReportMetric[];
  mediaLines: MediaLine[];
  vehicles: { id: string; name: string }[];
  channels: { id: string; name: string; vehicle_id: string }[];
  subdivisions: { id: string; name: string }[];
  funnelStages: { id: string; name: string }[];
}

type DimensionType = 'vehicle' | 'channel' | 'subdivision' | 'funnel_stage';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
  `${(value * 100).toFixed(2)}%`;

interface DimensionData {
  id: string;
  name: string;
  plannedBudget: number;
  actualCost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  budgetVariancePercent: number;
  lineCount: number;
}

interface BreakdownRowProps {
  data: DimensionData;
  totalCost: number;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

function BreakdownRow({ data, totalCost, isExpanded, onToggle, children }: BreakdownRowProps) {
  const costPercentage = totalCost > 0 ? (data.actualCost / totalCost) * 100 : 0;
  const isOverBudget = data.budgetVariancePercent > 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-muted/50 transition-colors"
      >
        <div className="shrink-0">
          {children ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{data.name}</span>
            <Badge variant="secondary" className="text-xs">
              {data.lineCount} linhas
            </Badge>
          </div>
          <div className="mt-1">
            <Progress value={costPercentage} className="h-1.5" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 shrink-0 text-right text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Investido</p>
            <p className="font-medium">{formatCurrency(data.actualCost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Cliques</p>
            <p className="font-medium">{formatNumber(data.clicks)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">CTR</p>
            <p className="font-medium">{formatPercent(data.ctr)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Variação</p>
            <p
              className={`font-medium flex items-center justify-end gap-1 ${
                isOverBudget ? 'text-destructive' : 'text-success'
              }`}
            >
              {isOverBudget ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(data.budgetVariancePercent).toFixed(1)}%
            </p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 pl-12 space-y-2 bg-muted/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HierarchyBreakdown({
  metrics,
  mediaLines,
  vehicles,
  channels,
  subdivisions,
  funnelStages,
}: HierarchyBreakdownProps) {
  const [selectedDimension, setSelectedDimension] = useState<DimensionType>('vehicle');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Create lookup maps
  const lineIdToMetrics = useMemo(() => {
    const map: Record<string, ReportMetric[]> = {};
    metrics.forEach((m) => {
      if (m.media_line_id) {
        if (!map[m.media_line_id]) {
          map[m.media_line_id] = [];
        }
        map[m.media_line_id].push(m);
      }
    });
    return map;
  }, [metrics]);

  const calculateDimensionData = (
    lines: MediaLine[],
    dimensionId: string,
    name: string
  ): DimensionData => {
    const dimensionMetrics: ReportMetric[] = [];
    let plannedBudget = 0;

    lines.forEach((line) => {
      plannedBudget += Number(line.budget || 0);
      const lineMetrics = lineIdToMetrics[line.id] || [];
      dimensionMetrics.push(...lineMetrics);
    });

    const actualCost = dimensionMetrics.reduce((acc, m) => acc + Number(m.cost || 0), 0);
    const impressions = dimensionMetrics.reduce((acc, m) => acc + Number(m.impressions || 0), 0);
    const clicks = dimensionMetrics.reduce((acc, m) => acc + Number(m.clicks || 0), 0);
    const conversions = dimensionMetrics.reduce((acc, m) => acc + Number(m.conversions || 0), 0);

    return {
      id: dimensionId,
      name,
      plannedBudget,
      actualCost,
      impressions,
      clicks,
      conversions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      cpc: clicks > 0 ? actualCost / clicks : 0,
      cpa: conversions > 0 ? actualCost / conversions : 0,
      budgetVariancePercent:
        plannedBudget > 0 ? ((actualCost - plannedBudget) / plannedBudget) * 100 : 0,
      lineCount: lines.length,
    };
  };

  const breakdownData = useMemo(() => {
    const data: Record<DimensionType, DimensionData[]> = {
      vehicle: [],
      channel: [],
      subdivision: [],
      funnel_stage: [],
    };

    // By Vehicle
    vehicles.forEach((vehicle) => {
      const lines = mediaLines.filter((l) => l.vehicle_id === vehicle.id);
      if (lines.length > 0) {
        data.vehicle.push(calculateDimensionData(lines, vehicle.id, vehicle.name));
      }
    });

    // By Channel
    channels.forEach((channel) => {
      const lines = mediaLines.filter((l) => l.channel_id === channel.id);
      if (lines.length > 0) {
        data.channel.push(calculateDimensionData(lines, channel.id, channel.name));
      }
    });

    // By Subdivision
    subdivisions.forEach((subdivision) => {
      const lines = mediaLines.filter((l) => l.subdivision_id === subdivision.id);
      if (lines.length > 0) {
        data.subdivision.push(calculateDimensionData(lines, subdivision.id, subdivision.name));
      }
    });

    // By Funnel Stage
    funnelStages.forEach((stage) => {
      const lines = mediaLines.filter((l) => l.funnel_stage_id === stage.id);
      if (lines.length > 0) {
        data.funnel_stage.push(calculateDimensionData(lines, stage.id, stage.name));
      }
    });

    // Sort each by actual cost descending
    Object.keys(data).forEach((key) => {
      data[key as DimensionType].sort((a, b) => b.actualCost - a.actualCost);
    });

    return data;
  }, [metrics, mediaLines, vehicles, channels, subdivisions, funnelStages, lineIdToMetrics]);

  const totalCost = metrics.reduce((acc, m) => acc + Number(m.cost || 0), 0);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getDimensionIcon = (type: DimensionType) => {
    switch (type) {
      case 'vehicle':
        return <Monitor className="w-4 h-4" />;
      case 'channel':
        return <Radio className="w-4 h-4" />;
      case 'subdivision':
        return <MapPin className="w-4 h-4" />;
      case 'funnel_stage':
        return <Target className="w-4 h-4" />;
    }
  };

  const dimensionLabels: Record<DimensionType, string> = {
    vehicle: 'Veículo',
    channel: 'Canal',
    subdivision: 'Subdivisão',
    funnel_stage: 'Fase do Funil',
  };

  const currentData = breakdownData[selectedDimension];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Performance por Dimensão
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedDimension}
            onValueChange={(v) => setSelectedDimension(v as DimensionType)}
          >
            <TabsList className="mb-4">
              {(['vehicle', 'channel', 'subdivision', 'funnel_stage'] as DimensionType[]).map(
                (dim) => (
                  <TabsTrigger key={dim} value={dim} className="gap-2">
                    {getDimensionIcon(dim)}
                    {dimensionLabels[dim]}
                    {breakdownData[dim].length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {breakdownData[dim].length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )
              )}
            </TabsList>

            {(['vehicle', 'channel', 'subdivision', 'funnel_stage'] as DimensionType[]).map(
              (dim) => (
                <TabsContent key={dim} value={dim} className="mt-0">
                  {breakdownData[dim].length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum dado disponível para esta dimensão
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {breakdownData[dim].map((data) => (
                        <BreakdownRow
                          key={data.id}
                          data={data}
                          totalCost={totalCost}
                          isExpanded={expandedItems.has(data.id)}
                          onToggle={() => toggleExpand(data.id)}
                        >
                          {/* Could show individual lines here */}
                        </BreakdownRow>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )
            )}
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
