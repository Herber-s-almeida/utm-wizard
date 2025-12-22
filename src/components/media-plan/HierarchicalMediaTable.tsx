import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Plus, Image as ImageIcon, Check, X, Settings2, Filter, Columns, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MediaLine, MediaPlan, MediaCreative } from '@/types/media';
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
import { format } from 'date-fns';
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
  start_date: string;
  end_date: string;
}

interface BudgetDistribution {
  id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
}

interface HierarchicalMediaTableProps {
  plan: MediaPlan;
  lines: MediaLine[];
  creatives: Record<string, MediaCreative[]>;
  budgetDistributions: BudgetDistribution[];
  mediums: Medium[];
  vehicles: Vehicle[];
  channels: Channel[];
  targets: Target[];
  subdivisions?: Subdivision[];
  moments?: Moment[];
  funnelStages?: FunnelStage[];
  statuses?: Status[];
  onEditLine: (line: MediaLine, initialStep?: string) => void;
  onDeleteLine: (line: MediaLine) => void;
  onAddLine: (prefill?: { subdivisionId?: string; momentId?: string; funnelStageId?: string }) => void;
  onUpdateLine: (lineId: string, updates: Partial<MediaLine>) => Promise<void>;
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
  mediums,
  vehicles,
  channels,
  targets,
  subdivisions: subdivisionsList = [],
  moments: momentsList = [],
  funnelStages: funnelStagesList = [],
  statuses: statusesList = [],
  onEditLine,
  onDeleteLine,
  onAddLine,
  onUpdateLine,
}: HierarchicalMediaTableProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState<string>('');

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
    start_date: '',
    end_date: '',
  });

  const [columnFilterSearch, setColumnFilterSearch] = useState('');
  const [lineFilterSearch, setLineFilterSearch] = useState('');

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
      start_date: '',
      end_date: '',
    });
  };

  const activeFiltersCount = Object.values(lineFilters).filter(v => v !== '').length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
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
            moment: { id: momRefId, distId: momDist.id, name: momName, planned: momDist.amount, percentage: momDist.percentage },
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

    return nodes;
  }, [lines, budgetDistributions, plan.total_budget, subdivisionsList, momentsList, funnelStagesList]);

  // Apply line filters to the grouped data
  const filterLine = (line: MediaLine): boolean => {
    const info = getLineDisplayInfo(line);
    
    if (lineFilters.status && line.status_id !== lineFilters.status) return false;
    if (lineFilters.subdivision && line.subdivision_id !== lineFilters.subdivision) return false;
    if (lineFilters.moment && line.moment_id !== lineFilters.moment) return false;
    if (lineFilters.funnel_stage && line.funnel_stage_id !== lineFilters.funnel_stage) return false;
    if (lineFilters.code && !(line.line_code || '').toLowerCase().includes(lineFilters.code.toLowerCase())) return false;
    if (lineFilters.medium && line.medium_id !== lineFilters.medium) return false;
    if (lineFilters.vehicle && line.vehicle_id !== lineFilters.vehicle) return false;
    if (lineFilters.channel && line.channel_id !== lineFilters.channel) return false;
    if (lineFilters.target && line.target_id !== lineFilters.target) return false;
    if (lineFilters.start_date && line.start_date !== lineFilters.start_date) return false;
    if (lineFilters.end_date && line.end_date !== lineFilters.end_date) return false;
    
    return true;
  };

  // Create filtered grouped data
  const filteredGroupedData = useMemo(() => {
    if (activeFiltersCount === 0) return groupedData;
    
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
  }, [groupedData, lineFilters, activeFiltersCount]);

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
      updates.start_date = editValue;
    } else if (editingField === 'end_date') {
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

  const EditableCell = ({ 
    line, 
    field, 
    displayValue, 
    inputType = 'text',
    width 
  }: { 
    line: MediaLine; 
    field: EditingField; 
    displayValue: string;
    inputType?: 'text' | 'number' | 'date';
    width: string;
  }) => {
    const isEditing = isEditingField(line.id, field);
    
    return (
      <div className={cn("p-2 border-r shrink-0 group relative", width)}>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type={inputType}
              className="h-6 text-xs px-1 w-full"
              value={editValue}
              onChange={(e) => {
                const value = e.target.value;
                // Limit code field to 7 characters
                if (field === 'line_code' && value.length > 7) return;
                setEditValue(value);
              }}
              maxLength={field === 'line_code' ? 7 : undefined}
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
          <div className="flex items-center justify-between">
            <span className={field === 'budget' ? 'font-medium' : ''}>{displayValue}</span>
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
    description 
  }: { 
    label: string;
    planned: number;
    allocated: number;
    percentageLabel?: string;
    description?: string;
  }) => {
    const isOverBudget = allocated > planned;
    
    return (
      <div className="border rounded-lg p-2 h-full">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-lg font-bold mt-1">{formatCurrency(planned)}</div>
        <div className={cn(
          "text-sm font-medium mt-1",
          isOverBudget ? "text-destructive" : "text-primary"
        )}>
          {formatCurrency(allocated)} <span className="text-xs font-normal">alocado</span>
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
      className="w-full h-8 text-xs border-dashed border-primary text-primary hover:bg-primary/10 gap-1"
      onClick={() => onAddLine({ subdivisionId, momentId, funnelStageId })}
    >
      <Plus className="w-3 h-3" />
      Criar nova Linha
    </Button>
  );

  // Calculate dynamic column widths based on visible columns
  const getMinWidth = () => {
    let width = 100 + 120 + 100 + 100 + 100 + 90; // Fixed columns: Código, Orçamento, Status, Início, Fim, Ações
    if (visibleColumns.subdivision) width += 180;
    if (visibleColumns.moment) width += 180;
    if (visibleColumns.funnel_stage) width += 200;
    if (visibleColumns.medium) width += 80;
    if (visibleColumns.vehicle) width += 110;
    if (visibleColumns.channel) width += 100;
    if (visibleColumns.target) width += 130;
    if (visibleColumns.creatives) width += 80;
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
                <div className="font-medium text-sm">Exibir colunas</div>
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
                  
                  {/* Start Date filter */}
                  {'início'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Início</Label>
                      <Input
                        type="date"
                        value={lineFilters.start_date}
                        onChange={(e) => setLineFilters(prev => ({ ...prev, start_date: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  
                  {/* End Date filter */}
                  {'fim'.includes(lineFilterSearch.toLowerCase()) && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fim</Label>
                      <Input
                        type="date"
                        value={lineFilters.end_date}
                        onChange={(e) => setLineFilters(prev => ({ ...prev, end_date: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Active filters badges */}
          {activeFiltersCount > 0 && (
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
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          {/* Header */}
          <div className="flex bg-muted/50 text-xs font-medium text-muted-foreground border-b" style={{ minWidth: `${getMinWidth()}px` }}>
            {visibleColumns.subdivision && <div className="w-[180px] p-3 border-r shrink-0">Subdivisão do plano</div>}
            {visibleColumns.moment && <div className="w-[180px] p-3 border-r shrink-0">Momentos de Campanha</div>}
            {visibleColumns.funnel_stage && <div className="w-[200px] p-3 border-r shrink-0">Fase</div>}
            <div className="w-[100px] p-3 border-r shrink-0">Código</div>
            {visibleColumns.medium && <div className="w-[80px] p-3 border-r shrink-0">Meio</div>}
            {visibleColumns.vehicle && <div className="w-[110px] p-3 border-r shrink-0">Veículo</div>}
            {visibleColumns.channel && <div className="w-[100px] p-3 border-r shrink-0">Canal</div>}
            {visibleColumns.target && <div className="w-[130px] p-3 border-r shrink-0">Segmentação</div>}
            <div className="w-[120px] p-3 border-r shrink-0">Orçamento</div>
            {visibleColumns.creatives && <div className="w-[80px] p-3 border-r shrink-0">Criativos</div>}
            <div className="w-[100px] p-3 border-r shrink-0">Status</div>
            <div className="w-[100px] p-3 border-r shrink-0">Início</div>
            <div className="w-[100px] p-3 border-r shrink-0">Fim</div>
            <div className="w-[90px] p-3 shrink-0">Ações</div>
          </div>

          {/* Body */}
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
                                      width="w-[100px]"
                                    />
                                    
                                    {visibleColumns.medium && (
                                      <div className="w-[80px] p-2 border-r truncate shrink-0" title={info.medium}>
                                        {info.medium}
                                      </div>
                                    )}
                                    {visibleColumns.vehicle && (
                                      <div className="w-[110px] p-2 border-r truncate shrink-0" title={info.vehicle}>
                                        {info.vehicle}
                                      </div>
                                    )}
                                    {visibleColumns.channel && (
                                      <div className="w-[100px] p-2 border-r truncate shrink-0" title={info.channel}>
                                        {info.channel}
                                      </div>
                                    )}
                                    {visibleColumns.target && (
                                      <div className="w-[130px] p-2 border-r truncate shrink-0" title={info.target}>
                                        ({info.target})
                                      </div>
                                    )}
                                    
                                    {/* Editable Budget */}
                                    <EditableCell
                                      line={line}
                                      field="budget"
                                      displayValue={formatCurrency(Number(line.budget))}
                                      inputType="number"
                                      width="w-[120px]"
                                    />
                                    
                                    {/* Creatives with edit button */}
                                    {visibleColumns.creatives && (
                                      <div className="w-[80px] p-2 border-r flex items-center justify-between group shrink-0">
                                        <div className="flex items-center gap-1">
                                          <ImageIcon className="w-3 h-3 text-muted-foreground" />
                                          <span>{info.creativesCount}</span>
                                        </div>
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
                                      </div>
                                    )}
                                    
                                    {/* Status select */}
                                    <div className="w-[100px] p-2 border-r shrink-0">
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
                                      width="w-[100px]"
                                    />
                                    
                                    {/* Editable End Date */}
                                    <EditableCell
                                      line={line}
                                      field="end_date"
                                      displayValue={formatDate(line.end_date)}
                                      inputType="date"
                                      width="w-[100px]"
                                    />
                                    
                                    {/* Action buttons */}
                                    <div className="w-[90px] p-2 flex items-center gap-1 shrink-0">
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

          {/* Footer - Subtotal */}
          <div className="flex bg-muted border-t" style={{ minWidth: `${getMinWidth()}px` }}>
            {visibleColumns.subdivision && <div className="w-[180px] p-3 font-bold shrink-0">Subtotal:</div>}
            {visibleColumns.moment && <div className="w-[180px] p-3 shrink-0"></div>}
            {visibleColumns.funnel_stage && <div className="w-[200px] p-3 shrink-0"></div>}
            <div className="w-[100px] p-3 shrink-0"></div>
            {visibleColumns.medium && <div className="w-[80px] p-3 shrink-0"></div>}
            {visibleColumns.vehicle && <div className="w-[110px] p-3 shrink-0"></div>}
            {visibleColumns.channel && <div className="w-[100px] p-3 shrink-0"></div>}
            {visibleColumns.target && <div className="w-[130px] p-3 shrink-0"></div>}
            <div className="w-[120px] p-3 font-bold shrink-0">{formatCurrency(totalBudget)}</div>
            {visibleColumns.creatives && <div className="w-[80px] p-3 shrink-0"></div>}
            <div className="flex-1"></div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
