import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Plus, Image as ImageIcon, Check, X, Settings2, Filter, Columns, Search, AlertTriangle, Link, LayoutGrid, List, Link2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MediaLine, MediaPlan, MediaCreative, MediaLineMonthlyBudget } from '@/types/media';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Medium, 
  Vehicle, 
  Channel, 
  Target,
  Subdivision,
  Moment,
  FunnelStage 
} from '@/hooks/useConfigData';
import { Status } from '@/hooks/useStatuses';
import { format, differenceInDays, startOfMonth, endOfMonth, parseISO, eachMonthOfInterval, min, max } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlanAlert } from '@/hooks/usePlanAlerts';
import { LineAlertIndicator } from '@/components/media-plan/LineAlertIndicator';
import { UTMPreview } from '@/components/media-plan/UTMPreview';
import { useResizableColumns, ColumnKey } from '@/hooks/useResizableColumns';
import { ResizableColumnHeader } from '@/components/media-plan/ResizableColumnHeader';

// Columns that can be toggled (excludes: Código, Orçamento, Status, Início, Fim, Ações)
type ToggleableColumn = 'subdivision' | 'moment' | 'funnel_stage' | 'medium' | 'vehicle' | 'channel' | 'target' | 'creatives';

const TOGGLEABLE_COLUMNS: { key: ToggleableColumn; label: string }[] = [
  { key: 'subdivision', label: 'Subdivisão' },
  { key: 'moment', label: 'Momentos' },
  { key: 'funnel_stage', label: 'Fase' },
  { key: 'medium', label: 'Meio' },
  { key: 'vehicle', label: 'Veículo' },
  { key: 'channel', label: 'Canal' },
  { key: 'target', label: 'Segmentação' },
  { key: 'creatives', label: 'Criativos' },
];

interface LineFilters {
  status: string;
  subdivision: string;
  moment: string;
  funnel_stage: string;
  code: string;
  medium: string;
  vehicle: string;
  channel: string;
  target: string;
}

type TextFilterColumn = 'code' | 'status' | 'subdivision' | 'moment' | 'funnel_stage' | 'medium' | 'vehicle' | 'channel' | 'target';
type TextFilterOperator = 'contains' | 'equals' | 'not_contains' | 'regex';

interface TextFilter {
  column: TextFilterColumn | '';
  operator: TextFilterOperator;
  value: string;
}

const TEXT_FILTER_COLUMNS: { key: TextFilterColumn; label: string }[] = [
  { key: 'code', label: 'Código' },
  { key: 'status', label: 'Status' },
  { key: 'subdivision', label: 'Subdivisão' },
  { key: 'moment', label: 'Momento' },
  { key: 'funnel_stage', label: 'Fase' },
  { key: 'medium', label: 'Meio' },
  { key: 'vehicle', label: 'Veículo' },
  { key: 'channel', label: 'Canal' },
  { key: 'target', label: 'Segmentação' },
];

const TEXT_FILTER_OPERATORS: { key: TextFilterOperator; label: string }[] = [
  { key: 'contains', label: 'Contém' },
  { key: 'equals', label: 'Igual a' },
  { key: 'not_contains', label: 'Não Contém' },
  { key: 'regex', label: 'Corresponde Regex' },
];

