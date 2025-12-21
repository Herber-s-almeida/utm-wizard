import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Plus, Image as ImageIcon, Check, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MediaLine, MediaPlan, MediaCreative } from '@/types/media';
import { 
  Medium, 
  Vehicle, 
  Channel, 
  Target 
} from '@/hooks/useConfigData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  onEditLine: (line: MediaLine, initialStep?: string) => void;
  onDeleteLine: (line: MediaLine) => void;
  onAddLine: (prefill?: { subdivisionId?: string; momentId?: string; funnelStageId?: string }) => void;
  onUpdateLine: (lineId: string, updates: Partial<MediaLine>) => Promise<void>;
}

interface SubdivisionInfo {
  id: string | null;
  name: string;
  planned: number;
}

interface MomentInfo {
  id: string | null;
  name: string;
  planned: number;
}

interface FunnelStageInfo {
  id: string | null;
  name: string;
  planned: number;
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

type EditingField = 'budget' | 'start_date' | 'end_date' | null;

export function HierarchicalMediaTable({
  plan,
  lines,
  creatives,
  budgetDistributions,
  mediums,
  vehicles,
  channels,
  targets,
  onEditLine,
  onDeleteLine,
  onAddLine,
  onUpdateLine,
}: HierarchicalMediaTableProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState<string>('');

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

  // Build hierarchical structure based on saved budget distributions
  const groupedData = useMemo((): HierarchyNode[] => {
    const totalBudget = Number(plan.total_budget) || 0;
    const nodes: HierarchyNode[] = [];

    // Get unique subdivisions from distributions
    const subdivisionDists = budgetDistributions.filter(d => d.distribution_type === 'subdivision');
    const momentDists = budgetDistributions.filter(d => d.distribution_type === 'moment');
    const funnelDists = budgetDistributions.filter(d => d.distribution_type === 'funnel_stage');

    // If there are subdivision distributions, use them
    if (subdivisionDists.length > 0) {
      subdivisionDists.forEach(subDist => {
        const subId = subDist.reference_id;
        const subAllocated = lines
          .filter(l => l.subdivision_id === subId)
          .reduce((acc, l) => acc + (Number(l.budget) || 0), 0);

        // Get moments for this subdivision
        const subMomentDists = momentDists.filter(m => m.parent_distribution_id === subId);
        const momentNodes: HierarchyNode['moments'] = [];

        if (subMomentDists.length > 0) {
          subMomentDists.forEach(momDist => {
            const momId = momDist.reference_id;
            const momAllocated = lines
              .filter(l => l.subdivision_id === subId && l.moment_id === momId)
              .reduce((acc, l) => acc + (Number(l.budget) || 0), 0);

            // Get funnel stages for this moment
            const momKey = `${subId}_${momId}`;
            const momFunnelDists = funnelDists.filter(f => f.parent_distribution_id === momKey);
            const funnelNodes: HierarchyNode['moments'][0]['funnelStages'] = [];

            if (momFunnelDists.length > 0) {
              momFunnelDists.forEach(funDist => {
                const funId = funDist.reference_id;
                const matchingLines = lines.filter(l => 
                  l.subdivision_id === subId && l.moment_id === momId && l.funnel_stage_id === funId
                );
                const funAllocated = matchingLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);

                funnelNodes.push({
                  funnelStage: { id: funId, name: `Fase ${funId?.slice(0,4) || ''}`, planned: funDist.amount },
                  funnelStageAllocated: funAllocated,
                  lines: matchingLines,
                });
              });
            } else {
              // No funnel distributions - single "no funnel" node
              const matchingLines = lines.filter(l => 
                l.subdivision_id === subId && l.moment_id === momId
              );
              const funAllocated = matchingLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
              funnelNodes.push({
                funnelStage: { id: null, name: 'Sem fase', planned: momDist.amount },
                funnelStageAllocated: funAllocated,
                lines: matchingLines,
              });
            }

            momentNodes.push({
              moment: { id: momId, name: `Momento ${momId?.slice(0,4) || ''}`, planned: momDist.amount },
              momentAllocated: momAllocated,
              funnelStages: funnelNodes,
            });
          });
        } else {
          // No moment distributions - check if there are funnel distributions directly
          const subFunnelDists = funnelDists.filter(f => f.parent_distribution_id === subId || f.parent_distribution_id?.startsWith(subId || ''));
          
          if (subFunnelDists.length > 0) {
            // Has funnel stages under subdivision directly (no moments)
            const funnelNodes: HierarchyNode['moments'][0]['funnelStages'] = [];
            subFunnelDists.forEach(funDist => {
              const funId = funDist.reference_id;
              const matchingLines = lines.filter(l => 
                l.subdivision_id === subId && l.funnel_stage_id === funId
              );
              const funAllocated = matchingLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
              funnelNodes.push({
                funnelStage: { id: funId, name: `Fase ${funId?.slice(0,4) || ''}`, planned: funDist.amount },
                funnelStageAllocated: funAllocated,
                lines: matchingLines,
              });
            });
            momentNodes.push({
              moment: { id: null, name: 'Sem momento', planned: subDist.amount },
              momentAllocated: subAllocated,
              funnelStages: funnelNodes,
            });
          } else {
            // No moments, no funnels - just subdivision
            const matchingLines = lines.filter(l => l.subdivision_id === subId);
            const funAllocated = matchingLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
            momentNodes.push({
              moment: { id: null, name: 'Sem momento', planned: subDist.amount },
              momentAllocated: subAllocated,
              funnelStages: [{
                funnelStage: { id: null, name: 'Sem fase', planned: subDist.amount },
                funnelStageAllocated: funAllocated,
                lines: matchingLines,
              }],
            });
          }
        }

        nodes.push({
          subdivision: { id: subId, name: `Subdivisão ${subId?.slice(0,4) || ''}`, planned: subDist.amount },
          subdivisionAllocated: subAllocated,
          moments: momentNodes,
        });
      });
    } else if (momentDists.length > 0) {
      // No subdivisions, but has moments at root level
      const rootMomentDists = momentDists.filter(m => !m.parent_distribution_id || m.parent_distribution_id === 'root');
      const momentNodes: HierarchyNode['moments'] = [];

      rootMomentDists.forEach(momDist => {
        const momId = momDist.reference_id;
        const momAllocated = lines
          .filter(l => l.moment_id === momId)
          .reduce((acc, l) => acc + (Number(l.budget) || 0), 0);

        // Get funnel stages for this moment
        const momKey = `root_${momId}`;
        const momFunnelDists = funnelDists.filter(f => f.parent_distribution_id === momKey);
        const funnelNodes: HierarchyNode['moments'][0]['funnelStages'] = [];

        if (momFunnelDists.length > 0) {
          momFunnelDists.forEach(funDist => {
            const funId = funDist.reference_id;
            const matchingLines = lines.filter(l => 
              l.moment_id === momId && l.funnel_stage_id === funId
            );
            const funAllocated = matchingLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
            funnelNodes.push({
              funnelStage: { id: funId, name: `Fase ${funId?.slice(0,4) || ''}`, planned: funDist.amount },
              funnelStageAllocated: funAllocated,
              lines: matchingLines,
            });
          });
        } else {
          const matchingLines = lines.filter(l => l.moment_id === momId);
          const funAllocated = matchingLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
          funnelNodes.push({
            funnelStage: { id: null, name: 'Sem fase', planned: momDist.amount },
            funnelStageAllocated: funAllocated,
            lines: matchingLines,
          });
        }

        momentNodes.push({
          moment: { id: momId, name: `Momento ${momId?.slice(0,4) || ''}`, planned: momDist.amount },
          momentAllocated: momAllocated,
          funnelStages: funnelNodes,
        });
      });

      nodes.push({
        subdivision: { id: null, name: 'Sem subdivisão', planned: totalBudget },
        subdivisionAllocated: lines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0),
        moments: momentNodes,
      });
    } else if (funnelDists.length > 0) {
      // Only funnel stages
      const funnelNodes: HierarchyNode['moments'][0]['funnelStages'] = [];
      funnelDists.forEach(funDist => {
        const funId = funDist.reference_id;
        const matchingLines = lines.filter(l => l.funnel_stage_id === funId);
        const funAllocated = matchingLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
        funnelNodes.push({
          funnelStage: { id: funId, name: `Fase ${funId?.slice(0,4) || ''}`, planned: funDist.amount },
          funnelStageAllocated: funAllocated,
          lines: matchingLines,
        });
      });

      nodes.push({
        subdivision: { id: null, name: 'Sem subdivisão', planned: totalBudget },
        subdivisionAllocated: lines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0),
        moments: [{
          moment: { id: null, name: 'Sem momento', planned: totalBudget },
          momentAllocated: lines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0),
          funnelStages: funnelNodes,
        }],
      });
    } else {
      // No distributions at all - show single node with all lines
      nodes.push({
        subdivision: { id: null, name: 'Plano Completo', planned: totalBudget },
        subdivisionAllocated: lines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0),
        moments: [{
          moment: { id: null, name: 'Sem momento', planned: totalBudget },
          momentAllocated: lines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0),
          funnelStages: [{
            funnelStage: { id: null, name: 'Sem fase', planned: totalBudget },
            funnelStageAllocated: lines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0),
            lines: lines,
          }],
        }],
      });
    }

    return nodes;
  }, [lines, budgetDistributions, plan.total_budget]);
  

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

  const startEditingField = (line: MediaLine, field: EditingField) => {
    setEditingLineId(line.id);
    setEditingField(field);
    if (field === 'budget') {
      setEditValue(String(line.budget || ''));
    } else if (field === 'start_date') {
      setEditValue(line.start_date || '');
    } else if (field === 'end_date') {
      setEditValue(line.end_date || '');
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
              onChange={(e) => setEditValue(e.target.value)}
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

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-x-auto">
        {/* Header */}
        <div className="flex bg-muted/50 text-xs font-medium text-muted-foreground border-b min-w-[1200px]">
          <div className="w-[160px] p-3 border-r shrink-0">Subdivisão do plano:</div>
          <div className="w-[160px] p-3 border-r shrink-0">Momentos de Campanha</div>
          <div className="w-[130px] p-3 border-r shrink-0">Fase</div>
          <div className="w-[70px] p-3 border-r shrink-0">Meio</div>
          <div className="w-[100px] p-3 border-r shrink-0">Veículos e canais</div>
          <div className="w-[70px] p-3 border-r shrink-0">Formato</div>
          <div className="w-[120px] p-3 border-r shrink-0">Segmentação</div>
          <div className="w-[110px] p-3 border-r shrink-0">Orçamento</div>
          <div className="w-[80px] p-3 border-r shrink-0">Criativos</div>
          <div className="w-[110px] p-3 border-r shrink-0">Início</div>
          <div className="w-[110px] p-3 border-r shrink-0">Fim</div>
          <div className="w-[100px] p-3 shrink-0">Ações</div>
        </div>

        {/* Body */}
        <div className="divide-y min-w-[1200px]">
          {groupedData.map((subdivisionGroup, subIdx) => (
            <div key={subdivisionGroup.subdivision?.id || `no-sub-${subIdx}`} className="flex">
              {/* Subdivision cell */}
              <div className="w-[160px] p-2 border-r bg-background shrink-0">
              <BudgetCard
                  label={subdivisionGroup.subdivision.name}
                  planned={subdivisionGroup.subdivision.planned}
                  allocated={subdivisionGroup.subdivisionAllocated}
                  percentageLabel={plan.total_budget 
                    ? `${((subdivisionGroup.subdivision.planned / Number(plan.total_budget)) * 100).toFixed(0)}% do plano`
                    : undefined}
                />
              </div>

              {/* Moments column */}
              <div className="flex-1 divide-y">
                {subdivisionGroup.moments.map((momentGroup, momIdx) => (
                  <div key={momentGroup.moment?.id || `no-mom-${momIdx}`} className="flex">
                    {/* Moment cell */}
                    <div className="w-[160px] p-2 border-r bg-background shrink-0">
                      <BudgetCard
                        label={momentGroup.moment.name}
                        planned={momentGroup.moment.planned}
                        allocated={momentGroup.momentAllocated}
                        percentageLabel={subdivisionGroup.subdivision.planned 
                          ? `${((momentGroup.moment.planned / subdivisionGroup.subdivision.planned) * 100).toFixed(0)}% de ${subdivisionGroup.subdivision.name}`
                          : undefined}
                      />
                    </div>

                    {/* Funnel stages column */}
                    <div className="flex-1 divide-y">
                      {momentGroup.funnelStages.map((funnelGroup, funIdx) => (
                        <div key={funnelGroup.funnelStage?.id || `no-fun-${funIdx}`} className="flex">
                          <div className="w-[130px] p-2 border-r bg-background shrink-0">
                            <BudgetCard
                              label={funnelGroup.funnelStage.name}
                              planned={funnelGroup.funnelStage.planned}
                              allocated={funnelGroup.funnelStageAllocated}
                              percentageLabel={momentGroup.moment.planned 
                                ? `${((funnelGroup.funnelStage.planned / momentGroup.moment.planned) * 100).toFixed(0)}% de ${momentGroup.moment.name}`
                                : undefined}
                            />
                          </div>

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
                                  <div className="w-[70px] p-2 border-r truncate shrink-0" title={info.medium}>
                                    {info.medium}
                                  </div>
                                  <div className="w-[100px] p-2 border-r truncate shrink-0" title={`${info.vehicle} / ${info.channel}`}>
                                    {info.vehicle}
                                  </div>
                                  <div className="w-[70px] p-2 border-r truncate shrink-0" title={info.format}>
                                    {info.format}
                                  </div>
                                  <div className="w-[120px] p-2 border-r truncate shrink-0" title={info.target}>
                                    ({info.target})
                                  </div>
                                  
                                  {/* Editable Budget */}
                                  <EditableCell
                                    line={line}
                                    field="budget"
                                    displayValue={formatCurrency(Number(line.budget))}
                                    inputType="number"
                                    width="w-[110px]"
                                  />
                                  
                                  {/* Creatives with edit button */}
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
                                  
                                  {/* Editable Start Date */}
                                  <EditableCell
                                    line={line}
                                    field="start_date"
                                    displayValue={formatDate(line.start_date)}
                                    inputType="date"
                                    width="w-[110px]"
                                  />
                                  
                                  {/* Editable End Date */}
                                  <EditableCell
                                    line={line}
                                    field="end_date"
                                    displayValue={formatDate(line.end_date)}
                                    inputType="date"
                                    width="w-[110px]"
                                  />
                                  
                                  {/* Action buttons */}
                                  <div className="w-[100px] p-2 flex items-center gap-1 shrink-0">
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
                                subdivisionId={subdivisionGroup.subdivision?.id}
                                momentId={momentGroup.moment?.id}
                                funnelStageId={funnelGroup.funnelStage?.id}
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
        <div className="flex bg-muted border-t min-w-[1200px]">
          <div className="w-[160px] p-3 font-bold shrink-0">Subtotal:</div>
          <div className="w-[160px] p-3 shrink-0"></div>
          <div className="w-[130px] p-3 shrink-0"></div>
          <div className="w-[70px] p-3 shrink-0"></div>
          <div className="w-[100px] p-3 shrink-0"></div>
          <div className="w-[70px] p-3 shrink-0"></div>
          <div className="w-[120px] p-3 shrink-0"></div>
          <div className="w-[110px] p-3 font-bold shrink-0">{formatCurrency(totalBudget)}</div>
          <div className="flex-1"></div>
        </div>
      </div>
    </TooltipProvider>
  );
}
