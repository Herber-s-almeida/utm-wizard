import { useState, useMemo, useCallback, useEffect, useRef, UIEvent } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Plus, Image as ImageIcon, Check, X, Settings2, Filter, Columns, Search, AlertTriangle, Link, LayoutGrid, List, Link2, RotateCcw } from 'lucide-react';
import { LineDetailButton } from '@/components/media-plan/LineDetailButton';
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
  FunnelStage,
  useMediaObjectives 
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
import { useResizableColumns, ColumnKey, MinWidthOverrides } from '@/hooks/useResizableColumns';
import { ResizableColumnHeader } from '@/components/media-plan/ResizableColumnHeader';
import { HierarchyLevel, DEFAULT_HIERARCHY_ORDER, getLevelLabel, getLevelLabelPlural } from '@/types/hierarchy';
import { 
  buildHierarchyTree, 
  HierarchyTreeNode, 
  HierarchyNodeData,
  NameResolver,
  MediaLineRef,
  BudgetDistribution as BuilderBudgetDistribution,
  LevelOrderConfig
} from '@/utils/hierarchyDataBuilder';

// Columns that can be toggled (excludes: Código, Orçamento, Status, Início, Fim, Ações)
type ToggleableColumn = 'subdivision' | 'moment' | 'funnel_stage' | 'medium' | 'vehicle' | 'channel' | 'target' | 'objective' | 'notes' | 'creatives';