interface BudgetDistribution {
  id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface HierarchicalMediaTableProps {
  plan: MediaPlan;
  lines: MediaLine[];
  creatives: Record<string, MediaCreative[]>;
  budgetDistributions: BudgetDistribution[];
  monthlyBudgets: Record<string, MediaLineMonthlyBudget[]>;
  mediums: Medium[];
  vehicles: Vehicle[];
  channels: Channel[];
  targets: Target[];
  subdivisions?: Subdivision[];
  moments?: Moment[];
  funnelStages?: FunnelStage[];
  statuses?: Status[];
  lineAlerts?: (lineId: string) => PlanAlert[];
  onEditLine: (line: MediaLine, initialStep?: string) => void;
  onDeleteLine: (line: MediaLine) => void;
  onAddLine: (prefill?: { subdivisionId?: string; momentId?: string; funnelStageId?: string }) => void;
  onUpdateLine: (lineId: string, updates: Partial<MediaLine>) => Promise<void>;
  onUpdateMonthlyBudgets: () => void;
  onFilteredLinesChange?: (lines: MediaLine[]) => void;
  onValidateUTM?: (lineId: string, validated: boolean) => Promise<void>;
}

interface SubdivisionInfo {
  id: string | null;
  distId: string;
  name: string;
  planned: number;
  percentage: number;
}

interface MomentInfo {
  id: string | null;
  distId: string;
  name: string;
  planned: number;
  percentage: number;
  start_date?: string | null;
  end_date?: string | null;
}

interface FunnelStageInfo {
  id: string | null;
  distId: string;
  name: string;
  planned: number;
  percentage: number;
}

interface HierarchyNode {
  subdivision: SubdivisionInfo;
  subdivisionAllocated: number;
  moments: {
    moment: MomentInfo;
    momentAllocated: number;
    funnelStages: {
      funnelStage: FunnelStageInfo;
      funnelStageAllocated: number;
      lines: MediaLine[];
    }[];
  }[];
}

type EditingField = 'budget' | 'start_date' | 'end_date' | 'line_code' | null;

export function HierarchicalMediaTable({
  plan,
  lines,
  creatives,
  budgetDistributions,
  monthlyBudgets,
  mediums,
  vehicles,
  channels,
  targets,
  subdivisions: subdivisionsList = [],
  moments: momentsList = [],
  funnelStages: funnelStagesList = [],
  statuses: statusesList = [],
  lineAlerts,
  onEditLine,
  onDeleteLine,
  onAddLine,
  onUpdateLine,
  onUpdateMonthlyBudgets,
  onFilteredLinesChange,
  onValidateUTM,
}: HierarchicalMediaTableProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [validatingLineId, setValidatingLineId] = useState<string | null>(null);

  // View mode: 'grouped' (hierarchical) or 'flat' (one line per row)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Resizable columns hook
  const { getWidth, handleResize, resetWidths } = useResizableColumns(viewMode);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<ToggleableColumn, boolean>>({
    subdivision: true,
    moment: true,
    funnel_stage: true,
    medium: true,
    vehicle: true,
    channel: true,
    target: true,
    creatives: true,
  });

  // Line filters state
  const [lineFilters, setLineFilters] = useState<LineFilters>({
    status: '',
    subdivision: '',
    moment: '',
    funnel_stage: '',
    code: '',
    medium: '',
    vehicle: '',
    channel: '',
    target: '',
  });

  const [columnFilterSearch, setColumnFilterSearch] = useState('');
  const [lineFilterSearch, setLineFilterSearch] = useState('');

  // Text-based advanced filter
  const [textFilter, setTextFilter] = useState<TextFilter>({
    column: '',
    operator: 'contains',
    value: '',
  });

  const toggleColumn = (key: ToggleableColumn) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearLineFilters = () => {
    setLineFilters({
      status: '',
      subdivision: '',
      moment: '',
      funnel_stage: '',
      code: '',
      medium: '',
      vehicle: '',
      channel: '',
      target: '',
    });
  };

  const clearTextFilter = () => {
    setTextFilter({ column: '', operator: 'contains', value: '' });
  };

  const activeFiltersCount = Object.values(lineFilters).filter(v => v !== '').length;
  const isTextFilterActive = textFilter.column !== '' && textFilter.value !== '';

  // Helper to get the name for a column value
  const getColumnValueName = (line: MediaLine, column: TextFilterColumn): string => {
    switch (column) {
      case 'code':
        return line.line_code || '';
      case 'status':
        return statusesList.find(s => s.id === line.status_id)?.name || '';
      case 'subdivision':
        return subdivisionsList.find(s => s.id === line.subdivision_id)?.name || '';
      case 'moment':
        return momentsList.find(m => m.id === line.moment_id)?.name || '';
      case 'funnel_stage':
        return funnelStagesList.find(f => f.id === line.funnel_stage_id)?.name || '';
      case 'medium':
        return mediums.find(m => m.id === line.medium_id)?.name || '';
      case 'vehicle':
        return vehicles.find(v => v.id === line.vehicle_id)?.name || '';
      case 'channel':
        return channels.find(c => c.id === line.channel_id)?.name || '';
      case 'target':
        return targets.find(t => t.id === line.target_id)?.name || '';
      default:
        return '';
    }
  };

  // Apply text filter
  const matchesTextFilter = (line: MediaLine): boolean => {
    if (!textFilter.column || !textFilter.value) return true;
    
    const fieldValue = getColumnValueName(line, textFilter.column).toLowerCase();
    const searchValue = textFilter.value.toLowerCase();
    
    switch (textFilter.operator) {
      case 'contains':
        return fieldValue.includes(searchValue);
      case 'equals':
        return fieldValue === searchValue;
      case 'not_contains':
        return !fieldValue.includes(searchValue);
      case 'regex':
        try {
          const regex = new RegExp(textFilter.value, 'i');
          return regex.test(fieldValue);
        } catch {
          return true; // Invalid regex, don't filter
        }
      default:
        return true;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    // Parse date as local time to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'dd/MM/yyyy', { locale: ptBR });
  };

  // Helper to get name from library data
  const getSubdivisionName = (refId: string | null): string => {
    if (!refId) return 'Geral';
    const found = subdivisionsList.find(s => s.id === refId);
    return found?.name || 'Geral';
  };

  const getMomentName = (refId: string | null): string => {
    if (!refId) return 'Geral';
    const found = momentsList.find(m => m.id === refId);
    return found?.name || 'Geral';
  };

  const getFunnelStageName = (refId: string | null): string => {
    if (!refId) return 'Geral';
    const found = funnelStagesList.find(f => f.id === refId);
    return found?.name || 'Geral';
  };

  // Build hierarchical structure based on saved budget distributions
  // Using the actual parent_distribution_id FK relationships
  const groupedData = useMemo(() => {
    const nodes: HierarchyNode[] = [];

    // Get distributions by type
    const subdivisionDists = budgetDistributions.filter(d => d.distribution_type === 'subdivision');
    const momentDists = budgetDistributions.filter(d => d.distribution_type === 'moment');
    const funnelDists = budgetDistributions.filter(d => d.distribution_type === 'funnel_stage');

    // If no distributions at all, create a single "Geral" node
    if (subdivisionDists.length === 0) {
      const totalBudget = Number(plan.total_budget) || 0;
      const allAllocated = lines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
      
      nodes.push({
        subdivision: { id: null, distId: 'root', name: 'Geral', planned: totalBudget, percentage: 100 },
        subdivisionAllocated: allAllocated,
        moments: [{
          moment: { id: null, distId: 'root', name: 'Geral', planned: totalBudget, percentage: 100 },
          momentAllocated: allAllocated,
          funnelStages: [{
            funnelStage: { id: null, distId: 'root', name: 'Geral', planned: totalBudget, percentage: 100 },
            funnelStageAllocated: allAllocated,
            lines: lines,
          }],
        }],
      });

      return nodes;
    }

    // Get IDs from distributions
    const subdivisionRefIds = subdivisionDists.map(d => d.reference_id);
    
    // Process each subdivision distribution
    for (const subDist of subdivisionDists) {
      const subRefId = subDist.reference_id;
      const subName = getSubdivisionName(subRefId);
      
      // Get lines for this subdivision
      const subLines = lines.filter(l => 
        (subRefId === null && !l.subdivision_id) || l.subdivision_id === subRefId
      );
      const subAllocated = subLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);

      // Get moments for this subdivision (where parent_distribution_id = subDist.id)
      const subMomentDists = momentDists.filter(m => m.parent_distribution_id === subDist.id);
      const momentNodes: HierarchyNode['moments'] = [];

      if (subMomentDists.length === 0) {
        // No moments for this subdivision - create single "Geral" moment
        const funnelNodes: HierarchyNode['moments'][0]['funnelStages'] = [];
        
        // Get funnel stages directly under subdivision
        const subFunnelDists = funnelDists.filter(f => f.parent_distribution_id === subDist.id);
        
        if (subFunnelDists.length === 0) {
          // No funnel stages - single "Geral" funnel
          funnelNodes.push({
            funnelStage: { id: null, distId: 'none', name: 'Geral', planned: subDist.amount, percentage: 100 },
            funnelStageAllocated: subAllocated,
            lines: subLines,
          });
        } else {
          for (const funDist of subFunnelDists) {
            const funRefId = funDist.reference_id;
            const funName = getFunnelStageName(funRefId);
            const funLines = subLines.filter(l => 
              (funRefId === null && !l.funnel_stage_id) || l.funnel_stage_id === funRefId
            );
            const funAllocated = funLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
            
            funnelNodes.push({
              funnelStage: { id: funRefId, distId: funDist.id, name: funName, planned: funDist.amount, percentage: funDist.percentage },
              funnelStageAllocated: funAllocated,
              lines: funLines,
            });
          }
        }

        momentNodes.push({
          moment: { id: null, distId: 'none', name: 'Geral', planned: subDist.amount, percentage: 100 },
          momentAllocated: subAllocated,
          funnelStages: funnelNodes,
        });
      } else {
        // Process each moment
        for (const momDist of subMomentDists) {
          const momRefId = momDist.reference_id;
          const momName = getMomentName(momRefId);
          
          // Get lines for this moment
          const momLines = subLines.filter(l => 
            (momRefId === null && !l.moment_id) || l.moment_id === momRefId
          );
          const momAllocated = momLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);

          // Get funnel stages for this moment (where parent_distribution_id = momDist.id)
          const momFunnelDists = funnelDists.filter(f => f.parent_distribution_id === momDist.id);
          const funnelNodes: HierarchyNode['moments'][0]['funnelStages'] = [];

          if (momFunnelDists.length === 0) {
            // No funnel stages - single "Geral" funnel
            funnelNodes.push({
              funnelStage: { id: null, distId: 'none', name: 'Geral', planned: momDist.amount, percentage: 100 },
              funnelStageAllocated: momAllocated,
              lines: momLines,
            });
          } else {
            for (const funDist of momFunnelDists) {
              const funRefId = funDist.reference_id;
              const funName = getFunnelStageName(funRefId);
              const funLines = momLines.filter(l => 
                (funRefId === null && !l.funnel_stage_id) || l.funnel_stage_id === funRefId
              );
              const funAllocated = funLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
              
              funnelNodes.push({
                funnelStage: { id: funRefId, distId: funDist.id, name: funName, planned: funDist.amount, percentage: funDist.percentage },
                funnelStageAllocated: funAllocated,
                lines: funLines,
              });
            }
          }

          momentNodes.push({
            moment: { 
              id: momRefId, 
              distId: momDist.id, 
              name: momName, 
              planned: momDist.amount, 
              percentage: momDist.percentage,
              start_date: momDist.start_date,
              end_date: momDist.end_date,
            },
            momentAllocated: momAllocated,
            funnelStages: funnelNodes,
          });
        }
      }

      nodes.push({
        subdivision: { id: subRefId, distId: subDist.id, name: subName, planned: subDist.amount, percentage: subDist.percentage },
        subdivisionAllocated: subAllocated,
        moments: momentNodes,
      });
    }

    // Find "orphan" lines that don't belong to any subdivision in the distributions
    const orphanLines = lines.filter(l => {
      // If line has no subdivision_id, check if there's a distribution with reference_id = null
      if (!l.subdivision_id) {
        return !subdivisionRefIds.includes(null);
      }
      // If line has a subdivision_id, check if it's in the distributions
      return !subdivisionRefIds.includes(l.subdivision_id);
    });

    // Add orphan lines under a "Sem Classificação" node if any exist
    if (orphanLines.length > 0) {
      const orphanAllocated = orphanLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
      
      nodes.push({
        subdivision: { id: 'orphan', distId: 'orphan', name: 'Sem Classificação', planned: 0, percentage: 0 },
        subdivisionAllocated: orphanAllocated,
        moments: [{
          moment: { id: null, distId: 'orphan', name: 'Geral', planned: 0, percentage: 100 },
          momentAllocated: orphanAllocated,
          funnelStages: [{
            funnelStage: { id: null, distId: 'orphan', name: 'Geral', planned: 0, percentage: 100 },
            funnelStageAllocated: orphanAllocated,
            lines: orphanLines,
          }],
        }],
      });
    }

    return nodes;
  }, [lines, budgetDistributions, plan.total_budget, subdivisionsList, momentsList, funnelStagesList]);

