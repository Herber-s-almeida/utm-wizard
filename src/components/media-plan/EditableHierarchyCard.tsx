import { useState, useMemo } from 'react';
import { Check, X, Pencil, AlertTriangle, ChevronDown, Layers, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AnimatedCollapsible,
  AnimatedCollapsibleContent,
  AnimatedCollapsibleTrigger,
} from '@/components/ui/animated-collapsible';
import { motion } from 'framer-motion';
import { HierarchyLevel, getLevelLabel, getLevelLabelPlural, DEFAULT_HIERARCHY_ORDER } from '@/types/hierarchy';
import { HierarchyTreeNode, flattenHierarchyTree, countDescendantRows, getHierarchyColumnHeaders } from '@/utils/hierarchyDataBuilder';

interface BudgetDistribution {
  id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
}

// Legacy interface for backwards compatibility
interface SubdivisionData {
  id: string | null;
  distId: string;
  name: string;
  planned: number;
  percentage: number;
}

interface MomentData {
  id: string | null;
  distId: string;
  name: string;
  planned: number;
  percentage: number;
  parentDistId: string;
}

interface FunnelStageData {
  id: string | null;
  distId: string;
  name: string;
  planned: number;
  percentage: number;
  parentDistId: string;
}

interface HierarchyRow {
  subdivision: SubdivisionData;
  subdivisionAllocated: number;
  moments: {
    moment: MomentData;
    momentAllocated: number;
    funnelStages: {
      funnelStage: FunnelStageData;
      funnelStageAllocated: number;
    }[];
  }[];
}

interface EditableHierarchyCardProps {
  planId: string;
  planName: string;
  totalBudget: number;
  budgetDistributions: BudgetDistribution[];
  hierarchyData: HierarchyRow[]; // Legacy - kept for backwards compatibility
  hierarchyTree?: HierarchyTreeNode[]; // New dynamic tree
  hierarchyOrder?: HierarchyLevel[];
  onDistributionsUpdated: () => void;
  onHide?: () => void;
}

type EditingCell = {
  type: HierarchyLevel;
  distId: string;
} | null;