// Build toggleable columns with dynamic labels from hierarchy config
const getToggleableColumns = (): { key: ToggleableColumn; label: string }[] => [
  { key: 'subdivision', label: getLevelLabel('subdivision') },
  { key: 'moment', label: getLevelLabelPlural('moment') },
  { key: 'funnel_stage', label: getLevelLabel('funnel_stage') },
  { key: 'medium', label: 'Meio' },
  { key: 'vehicle', label: 'Veículo' },
  { key: 'channel', label: 'Canal' },
  { key: 'target', label: 'Segmentação' },
  { key: 'objective', label: 'Objetivo' },
  { key: 'notes', label: 'Observações' },
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

// Build text filter columns with dynamic labels
const getTextFilterColumns = (): { key: TextFilterColumn; label: string }[] => [
  { key: 'code', label: 'Código' },
  { key: 'status', label: 'Status' },
  { key: 'subdivision', label: getLevelLabel('subdivision') },
  { key: 'moment', label: getLevelLabel('moment') },
  { key: 'funnel_stage', label: getLevelLabel('funnel_stage') },
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
  hierarchyOrder?: HierarchyLevel[];
  levelOrder?: LevelOrderConfig; // Ordering for subdivision/moment/funnel_stage
  showNewLineButtons?: boolean; // Control visibility of "New Line" buttons
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
  hierarchyOrder = DEFAULT_HIERARCHY_ORDER,
  levelOrder,
  showNewLineButtons = true,
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

  // Fetch media objectives
  const { data: mediaObjectives } = useMediaObjectives();

  // Helper to get objective name
  const getObjectiveName = useCallback((objectiveId: string | null | undefined): string => {
    if (!objectiveId) return '-';
    return mediaObjectives?.find(o => o.id === objectiveId)?.name || '-';
  }, [mediaObjectives]);

  // View mode: 'grouped' (hierarchical) or 'flat' (one line per row)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Synchronized horizontal scroll refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = useRef(false);

  const handleTopScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (isScrollingSyncRef.current) return;
    isScrollingSyncRef.current = true;
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    requestAnimationFrame(() => { isScrollingSyncRef.current = false; });
  }, []);

  const handleMainScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (isScrollingSyncRef.current) return;
    isScrollingSyncRef.current = true;
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    requestAnimationFrame(() => { isScrollingSyncRef.current = false; });
  }, []);

  // Auto-switch to flat mode when there are no budget distributions
  // This ensures users can see their lines even without hierarchy configured
  useEffect(() => {
    if (budgetDistributions.length === 0 && lines.length > 0) {
      setViewMode('flat');
    }
  }, [budgetDistributions.length, lines.length]);

  // Get name resolver for hierarchy levels
  const getNameForLevel = useCallback<NameResolver>((level: HierarchyLevel, refId: string | null): string => {
    if (!refId) return 'Geral';
    switch (level) {
      case 'subdivision': return subdivisionsList.find(s => s.id === refId)?.name || 'Geral';
      case 'moment': return momentsList.find(m => m.id === refId)?.name || 'Geral';
      case 'funnel_stage': return funnelStagesList.find(f => f.id === refId)?.name || 'Geral';
      default: return 'Geral';
    }
  }, [subdivisionsList, momentsList, funnelStagesList]);

  // Get the list of items for a given level
  const getItemsForLevel = useCallback((level: HierarchyLevel) => {
    switch (level) {
      case 'subdivision': return subdivisionsList;
      case 'moment': return momentsList;
      case 'funnel_stage': return funnelStagesList;
      default: return [];
    }
  }, [subdivisionsList, momentsList, funnelStagesList]);

  // Calculate dynamic minimum widths for grouped columns based on content
  const dynamicMinWidths = useMemo((): MinWidthOverrides => {
    if (viewMode !== 'grouped') return {};

    const measureText = (text: string, fontSize: number, fontWeight: number = 500): number => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 100;
      ctx.font = `${fontWeight} ${fontSize}px Inter, system-ui, sans-serif`;
      return Math.ceil(ctx.measureText(text).width);
    };

    const PADDING = 48; // p-2 container padding (16px) + card internal padding + margin
    const DATE_WIDTH = measureText('99/99/9999 - 99/99/9999', 11, 400);
    const CURRENCY_WIDTH = measureText('R$ 999.999,99', 16, 700);
    const PERCENTAGE_WIDTH = measureText('100% de Subdivisão', 10, 400);

    // Calculate dynamic widths based on hierarchyOrder
    const widths: MinWidthOverrides = {};
    
    for (const level of hierarchyOrder) {
      const items = getItemsForLevel(level);
      const maxNameWidth = Math.max(
        measureText('Geral', 13, 500),
        ...items.map(item => measureText(item.name, 13, 500))
      );
      
      // Moments have date range, need extra width
      const levelWidth = level === 'moment'
        ? Math.max(maxNameWidth, CURRENCY_WIDTH, DATE_WIDTH, PERCENTAGE_WIDTH) + PADDING
        : Math.max(maxNameWidth, CURRENCY_WIDTH, PERCENTAGE_WIDTH) + PADDING;
      
      widths[level] = levelWidth;
    }

    return widths;
  }, [viewMode, hierarchyOrder, getItemsForLevel]);

  // Resizable columns hook with dynamic min widths
  const { getWidth, handleResize, resetWidths } = useResizableColumns(viewMode, dynamicMinWidths);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<ToggleableColumn, boolean>>({
    subdivision: true,
    moment: true,
    funnel_stage: true,
    medium: true,
    vehicle: true,
    channel: true,
    target: true,
    objective: true,
    notes: true,
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

  // Build dynamic hierarchical tree based on hierarchyOrder
  const dynamicHierarchyTree = useMemo(() => {
    // Create MediaLineRef array for the builder
    const lineRefs: MediaLineRef[] = lines.map(l => ({
      id: l.id,
      budget: Number(l.budget) || 0,
      subdivision_id: l.subdivision_id,
      moment_id: l.moment_id,
      funnel_stage_id: l.funnel_stage_id,
    }));

    // If no distributions, create a fallback root node
    if (budgetDistributions.length === 0) {
      const totalBudget = Number(plan.total_budget) || 0;
      const allocated = lines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
      
      const rootNode: HierarchyTreeNode = {
        data: {
          id: null,
          distId: 'root',
          name: 'Geral',
          planned: totalBudget,
          allocated,
          percentage: 100,
          level: hierarchyOrder[0] || 'subdivision',
          parentDistId: null,
        },
        children: [],
      };
      return [rootNode];
    }

    return buildHierarchyTree(
      budgetDistributions as BuilderBudgetDistribution[],
      lineRefs,
      hierarchyOrder,
      getNameForLevel,
      levelOrder
    );
  }, [lines, budgetDistributions, plan.total_budget, hierarchyOrder, getNameForLevel, levelOrder]);

  // Helper to get line ref ID for a specific level
  const getLineRefIdForLevel = useCallback((line: MediaLine, level: HierarchyLevel): string | null => {
    switch (level) {
      case 'subdivision': return line.subdivision_id;
      case 'moment': return line.moment_id;
      case 'funnel_stage': return line.funnel_stage_id;
      default: return null;
    }
  }, []);

  // Get lines for a specific path in the hierarchy
  const getLinesForPath = useCallback((pathMap: Map<HierarchyLevel, string | null>): MediaLine[] => {
    return lines.filter(line => {
      for (const [level, expectedId] of pathMap) {
        const lineId = getLineRefIdForLevel(line, level);
        const matches = (expectedId === null && !lineId) || lineId === expectedId;
        if (!matches) return false;
      }
      return true;
    });
  }, [lines, getLineRefIdForLevel]);

  // Apply line filters to dynamic hierarchy tree
  const filterLine = useCallback((line: MediaLine): boolean => {
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
  }, [lineFilters, matchesTextFilter]);

  // Get filtered lines for a specific path
  const getFilteredLinesForPath = useCallback((pathMap: Map<HierarchyLevel, string | null>): MediaLine[] => {
    const hasAnyFilter = activeFiltersCount > 0 || isTextFilterActive;
    const pathLines = getLinesForPath(pathMap);
    if (!hasAnyFilter) return pathLines;
    return pathLines.filter(filterLine);
  }, [getLinesForPath, activeFiltersCount, isTextFilterActive, filterLine]);

  // Build prefill object from hierarchy path
  const buildPrefillFromPath = useCallback((pathMap: Map<HierarchyLevel, string | null>): { subdivisionId?: string; momentId?: string; funnelStageId?: string } => {
    const prefill: { subdivisionId?: string; momentId?: string; funnelStageId?: string } = {};
    
    for (const [level, id] of pathMap) {
      if (id) {
        if (level === 'subdivision') prefill.subdivisionId = id;
        else if (level === 'moment') prefill.momentId = id;
        else if (level === 'funnel_stage') prefill.funnelStageId = id;
      }
    }
    
    return prefill;
  }, []);

  // Find orphan lines that don't match any distribution path
  const orphanLines = useMemo(() => {
    if (budgetDistributions.length === 0) return [];
    
    const firstLevel = hierarchyOrder[0];
    const firstLevelDists = budgetDistributions.filter(d => d.distribution_type === firstLevel);
    const firstLevelRefIds = firstLevelDists.map(d => d.reference_id);
    
    return lines.filter(l => {
      const lineRefId = getLineRefIdForLevel(l, firstLevel);
      if (!lineRefId) {
        return !firstLevelRefIds.includes(null);
      }
      return !firstLevelRefIds.includes(lineRefId);
    });
  }, [lines, budgetDistributions, hierarchyOrder, getLineRefIdForLevel]);

  // Collect all lines from dynamic hierarchy tree (for flat array operations)
  const collectLinesFromTree = useCallback((nodes: HierarchyTreeNode[], pathMap: Map<HierarchyLevel, string | null>): MediaLine[] => {
    const allLines: MediaLine[] = [];
    
    for (const node of nodes) {
      const currentPath = new Map(pathMap);
      currentPath.set(node.data.level, node.data.id);
      
      if (node.children.length === 0) {
        // Leaf node - collect lines for this path
        const pathLines = getFilteredLinesForPath(currentPath);
        allLines.push(...pathLines);
      } else {
        // Recurse into children
        allLines.push(...collectLinesFromTree(node.children, currentPath));
      }
    }
    
    // Also add orphan lines if at root level
    if (pathMap.size === 0) {
      const hasAnyFilter = activeFiltersCount > 0 || isTextFilterActive;
      const filteredOrphans = hasAnyFilter ? orphanLines.filter(filterLine) : orphanLines;
      allLines.push(...filteredOrphans);
    }
    
    return allLines;
  }, [getFilteredLinesForPath, orphanLines, activeFiltersCount, isTextFilterActive, filterLine]);

  // Get all filtered lines as a flat array
  const filteredLines = useMemo(() => {
    return collectLinesFromTree(dynamicHierarchyTree, new Map());
  }, [dynamicHierarchyTree, collectLinesFromTree]);

  // Track previous filtered line IDs to avoid unnecessary updates
  const prevFilteredLineIdsRef = useRef<string>('');

  // Notify parent of filtered lines changes - using useEffect instead of useMemo to avoid render loop
  useEffect(() => {
    if (onFilteredLinesChange) {
      // Only notify if the filtered line IDs actually changed
      const currentIds = filteredLines.map(l => l.id).sort().join(',');
      if (currentIds !== prevFilteredLineIdsRef.current) {
        prevFilteredLineIdsRef.current = currentIds;
        onFilteredLinesChange(filteredLines);
      }
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
  }) => {
    if (!showNewLineButtons) return null;
    
    return (
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
  };

  const handleStatusChange = async (lineId: string, statusId: string) => {
    await onUpdateLine(lineId, { status_id: statusId === 'none' ? null : statusId });
  };

  // Render a single line row (used in both grouped and flat views)
  const renderLineRow = useCallback((line: MediaLine) => {
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
        {visibleColumns.objective && (
          <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('objective') }} title={getObjectiveName(line.objective_id)}>
            {getObjectiveName(line.objective_id)}
          </div>
        )}
        {visibleColumns.notes && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2 border-r truncate shrink-0 text-xs text-muted-foreground" style={{ width: getWidth('notes') }} title={line.notes || ''}>
                {line.notes ? (line.notes.length > 20 ? line.notes.substring(0, 20) + '...' : line.notes) : '-'}
              </div>
            </TooltipTrigger>
            {line.notes && (
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm whitespace-pre-wrap">{line.notes}</p>
              </TooltipContent>
            )}
          </Tooltip>
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
          <LineDetailButton mediaLineId={line.id} startDate={line.start_date} endDate={line.end_date} />
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
  }, [
    getLineDisplayInfo, existingLineCodes, getWidth, getOtherMoments, visibleColumns,
    handleStatusChange, statusesList, lineAlerts, validatingLineId, onValidateUTM,
    onEditLine, onDeleteLine, getLineCampaignDays, getLineAllocatedBudget, planMonths,
    getMonthBudget, onUpdateMonthlyBudgets, isMonthEditableForLine, formatCurrency,
    formatDate, generateLineCode
  ]);

  // Dynamic Hierarchy Renderer - renders hierarchy tree recursively based on hierarchyOrder
  interface DynamicHierarchyRendererProps {
    nodes: HierarchyTreeNode[];
    hierarchyOrder: HierarchyLevel[];
    pathMap: Map<HierarchyLevel, string | null>;
    levelIndex: number;
    parentName: string;
    visibleColumns: Record<ToggleableColumn, boolean>;
    dynamicMinWidths: MinWidthOverrides;
    getWidth: (key: ColumnKey) => number;
    getFilteredLinesForPath: (pathMap: Map<HierarchyLevel, string | null>) => MediaLine[];
    buildPrefillFromPath: (pathMap: Map<HierarchyLevel, string | null>) => { subdivisionId?: string; momentId?: string; funnelStageId?: string };
    onAddLine: (prefill?: { subdivisionId?: string; momentId?: string; funnelStageId?: string }) => void;
    renderLineRow: (line: MediaLine) => React.ReactNode;
  }

  const DynamicHierarchyRenderer = ({
    nodes,
    hierarchyOrder,
    pathMap,
    levelIndex,
    parentName,
    visibleColumns,
    dynamicMinWidths,
    getWidth,
    getFilteredLinesForPath,
    buildPrefillFromPath,
    onAddLine,
    renderLineRow,
  }: DynamicHierarchyRendererProps) => {
    const currentLevel = hierarchyOrder[levelIndex];
    const isLastLevel = levelIndex === hierarchyOrder.length - 1;
    
    return (
      <>
        {nodes.map((node, nodeIdx) => {
          const currentPath = new Map(pathMap);
          currentPath.set(currentLevel, node.data.id);
          
          // Get lines for this node path
          const nodeLines = isLastLevel ? getFilteredLinesForPath(currentPath) : [];
          const prefill = buildPrefillFromPath(currentPath);
          
          return (
            <div key={node.data.distId || `node-${nodeIdx}`} className="flex">
              {/* Budget Card Cell for this level */}
              {visibleColumns[currentLevel] && (
                <div 
                  className="p-2 border-r bg-background shrink-0" 
                  style={{ width: getWidth(currentLevel), minWidth: dynamicMinWidths[currentLevel] }}
                >
                  <BudgetCard
                    label={node.data.name}
                    planned={node.data.planned}
                    allocated={node.data.allocated}
                    percentageLabel={`${node.data.percentage.toFixed(0)}% de ${parentName}`}
                  />
                </div>
              )}
              
              {/* Content area - either children or lines */}
              <div className="flex-1 divide-y">
                {isLastLevel ? (
                  // Leaf level - render lines
                  <>
                    {nodeLines.map(line => renderLineRow(line))}
                    <div className="p-2">
                      <AddLineButton
                        subdivisionId={prefill.subdivisionId}
                        momentId={prefill.momentId}
                        funnelStageId={prefill.funnelStageId}
                      />
                    </div>
                  </>
                ) : (
                  // Non-leaf level - recurse into children
                  node.children.length > 0 ? (
                    <DynamicHierarchyRenderer
                      nodes={node.children}
                      hierarchyOrder={hierarchyOrder}
                      pathMap={currentPath}
                      levelIndex={levelIndex + 1}
                      parentName={node.data.name}
                      visibleColumns={visibleColumns}
                      dynamicMinWidths={dynamicMinWidths}
                      getWidth={getWidth}
                      getFilteredLinesForPath={getFilteredLinesForPath}
                      buildPrefillFromPath={buildPrefillFromPath}
                      onAddLine={onAddLine}
                      renderLineRow={renderLineRow}
                    />
                  ) : (
                    // No children but not last level - render lines directly
                    <>
                      {getFilteredLinesForPath(currentPath).map(line => renderLineRow(line))}
                      <div className="p-2">
                        <AddLineButton
                          subdivisionId={prefill.subdivisionId}
                          momentId={prefill.momentId}
                          funnelStageId={prefill.funnelStageId}
                        />
                      </div>
                    </>
                  )
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // Calculate dynamic column widths based on visible columns
  const getMinWidth = () => {
    let width = getWidth('line_code') + getWidth('budget') + getWidth('status') + 
                getWidth('start_date') + getWidth('end_date') + getWidth('actions');
    // New fixed columns: Dias, Orçamento Alocado, Months
    width += getWidth('days') + getWidth('allocated');
    width += planMonths.length * getWidth('month');
    // Add widths for hierarchy columns based on hierarchyOrder
    for (const level of hierarchyOrder) {
      if (visibleColumns[level]) {
        width += getWidth(level);
      }
    }
    if (visibleColumns.medium) width += getWidth('medium');
    if (visibleColumns.vehicle) width += getWidth('vehicle');
    if (visibleColumns.channel) width += getWidth('channel');
    if (visibleColumns.target) width += getWidth('target');
    if (visibleColumns.objective) width += getWidth('objective');
    if (visibleColumns.notes) width += getWidth('notes');
    if (visibleColumns.creatives) width += getWidth('creatives');
    return width;
  };

  const filteredColumnsList = getToggleableColumns().filter(col => 
    col.label.toLowerCase().includes(columnFilterSearch.toLowerCase())
  );

  const getStatusName = (statusId: string | null) => {
    if (!statusId) return null;
    const found = statusesList.find(s => s.id === statusId);
    return found?.name || null;
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
                  
                  {/* Dynamic hierarchy filters - rendered in order of hierarchyOrder for grouped view */}
                  {viewMode === 'grouped' && hierarchyOrder.map((level) => {
                    const levelLabel = getLevelLabel(level);
                    const items = getItemsForLevel(level);
                    const filterKey = level === 'funnel_stage' ? 'funnel_stage' : level;
                    const searchMatch = levelLabel.toLowerCase().includes(lineFilterSearch.toLowerCase());
                    
                    if (!searchMatch) return null;
                    
                    return (
                      <div key={level} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{levelLabel}</Label>
                        <Select 
                          value={lineFilters[filterKey as keyof LineFilters]} 
                          onValueChange={(v) => setLineFilters(prev => ({ ...prev, [filterKey]: v === 'all' ? '' : v }))}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={`Todos`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {items.map(item => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                  
                  {/* Fixed order hierarchy filters for flat view */}
                  {viewMode === 'flat' && (
                    <>
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
                    </>
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
                {getTextFilterColumns().map(col => (
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
                  {getTextFilterColumns().find(c => c.key === textFilter.column)?.label} {TEXT_FILTER_OPERATORS.find(o => o.key === textFilter.operator)?.label.toLowerCase()} "{textFilter.value}"
                  <X className="w-3 h-3 cursor-pointer" onClick={clearTextFilter} />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Top scrollbar - synchronized with main table */}
        <div 
          ref={topScrollRef}
          className="border border-b-0 rounded-t-lg overflow-x-auto scrollbar-top"
          onScroll={handleTopScroll}
        >
          <div style={{ width: `${getMinWidth()}px`, height: 1 }} />
        </div>

        <div 
          ref={mainScrollRef}
          className="border border-t-0 rounded-b-lg overflow-x-auto scrollbar-main"
          onScroll={handleMainScroll}
        >
          {/* Header - Dynamic based on hierarchyOrder for grouped view */}
          <div className="flex bg-muted/50 text-xs font-medium text-muted-foreground border-b" style={{ minWidth: `${viewMode === 'flat' ? getMinWidth() - 100 : getMinWidth()}px` }}>
            {/* Render hierarchy columns in order for grouped view */}
            {viewMode === 'grouped' && hierarchyOrder.map((level) => 
              visibleColumns[level] && (
                <ResizableColumnHeader 
                  key={level}
                  columnKey={level} 
                  width={getWidth(level)} 
                  minWidth={dynamicMinWidths[level]} 
                  onResize={handleResize} 
                  className="p-3 border-r"
                >
                  {getLevelLabel(level)}
                </ResizableColumnHeader>
              )
            )}
            {/* Fixed order for flat view (for backwards compatibility) */}
            {viewMode === 'flat' && (
              <>
                {visibleColumns.subdivision && (
                  <ResizableColumnHeader columnKey="subdivision" width={getWidth('subdivision')} minWidth={dynamicMinWidths.subdivision} onResize={handleResize} className="p-3 border-r">
                    {getLevelLabel('subdivision')}
                  </ResizableColumnHeader>
                )}
                {visibleColumns.moment && (
                  <ResizableColumnHeader columnKey="moment" width={getWidth('moment')} minWidth={dynamicMinWidths.moment} onResize={handleResize} className="p-3 border-r">
                    {getLevelLabel('moment')}
                  </ResizableColumnHeader>
                )}
                {visibleColumns.funnel_stage && (
                  <ResizableColumnHeader columnKey="funnel_stage" width={getWidth('funnel_stage')} minWidth={dynamicMinWidths.funnel_stage} onResize={handleResize} className="p-3 border-r">
                    {getLevelLabel('funnel_stage')}
                  </ResizableColumnHeader>
                )}
              </>
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
            {visibleColumns.objective && (
              <ResizableColumnHeader columnKey="objective" width={getWidth('objective')} onResize={handleResize} className="p-3 border-r">
                Objetivo
              </ResizableColumnHeader>
            )}
            {visibleColumns.notes && (
              <ResizableColumnHeader columnKey="notes" width={getWidth('notes')} onResize={handleResize} className="p-3 border-r">
                Obs.
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
                    {visibleColumns.objective && (
                      <div className="p-2 border-r truncate shrink-0" style={{ width: getWidth('objective') }} title={getObjectiveName(line.objective_id)}>
                        {getObjectiveName(line.objective_id)}
                      </div>
                    )}
                    {visibleColumns.notes && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="p-2 border-r truncate shrink-0 text-xs text-muted-foreground cursor-help" 
                            style={{ width: getWidth('notes') }}
                          >
                            {line.notes ? (line.notes.length > 15 ? line.notes.substring(0, 15) + '...' : line.notes) : '-'}
                          </div>
                        </TooltipTrigger>
                        {line.notes && (
                          <TooltipContent className="max-w-xs whitespace-pre-wrap">
                            {line.notes}
                          </TooltipContent>
                        )}
                      </Tooltip>
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
                        <LineDetailButton mediaLineId={line.id} startDate={line.start_date} endDate={line.end_date} />
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
              {showNewLineButtons && (
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
              )}
            </div>
          )}

          {/* Grouped View - Dynamic hierarchical with budget cards */}
          {viewMode === 'grouped' && hierarchyOrder.length > 0 && (
            <div className="divide-y" style={{ minWidth: `${getMinWidth()}px` }}>
              {/* Render hierarchy tree recursively */}
              <DynamicHierarchyRenderer
                nodes={dynamicHierarchyTree}
                hierarchyOrder={hierarchyOrder}
                pathMap={new Map()}
                levelIndex={0}
                parentName="plano"
                visibleColumns={visibleColumns}
                dynamicMinWidths={dynamicMinWidths}
                getWidth={getWidth}
                getFilteredLinesForPath={getFilteredLinesForPath}
                buildPrefillFromPath={buildPrefillFromPath}
                onAddLine={onAddLine}
                renderLineRow={renderLineRow}
              />
              
              {/* Orphan lines section */}
              {orphanLines.length > 0 && (
                <div className="flex">
                  {/* Show empty cards for each hierarchy level */}
                  {hierarchyOrder.map((level, idx) => 
                    visibleColumns[level] && (
                      <div 
                        key={level} 
                        className="p-2 border-r bg-muted/50 shrink-0" 
                        style={{ width: getWidth(level), minWidth: dynamicMinWidths[level] }}
                      >
                        {idx === 0 && (
                          <BudgetCard
                            label="Sem Classificação"
                            planned={0}
                            allocated={orphanLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0)}
                            percentageLabel="Linhas órfãs"
                          />
                        )}
                      </div>
                    )
                  )}
                  
                  {/* Orphan lines */}
                  <div className="flex-1 divide-y">
                    {orphanLines.filter(filterLine).map(line => renderLineRow(line))}
                    <div className="p-2">
                      <AddLineButton subdivisionId={undefined} momentId={undefined} funnelStageId={undefined} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grouped View - No hierarchy levels (show lines directly) */}
          {viewMode === 'grouped' && hierarchyOrder.length === 0 && (
            <div className="divide-y" style={{ minWidth: `${getMinWidth()}px` }}>
              {lines.filter(filterLine).map(line => renderLineRow(line))}
              {lines.filter(filterLine).length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">Nenhuma linha encontrada.</p>
                </div>
              )}
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

          {/* Footer - Subtotal - Dynamic based on hierarchyOrder */}
          <div className="flex bg-muted border-t" style={{ minWidth: `${viewMode === 'flat' ? getMinWidth() - 100 : getMinWidth()}px` }}>
            {/* Render footer cells for each hierarchy level in order */}
            {viewMode === 'grouped' && hierarchyOrder.map((level, idx) => 
              visibleColumns[level] && (
                <div 
                  key={level} 
                  className={cn("p-3 shrink-0", idx === 0 && "font-bold")} 
                  style={{ width: getWidth(level) }}
                >
                  {idx === 0 ? 'Subtotal:' : ''}
                </div>
              )
            )}
            {/* Flat view hierarchy columns */}
            {viewMode === 'flat' && (
              <>
                {visibleColumns.subdivision && <div className="p-3 font-bold shrink-0" style={{ width: getWidth('subdivision') }}>Subtotal:</div>}
                {visibleColumns.moment && <div className="p-3 shrink-0" style={{ width: getWidth('moment') }}></div>}
                {visibleColumns.funnel_stage && <div className="p-3 shrink-0" style={{ width: getWidth('funnel_stage') }}></div>}
              </>
            )}
            <div className="p-3 shrink-0" style={{ width: getWidth('line_code') }}></div>
            {visibleColumns.medium && <div className="p-3 shrink-0" style={{ width: getWidth('medium') }}></div>}
            {visibleColumns.vehicle && <div className="p-3 shrink-0" style={{ width: getWidth('vehicle') }}></div>}
            {visibleColumns.channel && <div className="p-3 shrink-0" style={{ width: getWidth('channel') }}></div>}
            {visibleColumns.target && <div className="p-3 shrink-0" style={{ width: getWidth('target') }}></div>}
            {visibleColumns.objective && <div className="p-3 shrink-0" style={{ width: getWidth('objective') }}></div>}
            {visibleColumns.notes && <div className="p-3 shrink-0" style={{ width: getWidth('notes') }}></div>}
            <div className="p-3 font-bold shrink-0" style={{ width: getWidth('budget') }}>{formatCurrency(totalBudget)}</div>
            {visibleColumns.creatives && <div className="p-3 shrink-0" style={{ width: getWidth('creatives') }}></div>}
            <div className="p-3 shrink-0" style={{ width: getWidth('status') }}></div>
            <div className="p-3 shrink-0" style={{ width: getWidth('start_date') }}></div>
            <div className="p-3 shrink-0" style={{ width: getWidth('end_date') }}></div>
            <div className="p-3 shrink-0" style={{ width: getWidth('actions') }}></div>
            {/* Fixed columns totals */}
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