  // Apply line filters to the grouped data
  // Create filtered grouped data
  const filteredGroupedData = useMemo(() => {
    const hasAnyFilter = activeFiltersCount > 0 || isTextFilterActive;
    if (!hasAnyFilter) return groupedData;
    
    const filterLine = (line: MediaLine): boolean => {
      // Standard filters
      if (lineFilters.status && line.status_id !== lineFilters.status) return false;
      if (lineFilters.subdivision && line.subdivision_id !== lineFilters.subdivision) return false;
      if (lineFilters.moment && line.moment_id !== lineFilters.moment) return false;
      if (lineFilters.funnel_stage && line.funnel_stage_id !== lineFilters.funnel_stage) return false;
      if (lineFilters.code && !(line.line_code || '').toLowerCase().includes(lineFilters.code.toLowerCase())) return false;
      if (lineFilters.medium && line.medium_id !== lineFilters.medium) return false;
      if (lineFilters.vehicle && line.vehicle_id !== lineFilters.vehicle) return false;
      if (lineFilters.channel && line.channel_id !== lineFilters.channel) return false;
      if (lineFilters.target && line.target_id !== lineFilters.target) return false;
      
      // Text filter
      if (!matchesTextFilter(line)) return false;
      
      return true;
    };
    
    return groupedData.map(subGroup => ({
      ...subGroup,
      moments: subGroup.moments.map(momGroup => ({
        ...momGroup,
        funnelStages: momGroup.funnelStages.map(funGroup => ({
          ...funGroup,
          lines: funGroup.lines.filter(filterLine),
        })),
      })),
    }));
  }, [groupedData, lineFilters, activeFiltersCount, isTextFilterActive, textFilter]);

  // Get all filtered lines as a flat array
  const filteredLines = useMemo(() => {
    const allLines: MediaLine[] = [];
    filteredGroupedData.forEach(subGroup => {
      subGroup.moments.forEach(momGroup => {
        momGroup.funnelStages.forEach(funGroup => {
          allLines.push(...funGroup.lines);
        });
      });
    });
    return allLines;
  }, [filteredGroupedData]);

  // Notify parent of filtered lines changes
  useMemo(() => {
    if (onFilteredLinesChange) {
      onFilteredLinesChange(filteredLines);
    }
  }, [filteredLines, onFilteredLinesChange]);

  // Calculate plan months based on start_date and end_date
  const planMonths = useMemo(() => {
    if (!plan.start_date || !plan.end_date) return [];
    
    const startDate = parseISO(plan.start_date);
    const endDate = parseISO(plan.end_date);
    
    return eachMonthOfInterval({ start: startDate, end: endDate });
  }, [plan.start_date, plan.end_date]);

  // Calculate campaign days for a line
  const getLineCampaignDays = (line: MediaLine): number => {
    const lineStart = line.start_date ? parseISO(line.start_date) : null;
    const lineEnd = line.end_date ? parseISO(line.end_date) : null;
    
    if (!lineStart || !lineEnd) return 0;
    
    return differenceInDays(lineEnd, lineStart) + 1;
  };

  // Calculate allocated budget (sum of monthly budgets) for a line
  const getLineAllocatedBudget = (lineId: string): number => {
    const lineBudgets = monthlyBudgets[lineId] || [];
    return lineBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  };

  // Get the budget for a specific month for a line
  const getMonthBudget = (lineId: string, monthDate: Date): number => {
    const lineBudgets = monthlyBudgets[lineId] || [];
    const monthStr = format(monthDate, 'yyyy-MM-01');
    const found = lineBudgets.find(b => b.month_date === monthStr);
    return found ? Number(found.amount) || 0 : 0;
  };

  // Check if a month is within the line's active period
  const isMonthEditableForLine = (line: MediaLine, monthDate: Date): boolean => {
    const lineStart = line.start_date ? parseISO(line.start_date) : null;
    const lineEnd = line.end_date ? parseISO(line.end_date) : null;
    
    if (!lineStart || !lineEnd) return false;
    
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    // Check if there's any overlap between line period and month
    return lineStart <= monthEnd && lineEnd >= monthStart;
  };

  // Format month header
  const formatMonthHeader = (date: Date): string => {
    return format(date, 'MMM/yy', { locale: ptBR });
  };

  const totalBudget = lines.reduce((acc, line) => acc + (Number(line.budget) || 0), 0);

  const getLineDisplayInfo = (line: MediaLine) => {
    const medium = mediums.find(m => m.id === line.medium_id);
    const vehicle = vehicles.find(v => v.id === line.vehicle_id);
    const channel = channels.find(c => c.id === line.channel_id);
    const target = targets.find(t => t.id === line.target_id);
    const lineCreatives = creatives[line.id] || [];

    return {
      medium: medium?.name || '-',
      vehicle: vehicle?.name || '-',
      channel: channel?.name || '-',
      format: line.format || '-',
      target: target?.name || '-',
      creativesCount: lineCreatives.length,
    };
  };