export function EditableHierarchyCard({
  planId,
  planName,
  totalBudget,
  budgetDistributions,
  hierarchyData,
  hierarchyTree,
  hierarchyOrder = DEFAULT_HIERARCHY_ORDER,
  onDistributionsUpdated,
  onHide,
}: EditableHierarchyCardProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('collapsible-budget-hierarchy');
    return stored === 'true';
  });
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Flatten the dynamic tree for rendering
  const flatRows = useMemo(() => {
    if (!hierarchyTree || hierarchyTree.length === 0) return null;
    return flattenHierarchyTree(hierarchyTree, hierarchyOrder);
  }, [hierarchyTree, hierarchyOrder]);

  // Get column headers based on order
  const columnHeaders = useMemo(() => {
    return getHierarchyColumnHeaders(hierarchyOrder);
  }, [hierarchyOrder]);

  // Calculate totals by level for validation
  const levelTotals = useMemo(() => {
    if (!flatRows) return {};
    const totals: Record<number, number> = {};
    for (let i = 0; i < hierarchyOrder.length; i++) {
      const uniqueDistIds = new Set<string>();
      let total = 0;
      for (const row of flatRows) {
        const level = row.levels[i];
        if (level && !uniqueDistIds.has(level.distId)) {
          uniqueDistIds.add(level.distId);
          total += level.planned;
        }
      }
      totals[i] = total;
    }
    return totals;
  }, [flatRows, hierarchyOrder]);

  // Check if level sum exceeds parent
  const isLevelOverBudget = (levelIndex: number): boolean => {
    if (levelIndex === 0) {
      return (levelTotals[0] || 0) > totalBudget;
    }
    // For deeper levels, would need to check per-parent, handled in cell rendering
    return false;
  };

  const startEditing = (type: HierarchyLevel, distId: string, currentValue: number) => {
    setEditingCell({ type, distId });
    setEditValue(currentValue.toString());
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell || !user?.id) return;

    const newAmount = parseFloat(editValue) || 0;
    if (newAmount < 0) {
      toast.error('O valor não pode ser negativo');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('plan_budget_distributions')
        .update({ 
          amount: newAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCell.distId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Valor atualizado');
      onDistributionsUpdated();
      cancelEditing();
    } catch (error) {
      console.error('Error updating distribution:', error);
      toast.error('Erro ao atualizar valor');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEditing();
  };

  // If no real distributions, don't show the card
  const hasRealDistributions = budgetDistributions.length > 0 && 
    hierarchyData.some(row => row.subdivision.distId !== 'root' && row.subdivision.distId !== 'none');

  if (!hasRealDistributions) {
    return null;
  }

  // Render dynamic table using flatRows
  const renderDynamicTable = () => {
    if (!flatRows || flatRows.length === 0) return null;

    // Track which cells have already been rendered (for rowspan)
    const renderedCells: Record<string, boolean> = {};

    // Calculate rowspans for each cell
    const getRowSpan = (rowIndex: number, levelIndex: number): number => {
      const currentDistId = flatRows[rowIndex].levels[levelIndex]?.distId;
      if (!currentDistId || renderedCells[`${levelIndex}-${currentDistId}`]) return 0;
      
      let count = 0;
      for (let i = rowIndex; i < flatRows.length; i++) {
        if (flatRows[i].levels[levelIndex]?.distId === currentDistId) {
          count++;
        } else {
          break;
        }
      }
      return count;
    };

    return (
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr>
            {columnHeaders.map((header, idx) => (
              <th 
                key={idx} 
                className={cn(
                  "text-left px-4 py-2 font-medium",
                  idx < columnHeaders.length - 1 && "border-r"
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flatRows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-t">
              {row.levels.map((levelData, levelIdx) => {
                const rowSpan = getRowSpan(rowIdx, levelIdx);
                
                // Skip if already rendered
                if (rowSpan === 0) return null;
                
                // Mark as rendered
                renderedCells[`${levelIdx}-${levelData.distId}`] = true;

                // Calculate if this level's children exceed parent
                const parentPlanned = levelIdx > 0 ? row.levels[levelIdx - 1]?.planned || 0 : totalBudget;
                const isOverBudget = levelData.planned > parentPlanned;
                const canEdit = levelData.distId !== 'root' && levelData.distId !== 'none';
                const parentName = levelIdx > 0 
                  ? row.levels[levelIdx - 1]?.name || planName 
                  : planName;

                // Background color based on level
                const bgClass = levelIdx === 0 
                  ? "bg-primary/5" 
                  : levelIdx === 1 
                    ? "bg-secondary/5" 
                    : "";

                return (
                  <td 
                    key={levelIdx}
                    rowSpan={rowSpan}
                    className={cn(
                      "px-4 py-3 align-top",
                      levelIdx < columnHeaders.length - 1 && "border-r",
                      bgClass
                    )}
                  >
                    <EditableCell
                      name={levelData.name}
                      planned={levelData.planned}
                      allocated={levelData.allocated}
                      percentage={levelData.percentage}
                      percentageOf={parentName}
                      isEditing={editingCell?.distId === levelData.distId}
                      editValue={editValue}
                      onEditValueChange={setEditValue}
                      onStartEdit={() => startEditing(levelData.level, levelData.distId, levelData.planned)}
                      onSave={saveEdit}
                      onCancel={cancelEditing}
                      onKeyDown={handleKeyDown}
                      saving={saving}
                      isOverBudget={isOverBudget}
                      overBudgetMessage={`O valor excede o nível anterior "${parentName}"`}
                      canEdit={canEdit}
                      formatCurrency={formatCurrency}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <TooltipProvider>
      <AnimatedCollapsible open={isOpen} onOpenChange={setIsOpen} storageKey="budget-hierarchy" className="border rounded-lg overflow-hidden bg-card">
        {/* Collapsed Header / Trigger */}
        <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors">
          <AnimatedCollapsibleTrigger asChild>
            <button className="flex-1 flex items-center gap-3 text-left">
              <Layers className="h-4 w-4 text-primary" />
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Hierarquia do Orçamento</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    Visualize e edite a distribuição do orçamento. Clique nos valores para editar diretamente.
                  </TooltipContent>
                </Tooltip>
              </div>
              {!isOpen && (
                <p className="text-xs text-muted-foreground">
                  {hierarchyOrder.map(l => getLevelLabelPlural(l)).join(' → ')} • Clique para expandir
                </p>
              )}
            </button>
          </AnimatedCollapsibleTrigger>
          
          <div className="flex items-center gap-1">
            {onHide && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onHide();
                    }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Ocultar esta seção
                </TooltipContent>
              </Tooltip>
            )}
            
            <AnimatedCollapsibleTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </button>
            </AnimatedCollapsibleTrigger>
          </div>
        </div>

        <AnimatedCollapsibleContent>
          {/* Description */}
          <div className="px-4 py-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Clique para editar os valores. Avisos aparecerão quando valores excederem a hierarquia anterior.
            </p>
          </div>

          {/* Dynamic Table */}
          <div className="overflow-x-auto">
            {renderDynamicTable()}
          </div>
        </AnimatedCollapsibleContent>
      </AnimatedCollapsible>
    </TooltipProvider>
  );
}

interface EditableCellProps {
  name: string;
  planned: number;
  allocated: number;
  percentage: number;
  percentageOf: string;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  saving: boolean;
  isOverBudget: boolean;
  overBudgetMessage: string;
  canEdit: boolean;
  formatCurrency: (value: number) => string;
}

function EditableCell({
  name,
  planned,
  allocated,
  percentage,
  percentageOf,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSave,
  onCancel,
  onKeyDown,
  saving,
  isOverBudget,
  overBudgetMessage,
  canEdit,
  formatCurrency,
}: EditableCellProps) {
  return (
    <div className="group">
      <div className="font-medium text-sm">{name}</div>
      
      {/* Planned Amount - Editable */}
      <div className="mt-1">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                type="number"
                step="0.01"
                className="h-8 pl-8 pr-2 text-lg font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={editValue}
                onChange={(e) => onEditValueChange(e.target.value)}
                onKeyDown={onKeyDown}
                autoFocus
                disabled={saving}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-success hover:text-success shrink-0"
              onClick={onSave}
              disabled={saving}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold">{formatCurrency(planned)}</span>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={onStartEdit}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
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
                  <p className="text-sm font-medium text-destructive">{overBudgetMessage}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Allocated */}
      <div className={cn(
        "text-sm mt-1",
        allocated > planned ? "text-destructive font-medium" : "text-primary"
      )}>
        {formatCurrency(allocated)} <span className="text-muted-foreground font-normal">alocado</span>
      </div>

      {/* Percentage */}
      <div className="text-xs text-muted-foreground mt-1">
        {percentage.toFixed(0)}% de {percentageOf}
      </div>
    </div>
  );
}