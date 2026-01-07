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

interface BudgetDistribution {
  id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
}

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
  hierarchyData: HierarchyRow[];
  onDistributionsUpdated: () => void;
}

type EditingCell = {
  type: 'subdivision' | 'moment' | 'funnel_stage';
  distId: string;
} | null;

export function EditableHierarchyCard({
  planId,
  planName,
  totalBudget,
  budgetDistributions,
  hierarchyData,
  onDistributionsUpdated,
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

  // Calculate totals by type for validation
  const totals = useMemo(() => {
    const subdivisionTotal = hierarchyData.reduce((acc, row) => acc + row.subdivision.planned, 0);
    
    return { subdivisionTotal };
  }, [hierarchyData]);

  // Check if subdivision sum exceeds plan budget
  const isSubdivisionOverBudget = totals.subdivisionTotal > totalBudget;

  // Check if moment sum exceeds subdivision budget for a specific subdivision
  const getMomentsSumForSubdivision = (subRow: HierarchyRow) => {
    return subRow.moments.reduce((acc, m) => acc + m.moment.planned, 0);
  };

  // Check if funnel stage sum exceeds moment budget
  const getFunnelStagesSumForMoment = (momentData: HierarchyRow['moments'][0]) => {
    return momentData.funnelStages.reduce((acc, f) => acc + f.funnelStage.planned, 0);
  };

  const startEditing = (type: 'subdivision' | 'moment' | 'funnel_stage', distId: string, currentValue: number) => {
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

  // If no real distributions (only Geral), don't show the card
  const hasRealDistributions = budgetDistributions.length > 0 && 
    hierarchyData.some(row => row.subdivision.distId !== 'root' && row.subdivision.distId !== 'none');

  if (!hasRealDistributions) {
    return null;
  }

  return (
    <TooltipProvider>
      <AnimatedCollapsible open={isOpen} onOpenChange={setIsOpen} storageKey="budget-hierarchy" className="border rounded-lg overflow-hidden bg-card">
        {/* Collapsed Header / Trigger */}
        <AnimatedCollapsibleTrigger asChild>
          <button 
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
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
                    Visualize e edite a distribuição do orçamento entre subdivisões, momentos e fases do funil. Clique nos valores para editar diretamente.
                  </TooltipContent>
                </Tooltip>
              </div>
              {!isOpen && (
                <p className="text-xs text-muted-foreground">
                  {hierarchyData.length} subdivisão(ões) • Clique para expandir
                </p>
              )}
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>
        </AnimatedCollapsibleTrigger>

        <AnimatedCollapsibleContent>
          {/* Description */}
          <div className="px-4 py-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Clique para editar os valores. Avisos aparecerão quando valores excederem a hierarquia anterior.
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2 font-medium border-r">Subdivisão do plano</th>
                  <th className="text-left px-4 py-2 font-medium border-r">Momentos de Campanha</th>
                  <th className="text-left px-4 py-2 font-medium">Fase</th>
                </tr>
              </thead>
              <tbody>
                {hierarchyData.map((subRow, subIdx) => {
                  // Count total rows for this subdivision
                  const totalMomentRows = subRow.moments.reduce((acc, m) => acc + m.funnelStages.length, 0);
                  const momentsSumOverBudget = getMomentsSumForSubdivision(subRow) > subRow.subdivision.planned;
                  
                  return subRow.moments.map((momentRow, momIdx) => {
                    // Rows for this moment
                    const funnelRows = momentRow.funnelStages.length;
                    const funnelSumOverBudget = getFunnelStagesSumForMoment(momentRow) > momentRow.moment.planned;
                    
                    return momentRow.funnelStages.map((funnelRow, funIdx) => {
                      const isFirstMoment = momIdx === 0 && funIdx === 0;
                      const isFirstFunnel = funIdx === 0;

                      return (
                        <tr key={`${subIdx}-${momIdx}-${funIdx}`} className="border-t">
                          {/* Subdivision Cell */}
                          {isFirstMoment && (
                            <td 
                              rowSpan={totalMomentRows} 
                              className="px-4 py-3 border-r align-top bg-primary/5"
                            >
                              <EditableCell
                                name={subRow.subdivision.name}
                                planned={subRow.subdivision.planned}
                                allocated={subRow.subdivisionAllocated}
                                percentage={subRow.subdivision.percentage}
                                percentageOf={planName}
                                isEditing={editingCell?.distId === subRow.subdivision.distId}
                                editValue={editValue}
                                onEditValueChange={setEditValue}
                                onStartEdit={() => startEditing('subdivision', subRow.subdivision.distId, subRow.subdivision.planned)}
                                onSave={saveEdit}
                                onCancel={cancelEditing}
                                onKeyDown={handleKeyDown}
                                saving={saving}
                                isOverBudget={isSubdivisionOverBudget}
                                overBudgetMessage={`A soma das subdivisões é maior do que o valor do plano "${planName}"`}
                                canEdit={subRow.subdivision.distId !== 'root' && subRow.subdivision.distId !== 'none'}
                                formatCurrency={formatCurrency}
                              />
                            </td>
                          )}

                          {/* Moment Cell */}
                          {isFirstFunnel && (
                            <td 
                              rowSpan={funnelRows} 
                              className="px-4 py-3 border-r align-top bg-secondary/5"
                            >
                              <EditableCell
                                name={momentRow.moment.name}
                                planned={momentRow.moment.planned}
                                allocated={momentRow.momentAllocated}
                                percentage={momentRow.moment.percentage}
                                percentageOf={subRow.subdivision.name}
                                isEditing={editingCell?.distId === momentRow.moment.distId}
                                editValue={editValue}
                                onEditValueChange={setEditValue}
                                onStartEdit={() => startEditing('moment', momentRow.moment.distId, momentRow.moment.planned)}
                                onSave={saveEdit}
                                onCancel={cancelEditing}
                                onKeyDown={handleKeyDown}
                                saving={saving}
                                isOverBudget={momentsSumOverBudget}
                                overBudgetMessage={`A soma dos momentos é maior do que a subdivisão "${subRow.subdivision.name}"`}
                                canEdit={momentRow.moment.distId !== 'root' && momentRow.moment.distId !== 'none'}
                                formatCurrency={formatCurrency}
                              />
                            </td>
                          )}

                          {/* Funnel Stage Cell */}
                          <td className="px-4 py-3 align-top">
                            <EditableCell
                              name={funnelRow.funnelStage.name}
                              planned={funnelRow.funnelStage.planned}
                              allocated={funnelRow.funnelStageAllocated}
                              percentage={funnelRow.funnelStage.percentage}
                              percentageOf={momentRow.moment.name}
                              isEditing={editingCell?.distId === funnelRow.funnelStage.distId}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              onStartEdit={() => startEditing('funnel_stage', funnelRow.funnelStage.distId, funnelRow.funnelStage.planned)}
                              onSave={saveEdit}
                              onCancel={cancelEditing}
                              onKeyDown={handleKeyDown}
                              saving={saving}
                              isOverBudget={funnelSumOverBudget}
                              overBudgetMessage={`A soma das fases é maior do que o momento "${momentRow.moment.name}"`}
                              canEdit={funnelRow.funnelStage.distId !== 'root' && funnelRow.funnelStage.distId !== 'none'}
                              formatCurrency={formatCurrency}
                            />
                          </td>
                        </tr>
                      );
                    });
                  });
                })}
              </tbody>
            </table>
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