  // Generate automatic line code based on subdivision, moment, funnel stage
  const generateLineCode = (line: MediaLine, existingCodes: string[]): string => {
    const subdivision = subdivisionsList.find(s => s.id === line.subdivision_id);
    const moment = momentsList.find(m => m.id === line.moment_id);
    const funnelStage = funnelStagesList.find(f => f.id === line.funnel_stage_id);
    
    const getFirstLetter = (name?: string) => {
      if (!name) return '';
      return name.charAt(0).toUpperCase();
    };
    
    const generateRandomLetters = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return Array.from({ length: 3 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };
    
    let prefix = '';
    prefix += subdivision?.name ? getFirstLetter(subdivision.name) : '';
    prefix += moment?.name ? getFirstLetter(moment.name) : '';
    prefix += funnelStage?.name ? getFirstLetter(funnelStage.name) : '';
    
    // If no letters, use random
    if (!prefix) {
      prefix = generateRandomLetters();
    }
    
    // Find next available number
    let counter = 1;
    let code = `${prefix}${counter}`;
    while (existingCodes.includes(code)) {
      counter++;
      code = `${prefix}${counter}`;
    }
    
    return code;
  };

  // Get all existing codes in the plan
  const existingLineCodes = useMemo(() => {
    return lines.map(l => l.line_code).filter(Boolean) as string[];
  }, [lines]);

  // Build map of line_codes that exist in multiple moments
  const duplicateLineCodesMap = useMemo(() => {
    const codeToMoments: Record<string, { momentId: string | null; momentName: string }[]> = {};
    
    lines.forEach(line => {
      if (!line.line_code) return;
      if (!codeToMoments[line.line_code]) {
        codeToMoments[line.line_code] = [];
      }
      const momentName = momentsList.find(m => m.id === line.moment_id)?.name || 'Geral';
      codeToMoments[line.line_code].push({
        momentId: line.moment_id,
        momentName,
      });
    });
    
    // Filter to only codes that appear in multiple moments
    const duplicates: Record<string, { momentId: string | null; momentName: string }[]> = {};
    Object.entries(codeToMoments).forEach(([code, moments]) => {
      const uniqueMoments = moments.filter((m, i, arr) => 
        arr.findIndex(x => x.momentId === m.momentId) === i
      );
      if (uniqueMoments.length > 1) {
        duplicates[code] = uniqueMoments;
      }
    });
    
    return duplicates;
  }, [lines, momentsList]);

  // Get other moments for a line (for duplicate indicator)
  const getOtherMoments = (line: MediaLine): string[] => {
    if (!line.line_code) return [];
    const allMoments = duplicateLineCodesMap[line.line_code];
    if (!allMoments) return [];
    return allMoments
      .filter(m => m.momentId !== line.moment_id)
      .map(m => m.momentName);
  };

  const startEditingField = (line: MediaLine, field: EditingField) => {
    setEditingLineId(line.id);
    setEditingField(field);
    if (field === 'budget') {
      setEditValue(String(line.budget || ''));
    } else if (field === 'start_date') {
      setEditValue(line.start_date || '');
    } else if (field === 'end_date') {
      setEditValue(line.end_date || '');
    } else if (field === 'line_code') {
      // If no code exists, generate one
      const currentCode = line.line_code || generateLineCode(line, existingLineCodes);
      setEditValue(currentCode);
    }
  };

  const saveFieldEdit = async () => {
    if (!editingLineId || !editingField) return;
    
    const updates: Partial<MediaLine> = {};
    if (editingField === 'budget') {
      updates.budget = parseFloat(editValue) || 0;
    } else if (editingField === 'start_date') {
      // Validate: start_date >= plan.start_date
      if (plan.start_date && editValue < plan.start_date) {
        toast({
          title: "Data inválida",
          description: `A data de início da linha não pode ser anterior à data de início do plano (${formatDate(plan.start_date)}).`,
          variant: "destructive",
        });
        return;
      }
      // Also validate: start_date <= line's end_date if end_date exists
      const currentLine = lines.find(l => l.id === editingLineId);
      if (currentLine?.end_date && editValue > currentLine.end_date) {
        toast({
          title: "Data inválida",
          description: "A data de início não pode ser posterior à data de fim da linha.",
          variant: "destructive",
        });
        return;
      }
      updates.start_date = editValue;
    } else if (editingField === 'end_date') {
      // Validate: end_date <= plan.end_date
      if (plan.end_date && editValue > plan.end_date) {
        toast({
          title: "Data inválida",
          description: `A data de fim da linha não pode ser posterior à data de fim do plano (${formatDate(plan.end_date)}).`,
          variant: "destructive",
        });
        return;
      }
      // Also validate: end_date >= line's start_date if start_date exists
      const currentLine = lines.find(l => l.id === editingLineId);
      if (currentLine?.start_date && editValue < currentLine.start_date) {
        toast({
          title: "Data inválida",
          description: "A data de fim não pode ser anterior à data de início da linha.",
          variant: "destructive",
        });
        return;
      }
      updates.end_date = editValue;
    } else if (editingField === 'line_code') {
      // Validate uniqueness
      const otherCodes = lines.filter(l => l.id !== editingLineId).map(l => l.line_code).filter(Boolean);
      if (otherCodes.includes(editValue)) {
        toast({
          title: "Código já existe",
          description: "Este código já está em uso por outra linha neste plano.",
          variant: "destructive",
        });
        return;
      }
      updates.line_code = editValue;
    }
    
    await onUpdateLine(editingLineId, updates);
    cancelFieldEdit();
  };

  const cancelFieldEdit = () => {
    setEditingLineId(null);
    setEditingField(null);
    setEditValue('');
  };

  const isEditingField = (lineId: string, field: EditingField) => {
    return editingLineId === lineId && editingField === field;
  };

  // Month Budget Cell Component for editing monthly budgets
  const MonthBudgetCell = ({
    lineId,
    line,
    month,
    value,
    onUpdate,
    isEditable,
  }: {
    lineId: string;
    line: MediaLine;
    month: Date;
    value: number;
    onUpdate: () => void;
    isEditable: boolean;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editVal, setEditVal] = useState(String(value));
    const { user } = useAuth();

    const handleSave = async () => {
      if (!user?.id) return;
      
      const newAmount = parseFloat(editVal) || 0;
      const monthStr = format(month, 'yyyy-MM-01');
      
      try {
        // Check if record exists
        const { data: existing } = await supabase
          .from('media_line_monthly_budgets')
          .select('id')
          .eq('media_line_id', lineId)
          .eq('month_date', monthStr)
          .maybeSingle();
        
        if (existing) {
          // Update existing
          await supabase
            .from('media_line_monthly_budgets')
            .update({ amount: newAmount })
            .eq('id', existing.id);
        } else if (newAmount > 0) {
          // Insert new
          await supabase
            .from('media_line_monthly_budgets')
            .insert({
              media_line_id: lineId,
              user_id: user.id,
              month_date: monthStr,
              amount: newAmount,
            });
        }
        
        onUpdate();
        setIsEditing(false);
      } catch (error) {
        console.error('Error saving monthly budget:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o orçamento mensal.",
          variant: "destructive",
        });
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      // Allow empty, digits, comma and dot for decimal
      const sanitized = rawValue.replace(/[^\d.,]/g, '').replace(',', '.');
      setEditVal(sanitized);
    };

    // If not editable, show disabled cell with gray background
    if (!isEditable) {
      return (
        <div className="w-[90px] p-2 border-r shrink-0 bg-muted/50 text-xs text-muted-foreground">
          <span>{value > 0 ? formatCurrency(value) : '-'}</span>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="w-[90px] p-1 border-r shrink-0 bg-primary/5">
          <div className="flex items-center gap-0.5">
            <Input
              type="text"
              inputMode="decimal"
              value={editVal}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="h-6 text-xs px-1"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-success hover:text-success shrink-0"
              onClick={handleSave}
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="w-[90px] p-2 border-r shrink-0 bg-primary/5 text-xs cursor-pointer hover:bg-primary/10 transition-colors group"
        onClick={() => {
          setEditVal(String(value));
          setIsEditing(true);
        }}
      >
        <div className="flex items-center justify-between">
          <span>{value > 0 ? formatCurrency(value) : '-'}</span>
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
        </div>
      </div>
    );
  };

  const EditableCell = ({ 
    line, 
    field, 
    displayValue, 
    inputType = 'text',
    width,
    duplicateMoments,
  }: { 
    line: MediaLine; 
    field: EditingField; 
    displayValue: string;
    inputType?: 'text' | 'number' | 'date';
    width: number;
    duplicateMoments?: string[];
  }) => {
    const isEditing = isEditingField(line.id, field);
    const hasDuplicates = duplicateMoments && duplicateMoments.length > 0;
    
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      // Limit code field to 10 characters (allow paste, truncate if needed)
      if (field === 'line_code') {
        value = value.slice(0, 10);
      }
      // For budget fields, allow only numeric input with decimals
      if (inputType === 'number') {
        value = value.replace(/[^\d.,]/g, '').replace(',', '.');
      }
      setEditValue(value);
    };

    return (
      <div className="p-2 border-r shrink-0 group relative" style={{ width }}>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type={inputType === 'number' ? 'text' : inputType}
              inputMode={inputType === 'number' ? 'decimal' : undefined}
              className="h-6 text-xs px-1 w-full"
              value={editValue}
              onChange={handleEditChange}
              maxLength={field === 'line_code' ? 10 : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveFieldEdit();
                if (e.key === 'Escape') cancelFieldEdit();
              }}
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-success hover:text-success shrink-0"
              onClick={saveFieldEdit}
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              onClick={cancelFieldEdit}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className={cn(
                field === 'budget' ? 'font-medium' : '',
                'truncate'
              )}>{displayValue}</span>
              {field === 'line_code' && hasDuplicates && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center shrink-0">
                      <Link2 className="w-3.5 h-3.5 text-primary" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium text-sm">Linha em múltiplos momentos</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este código também existe em: {duplicateMoments.join(', ')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => startEditingField(line, field)}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const BudgetCard = ({ 
    label, 
    planned, 
    allocated, 
    percentageLabel,
    description,
    startDate,
    endDate,
  }: { 
    label: string;
    planned: number;
    allocated: number;
    percentageLabel?: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
  }) => {
    const isOverBudget = allocated > planned;
    const overBudgetAmount = allocated - planned;
    
    // Format date range for display
    const getDateRangeDisplay = () => {
      if (!startDate && !endDate) return null;
      const start = startDate ? formatDate(startDate) : '...';
      const end = endDate ? formatDate(endDate) : '...';
      return `${start} - ${end}`;
    };
    
    return (
      <div className="border rounded-lg p-2 h-full">
        <div className="font-medium text-sm">{label}</div>
        {getDateRangeDisplay() && (
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <span>📅</span>
            <span>{getDateRangeDisplay()}</span>
          </div>
        )}
        <div className="text-lg font-bold mt-1">{formatCurrency(planned)}</div>
        <div className={cn(
          "text-sm font-medium mt-1 flex items-center gap-1",
          isOverBudget ? "text-destructive" : "text-primary"
        )}>
          <span>{formatCurrency(allocated)}</span>
          <span className="text-xs font-normal">alocado</span>
          {isOverBudget && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  type="button" 
                  className="inline-flex items-center justify-center focus:outline-none"
                  aria-label="Orçamento excedido"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm font-medium">Orçamento excedido!</p>
                <p className="text-xs text-muted-foreground">
                  O valor alocado está {formatCurrency(overBudgetAmount)} acima do planejado.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {percentageLabel && (
          <div className="text-xs text-muted-foreground mt-1">
            {percentageLabel}
          </div>
        )}
        {description && (
          <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
            ({description})
          </div>
        )}
      </div>
    );
  };

  const AddLineButton = ({ 
    subdivisionId, 
    momentId, 
    funnelStageId 
  }: { 
    subdivisionId: string | undefined;
    momentId: string | undefined;
    funnelStageId: string | undefined;
  }) => (
    <Button
      variant="outline"
      size="sm"
      className="w-full h-8 text-xs border-dashed border-primary text-primary hover:bg-primary/10 justify-start gap-1 pl-3"
      onClick={() => onAddLine({ subdivisionId, momentId, funnelStageId })}
    >
      <Plus className="w-3 h-3 shrink-0" />
      <span className="truncate">Criar nova Linha</span>
    </Button>
  );

  // Calculate dynamic column widths based on visible columns
  const getMinWidth = () => {
    let width = getWidth('line_code') + getWidth('budget') + getWidth('status') + 
                getWidth('start_date') + getWidth('end_date') + getWidth('actions');
    // New fixed columns: Dias, Orçamento Alocado, Months
    width += getWidth('days') + getWidth('allocated');
    width += planMonths.length * getWidth('month');
    if (visibleColumns.subdivision) width += getWidth('subdivision');
    if (visibleColumns.moment) width += getWidth('moment');
    if (visibleColumns.funnel_stage) width += getWidth('funnel_stage');
    if (visibleColumns.medium) width += getWidth('medium');
    if (visibleColumns.vehicle) width += getWidth('vehicle');
    if (visibleColumns.channel) width += getWidth('channel');
    if (visibleColumns.target) width += getWidth('target');
    if (visibleColumns.creatives) width += getWidth('creatives');
    return width;
  };

  const filteredColumnsList = TOGGLEABLE_COLUMNS.filter(col => 
    col.label.toLowerCase().includes(columnFilterSearch.toLowerCase())
  );

  const getStatusName = (statusId: string | null) => {
    if (!statusId) return null;
    const found = statusesList.find(s => s.id === statusId);
    return found?.name || null;
  };

  const handleStatusChange = async (lineId: string, statusId: string) => {
    await onUpdateLine(lineId, { status_id: statusId === 'none' ? null : statusId });
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Filters Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(val) => val && setViewMode(val as 'grouped' | 'flat')}
            className="border rounded-md"
          >
            <ToggleGroupItem value="grouped" aria-label="Agrupado" className="h-8 px-3 gap-1.5 text-xs">
              <LayoutGrid className="w-3.5 h-3.5" />
              Agrupado
            </ToggleGroupItem>
            <ToggleGroupItem value="flat" aria-label="Um por linha" className="h-8 px-3 gap-1.5 text-xs">
              <List className="w-3.5 h-3.5" />
              Um por linha
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Column Visibility Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns className="w-4 h-4" />
                Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-popover" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">Exibir colunas</div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetWidths}>
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Resetar larguras das colunas</TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar coluna..."
                    value={columnFilterSearch}
                    onChange={(e) => setColumnFilterSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredColumnsList.map(col => (
                    <div key={col.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${col.key}`}
                        checked={visibleColumns[col.key]}
                        onCheckedChange={() => toggleColumn(col.key)}
                      />
                      <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">
                        {col.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Código, Orçamento, Status, Início, Fim e Ações estão sempre visíveis.
                </p>
              </div>
            </PopoverContent>
          </Popover>

          {/* Line Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtrar linhas
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-popover" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">Filtrar linhas</div>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearLineFilters} className="h-6 text-xs">
                      Limpar filtros
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar filtro..."
                    value={lineFilterSearch}
                    onChange={(e) => setLineFilterSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {/* Status filter */}
                  {'status'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={lineFilters.status} onValueChange={(v) => setLineFilters(prev => ({ ...prev, status: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {statusesList.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Subdivision filter */}
                  {'subdivisão'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Subdivisão</Label>
                      <Select value={lineFilters.subdivision} onValueChange={(v) => setLineFilters(prev => ({ ...prev, subdivision: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {subdivisionsList.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Moment filter */}
                  {'momento'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Momento</Label>
                      <Select value={lineFilters.moment} onValueChange={(v) => setLineFilters(prev => ({ ...prev, moment: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {momentsList.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Funnel Stage filter */}
                  {'fase'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fase</Label>
                      <Select value={lineFilters.funnel_stage} onValueChange={(v) => setLineFilters(prev => ({ ...prev, funnel_stage: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {funnelStagesList.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Code filter */}
                  {'código'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Código</Label>
                      <Input
                        placeholder="Buscar código..."
                        value={lineFilters.code}
                        onChange={(e) => setLineFilters(prev => ({ ...prev, code: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  
                  {/* Medium filter */}
                  {'meio'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Meio</Label>
                      <Select value={lineFilters.medium} onValueChange={(v) => setLineFilters(prev => ({ ...prev, medium: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {mediums.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Vehicle filter */}
                  {'veículo'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Veículo</Label>
                      <Select value={lineFilters.vehicle} onValueChange={(v) => setLineFilters(prev => ({ ...prev, vehicle: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Channel filter */}
                  {'canal'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Canal</Label>
                      <Select value={lineFilters.channel} onValueChange={(v) => setLineFilters(prev => ({ ...prev, channel: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {channels.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Target filter */}
                  {'segmentação'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Segmentação</Label>
                      <Select value={lineFilters.target} onValueChange={(v) => setLineFilters(prev => ({ ...prev, target: v === 'all' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {targets.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Text-based advanced filter */}
          <div className="flex items-center gap-2 border-l pl-3 ml-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Buscar:</span>
            <Select 
              value={textFilter.column} 
              onValueChange={(v) => setTextFilter(prev => ({ ...prev, column: v as TextFilterColumn | '' }))}
            >
              <SelectTrigger className="h-8 w-[130px] text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TEXT_FILTER_COLUMNS.map(col => (
                  <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={textFilter.operator} 
              onValueChange={(v) => setTextFilter(prev => ({ ...prev, operator: v as TextFilterOperator }))}
            >
              <SelectTrigger className="h-8 w-[150px] text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TEXT_FILTER_OPERATORS.map(op => (
                  <SelectItem key={op.key} value={op.key}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Digite o valor..."
              value={textFilter.value}
              onChange={(e) => setTextFilter(prev => ({ ...prev, value: e.target.value }))}
              className="h-8 w-[180px] text-sm"
            />
            {isTextFilterActive && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearTextFilter}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Active filters badges */}
          {(activeFiltersCount > 0 || isTextFilterActive) && (
            <div className="flex items-center gap-1 flex-wrap">
              {lineFilters.status && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusesList.find(s => s.id === lineFilters.status)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setLineFilters(prev => ({ ...prev, status: '' }))} />
                </Badge>
              )}
              {lineFilters.code && (
                <Badge variant="secondary" className="gap-1">
                  Código: {lineFilters.code}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setLineFilters(prev => ({ ...prev, code: '' }))} />
                </Badge>
              )}
              {lineFilters.medium && (
                <Badge variant="secondary" className="gap-1">
                  Meio: {mediums.find(m => m.id === lineFilters.medium)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setLineFilters(prev => ({ ...prev, medium: '' }))} />
                </Badge>
              )}
              {lineFilters.vehicle && (
                <Badge variant="secondary" className="gap-1">
                  Veículo: {vehicles.find(v => v.id === lineFilters.vehicle)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setLineFilters(prev => ({ ...prev, vehicle: '' }))} />
                </Badge>
              )}
              {isTextFilterActive && (
                <Badge variant="secondary" className="gap-1">
                  {TEXT_FILTER_COLUMNS.find(c => c.key === textFilter.column)?.label} {TEXT_FILTER_OPERATORS.find(o => o.key === textFilter.operator)?.label.toLowerCase()} "{textFilter.value}"
                  <X className="w-3 h-3 cursor-pointer" onClick={clearTextFilter} />
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          {/* Header */}
          <div className="flex bg-muted/50 text-xs font-medium text-muted-foreground border-b" style={{ minWidth: `${viewMode === 'flat' ? getMinWidth() - 100 : getMinWidth()}px` }}>
            {visibleColumns.subdivision && (
              <ResizableColumnHeader columnKey="subdivision" width={getWidth('subdivision')} onResize={handleResize} className="p-3 border-r">
                Subdivisão
              </ResizableColumnHeader>
            )}
            {visibleColumns.moment && (
              <ResizableColumnHeader columnKey="moment" width={getWidth('moment')} onResize={handleResize} className="p-3 border-r">
                Momento
              </ResizableColumnHeader>
            )}
            {visibleColumns.funnel_stage && (
              <ResizableColumnHeader columnKey="funnel_stage" width={getWidth('funnel_stage')} onResize={handleResize} className="p-3 border-r">
                Fase
              </ResizableColumnHeader>
            )}
            <ResizableColumnHeader columnKey="line_code" width={getWidth('line_code')} onResize={handleResize} className="p-3 border-r">
              Código
            </ResizableColumnHeader>
            {visibleColumns.medium && (
              <ResizableColumnHeader columnKey="medium" width={getWidth('medium')} onResize={handleResize} className="p-3 border-r">
                Meio
              </ResizableColumnHeader>
            )}
            {visibleColumns.vehicle && (
              <ResizableColumnHeader columnKey="vehicle" width={getWidth('vehicle')} onResize={handleResize} className="p-3 border-r">
                Veículo
              </ResizableColumnHeader>
            )}
            {visibleColumns.channel && (
              <ResizableColumnHeader columnKey="channel" width={getWidth('channel')} onResize={handleResize} className="p-3 border-r">
                Canal
              </ResizableColumnHeader>
            )}
            {visibleColumns.target && (
              <ResizableColumnHeader columnKey="target" width={getWidth('target')} onResize={handleResize} className="p-3 border-r">
                Segmentação
              </ResizableColumnHeader>
            )}
            <ResizableColumnHeader columnKey="budget" width={getWidth('budget')} onResize={handleResize} className="p-3 border-r">
              Orçamento
            </ResizableColumnHeader>
            {visibleColumns.creatives && (
              <ResizableColumnHeader columnKey="creatives" width={getWidth('creatives')} onResize={handleResize} className="p-3 border-r">
                Criativos
              </ResizableColumnHeader>
            )}
            <ResizableColumnHeader columnKey="status" width={getWidth('status')} onResize={handleResize} className="p-3 border-r">
              Status
            </ResizableColumnHeader>
            <ResizableColumnHeader columnKey="start_date" width={getWidth('start_date')} onResize={handleResize} className="p-3 border-r">
              Início
            </ResizableColumnHeader>
            <ResizableColumnHeader columnKey="end_date" width={getWidth('end_date')} onResize={handleResize} className="p-3 border-r">
              Fim
            </ResizableColumnHeader>
            <ResizableColumnHeader columnKey="actions" width={getWidth('actions')} onResize={handleResize} className="p-3 border-r">
              Ações
            </ResizableColumnHeader>
            {/* New columns - always visible, not affected by column filter */}
            <ResizableColumnHeader columnKey="days" width={getWidth('days')} onResize={handleResize} className="p-3 border-r bg-primary/5">
              Dias
            </ResizableColumnHeader>
            <ResizableColumnHeader columnKey="allocated" width={getWidth('allocated')} onResize={handleResize} className="p-3 border-r bg-primary/5">
              Orc. Alocado
            </ResizableColumnHeader>
            {planMonths.map((month, idx) => (
              <ResizableColumnHeader key={idx} columnKey="month" width={getWidth('month')} onResize={handleResize} className="p-3 border-r bg-primary/5 text-center">
                {formatMonthHeader(month)}
              </ResizableColumnHeader>
            ))}
          </div>

          {/* Flat View - one line per row */}
          {viewMode === 'flat' && (
            <div className="divide-y" style={{ minWidth: `${getMinWidth() - 100}px` }}>
              {filteredLines.map((line) => {
                const info = getLineDisplayInfo(line);
                const subdivisionName = subdivisionsList.find(s => s.id === line.subdivision_id)?.name || 'Geral';
                const momentName = momentsList.find(m => m.id === line.moment_id)?.name || 'Geral';
                const funnelName = funnelStagesList.find(f => f.id === line.funnel_stage_id)?.name || 'Geral';

                return (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex hover:bg-muted/30 transition-colors text-sm"
                  >
                    {/* Subdivision - simple text */}
                    {visibleColumns.subdivision && (
                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('subdivision') }} title={subdivisionName}>
                        {subdivisionName}
                      </div>
                    )}
                    
                    {/* Moment - simple text */}
                    {visibleColumns.moment && (
                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('moment') }} title={momentName}>
                        {momentName}
                      </div>
                    )}
                    
                    {/* Funnel Stage - simple text */}
                    {visibleColumns.funnel_stage && (
                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('funnel_stage') }} title={funnelName}>
                        {funnelName}
                      </div>
                    )}

                    {/* Editable Line Code */}
                    <EditableCell
                      line={line}
                      field="line_code"
                      displayValue={line.line_code || generateLineCode(line, existingLineCodes)}
                      inputType="text"
                      width={getWidth('line_code')}
                      duplicateMoments={getOtherMoments(line)}
                    />
                    
                    {visibleColumns.medium && (
                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('medium') }} title={info.medium}>
                        {info.medium}
                      </div>
                    )}
                    {visibleColumns.vehicle && (
                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('vehicle') }} title={info.vehicle}>
                        {info.vehicle}
                      </div>
                    )}
                    {visibleColumns.channel && (
                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('channel') }} title={info.channel}>
                        {info.channel}
                      </div>
                    )}
                    {visibleColumns.target && (
                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('target') }} title={info.target}>
                        ({info.target})
                      </div>
                    )}
                    
                    {/* Editable Budget */}
                    <EditableCell
                      line={line}
                      field="budget"
                      displayValue={formatCurrency(Number(line.budget))}
                      inputType="number"
                      width={getWidth('budget')}
                    />
                    
                    {/* Creatives with counter and quick add button */}
                    {visibleColumns.creatives && (
                      <div className="p-2 border-r flex items-center justify-between group shrink-0" style={{ width: getWidth('creatives') }}>
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3 text-muted-foreground" />
                          <span className={cn(
                            "text-xs font-medium",
                            info.creativesCount > 0 ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {info.creativesCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary"
                                onClick={() => onEditLine(line, 'creatives')}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Adicionar criativo</TooltipContent>
                          </Tooltip>
                          {info.creativesCount > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => onEditLine(line, 'creatives')}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar criativos</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Status select */}
                    <div className="p-2 border-r shrink-0" style={{ width: getWidth('status') }}>
                      <Select
                        value={line.status_id || 'none'}
                        onValueChange={(value) => handleStatusChange(line.id, value)}
                      >
                        <SelectTrigger className="h-6 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {statusesList.map(status => (
                            <SelectItem key={status.id} value={status.id}>
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Editable Start Date */}
                    <EditableCell
                      line={line}
                      field="start_date"
                      displayValue={formatDate(line.start_date)}
                      inputType="date"
                      width={getWidth('start_date')}
                    />
                    
                    {/* Editable End Date */}
                    <EditableCell
                      line={line}
                      field="end_date"
                      displayValue={formatDate(line.end_date)}
                      inputType="date"
                      width={getWidth('end_date')}
                    />
                    
                    {/* Action buttons */}
                    <div className="p-2 border-r flex items-center gap-1 shrink-0" style={{ width: getWidth('actions') }}>
                      {lineAlerts && <LineAlertIndicator alerts={lineAlerts(line.id)} size="sm" />}
                      <UTMPreview
                        destinationUrl={line.destination_url}
                        utmParams={{
                          utm_source: line.utm_source || undefined,
                          utm_medium: line.utm_medium || undefined,
                          utm_campaign: line.utm_campaign || undefined,
                          utm_term: line.utm_term || undefined,
                        }}
                        isValidated={(line as any).utm_validated || false}
                        compact
                        validating={validatingLineId === line.id}
                        onValidate={onValidateUTM ? async () => {
                          setValidatingLineId(line.id);
                          try {
                            await onValidateUTM(line.id, true);
                          } finally {
                            setValidatingLineId(null);
                          }
                        } : undefined}
                        onInvalidate={onValidateUTM ? async () => {
                          setValidatingLineId(line.id);
                          try {
                            await onValidateUTM(line.id, false);
                          } finally {
                            setValidatingLineId(null);
                          }
                        } : undefined}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onEditLine(line)}
                          >
                            <Settings2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar linha completa</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => onDeleteLine(line)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir linha</TooltipContent>
                      </Tooltip>
                    </div>
                    
                    {/* Campaign Days - fixed column */}
                    <div className="p-2 border-r shrink-0 bg-primary/5 text-center text-xs" style={{ width: getWidth('days') }}>
                      {getLineCampaignDays(line)}
                    </div>
                    
                    {/* Allocated Budget - fixed column */}
                    <div className="p-2 border-r shrink-0 bg-primary/5 text-xs font-medium" style={{ width: getWidth('allocated') }}>
                      {formatCurrency(getLineAllocatedBudget(line.id))}
                    </div>
                    
                    {/* Month columns - fixed columns */}
                    {planMonths.map((month, idx) => (
                      <MonthBudgetCell
                        key={idx}
                        lineId={line.id}
                        line={line}
                        month={month}
                        value={getMonthBudget(line.id, month)}
                        onUpdate={onUpdateMonthlyBudgets}
                        isEditable={isMonthEditableForLine(line, month)}
                      />
                    ))}
                  </motion.div>
                );
              })}
              
              {/* Add Line Button for flat view */}
              <div className="p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs border-dashed border-primary text-primary hover:bg-primary/10 justify-start gap-1 pl-3"
                  onClick={() => onAddLine({})}
                >
                  <Plus className="w-3 h-3 shrink-0" />
                  <span className="truncate">Criar nova Linha</span>
                </Button>
              </div>
            </div>
          )}

          {/* Grouped View - hierarchical with budget cards */}
          {viewMode === 'grouped' && (
            <div className="divide-y" style={{ minWidth: `${getMinWidth()}px` }}>
              {filteredGroupedData.map((subdivisionGroup, subIdx) => (
                <div key={subdivisionGroup.subdivision.distId || `no-sub-${subIdx}`} className="flex">
                  {/* Subdivision cell */}
                  {visibleColumns.subdivision && (
                    <div className="w-[180px] p-2 border-r bg-background shrink-0">
                      <BudgetCard
                        label={subdivisionGroup.subdivision.name}
                        planned={subdivisionGroup.subdivision.planned}
                        allocated={subdivisionGroup.subdivisionAllocated}
                        percentageLabel={`${subdivisionGroup.subdivision.percentage.toFixed(0)}% do plano`}
                      />
                    </div>
                  )}

                {/* Moments column */}
                <div className="flex-1 divide-y">
                  {subdivisionGroup.moments.map((momentGroup, momIdx) => (
                    <div key={momentGroup.moment.distId || `no-mom-${momIdx}`} className="flex">
                      {/* Moment cell */}
                      {visibleColumns.moment && (
                        <div className="w-[180px] p-2 border-r bg-background shrink-0">
                          <BudgetCard
                            label={momentGroup.moment.name}
                            planned={momentGroup.moment.planned}
                            allocated={momentGroup.momentAllocated}
                            percentageLabel={`${momentGroup.moment.percentage.toFixed(0)}% de ${subdivisionGroup.subdivision.name}`}
                            startDate={momentGroup.moment.start_date}
                            endDate={momentGroup.moment.end_date}
                          />
                        </div>
                      )}

                      {/* Funnel stages column */}
                      <div className="flex-1 divide-y">
                        {momentGroup.funnelStages.map((funnelGroup, funIdx) => (
                          <div key={funnelGroup.funnelStage.distId || `no-fun-${funIdx}`} className="flex">
                            {visibleColumns.funnel_stage && (
                              <div className="w-[200px] p-2 border-r bg-background shrink-0">
                                <BudgetCard
                                  label={funnelGroup.funnelStage.name}
                                  planned={funnelGroup.funnelStage.planned}
                                  allocated={funnelGroup.funnelStageAllocated}
                                  percentageLabel={`${funnelGroup.funnelStage.percentage.toFixed(0)}% de ${momentGroup.moment.name}`}
                                />
                              </div>
                            )}

                            {/* Lines and Add button */}
                            <div className="flex-1 divide-y">
                              {funnelGroup.lines.map((line) => {
                                const info = getLineDisplayInfo(line);

                                return (
                                  <motion.div
                                    key={line.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex hover:bg-muted/30 transition-colors text-sm"
                                  >
                                    {/* Editable Line Code */}
                                    <EditableCell
                                      line={line}
                                      field="line_code"
                                      displayValue={line.line_code || generateLineCode(line, existingLineCodes)}
                                      inputType="text"
                                      width={getWidth('line_code')}
                                      duplicateMoments={getOtherMoments(line)}
                                    />
                                    
                                    {visibleColumns.medium && (
                                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('medium') }} title={info.medium}>
                                        {info.medium}
                                      </div>
                                    )}
                                    {visibleColumns.vehicle && (
                                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('vehicle') }} title={info.vehicle}>
                                        {info.vehicle}
                                      </div>
                                    )}
                                    {visibleColumns.channel && (
                                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('channel') }} title={info.channel}>
                                        {info.channel}
                                      </div>
                                    )}
                                    {visibleColumns.target && (
                                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('target') }} title={info.target}>
                                        ({info.target})
                                      </div>
                                    )}
                                    
                                    {/* Editable Budget */}
                                    <EditableCell
                                      line={line}
                                      field="budget"
                                      displayValue={formatCurrency(Number(line.budget))}
                                      inputType="number"
                                      width={getWidth('budget')}
                                    />
                                    
                                    {/* Creatives with counter and quick add button */}
                                    {visibleColumns.creatives && (
                                      <div className="p-2 border-r flex items-center justify-between group shrink-0" style={{ width: getWidth('creatives') }}>
                                        <div className="flex items-center gap-1.5">
                                          <ImageIcon className="w-3 h-3 text-muted-foreground" />
                                          <span className={cn(
                                            "text-xs font-medium",
                                            info.creativesCount > 0 ? "text-foreground" : "text-muted-foreground"
                                          )}>
                                            {info.creativesCount}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary"
                                                onClick={() => onEditLine(line, 'creatives')}
                                              >
                                                <Plus className="w-3 h-3" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Adicionar criativo</TooltipContent>
                                          </Tooltip>
                                          {info.creativesCount > 0 && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={() => onEditLine(line, 'creatives')}
                                                >
                                                  <Pencil className="w-3 h-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Editar criativos</TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Status select */}
                                    <div className="p-2 border-r shrink-0" style={{ width: getWidth('status') }}>
                                      <Select
                                        value={line.status_id || 'none'}
                                        onValueChange={(value) => handleStatusChange(line.id, value)}
                                      >
                                        <SelectTrigger className="h-6 text-xs">
                                          <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">-</SelectItem>
                                          {statusesList.map(status => (
                                            <SelectItem key={status.id} value={status.id}>
                                              {status.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    {/* Editable Start Date */}
                                    <EditableCell
                                      line={line}
                                      field="start_date"
                                      displayValue={formatDate(line.start_date)}
                                      inputType="date"
                                      width={getWidth('start_date')}
                                    />
                                    
                                    {/* Editable End Date */}
                                    <EditableCell
                                      line={line}
                                      field="end_date"
                                      displayValue={formatDate(line.end_date)}
                                      inputType="date"
                                      width={getWidth('end_date')}
                                    />
                                    
                                    {/* Action buttons */}
                                    <div className="p-2 border-r flex items-center gap-1 shrink-0" style={{ width: getWidth('actions') }}>
                                      {lineAlerts && <LineAlertIndicator alerts={lineAlerts(line.id)} size="sm" />}
                                      <UTMPreview
                                        destinationUrl={line.destination_url}
                                        utmParams={{
                                          utm_source: line.utm_source || undefined,
                                          utm_medium: line.utm_medium || undefined,
                                          utm_campaign: line.utm_campaign || undefined,
                                          utm_term: line.utm_term || undefined,
                                        }}
                                        isValidated={(line as any).utm_validated || false}
                                        compact
                                        validating={validatingLineId === line.id}
                                        onValidate={onValidateUTM ? async () => {
                                          setValidatingLineId(line.id);
                                          try {
                                            await onValidateUTM(line.id, true);
                                          } finally {
                                            setValidatingLineId(null);
                                          }
                                        } : undefined}
                                        onInvalidate={onValidateUTM ? async () => {
                                          setValidatingLineId(line.id);
                                          try {
                                            await onValidateUTM(line.id, false);
                                          } finally {
                                            setValidatingLineId(null);
                                          }
                                        } : undefined}
                                      />
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => onEditLine(line)}
                                          >
                                            <Settings2 className="w-3 h-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Editar linha completa</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                            onClick={() => onDeleteLine(line)}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Excluir linha</TooltipContent>
                                      </Tooltip>
                                    </div>
                                    
                                    {/* Campaign Days - fixed column */}
                                    <div className="p-2 border-r shrink-0 bg-primary/5 text-center text-xs" style={{ width: getWidth('days') }}>
                                      {getLineCampaignDays(line)}
                                    </div>
                                    
                                    {/* Allocated Budget - fixed column */}
                                    <div className="p-2 border-r shrink-0 bg-primary/5 text-xs font-medium" style={{ width: getWidth('allocated') }}>
                                      {formatCurrency(getLineAllocatedBudget(line.id))}
                                    </div>
                                    
                                    {/* Month columns - fixed columns */}
                                    {planMonths.map((month, idx) => (
                                      <MonthBudgetCell
                                        key={idx}
                                        lineId={line.id}
                                        line={line}
                                        month={month}
                                        value={getMonthBudget(line.id, month)}
                                        onUpdate={onUpdateMonthlyBudgets}
                                        isEditable={isMonthEditableForLine(line, month)}
                                      />
                                    ))}
                                  </motion.div>
                                );
                              })}
                              
                              {/* Add Line Button - always visible for each combination */}
                              <div className="p-2">
                                <AddLineButton
                                  subdivisionId={subdivisionGroup.subdivision.id || undefined}
                                  momentId={momentGroup.moment.id || undefined}
                                  funnelStageId={funnelGroup.funnelStage.id || undefined}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Footer - Subtotal */}
          <div className="flex bg-muted border-t" style={{ minWidth: `${viewMode === 'flat' ? getMinWidth() - 100 : getMinWidth()}px` }}>
            {visibleColumns.subdivision && <div className="p-3 font-bold shrink-0" style={{ width: getWidth('subdivision') }}>Subtotal:</div>}
            {visibleColumns.moment && <div className="p-3 shrink-0" style={{ width: getWidth('moment') }}></div>}
            {visibleColumns.funnel_stage && <div className="p-3 shrink-0" style={{ width: getWidth('funnel_stage') }}></div>}
            <div className="p-3 shrink-0" style={{ width: getWidth('line_code') }}></div>
            {visibleColumns.medium && <div className="p-3 shrink-0" style={{ width: getWidth('medium') }}></div>}
            {visibleColumns.vehicle && <div className="p-3 shrink-0" style={{ width: getWidth('vehicle') }}></div>}
            {visibleColumns.channel && <div className="p-3 shrink-0" style={{ width: getWidth('channel') }}></div>}
            {visibleColumns.target && <div className="p-3 shrink-0" style={{ width: getWidth('target') }}></div>}
            <div className="p-3 font-bold shrink-0" style={{ width: getWidth('budget') }}>{formatCurrency(totalBudget)}</div>
            {visibleColumns.creatives && <div className="p-3 shrink-0" style={{ width: getWidth('creatives') }}></div>}
            <div className="p-3 shrink-0" style={{ width: getWidth('status') }}></div>
            <div className="p-3 shrink-0" style={{ width: getWidth('start_date') }}></div>
            <div className="p-3 shrink-0" style={{ width: getWidth('end_date') }}></div>
            <div className="p-3 shrink-0" style={{ width: getWidth('actions') }}></div>
            {/* New columns totals */}
            <div className="p-3 shrink-0 bg-primary/5" style={{ width: getWidth('days') }}></div>
            <div className="p-3 shrink-0 bg-primary/5 font-bold text-xs" style={{ width: getWidth('allocated') }}>
              {formatCurrency(lines.reduce((sum, l) => sum + getLineAllocatedBudget(l.id), 0))}
            </div>
            {planMonths.map((month, idx) => (
              <div key={idx} className="p-3 shrink-0 bg-primary/5 text-xs font-medium text-center" style={{ width: getWidth('month') }}>
                {formatCurrency(lines.reduce((sum, l) => sum + getMonthBudget(l.id, month), 0))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
