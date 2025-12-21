import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Plus, Image as ImageIcon, Check, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MediaLine, MediaPlan, MediaCreative } from '@/types/media';
import { 
  Subdivision, 
  Moment, 
  FunnelStage, 
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

interface HierarchicalMediaTableProps {
  plan: MediaPlan;
  lines: MediaLine[];
  creatives: Record<string, MediaCreative[]>;
  subdivisions: Subdivision[];
  moments: Moment[];
  funnelStages: FunnelStage[];
  mediums: Medium[];
  vehicles: Vehicle[];
  channels: Channel[];
  targets: Target[];
  onEditLine: (line: MediaLine, initialStep?: string) => void;
  onDeleteLine: (line: MediaLine) => void;
  onAddLine: () => void;
  onUpdateLine: (lineId: string, updates: Partial<MediaLine>) => Promise<void>;
}

interface HierarchyNode {
  subdivision: Subdivision | null;
  subdivisionBudget: number;
  moments: {
    moment: Moment | null;
    momentBudget: number;
    funnelStages: {
      funnelStage: FunnelStage | null;
      funnelStageBudget: number;
      lines: MediaLine[];
    }[];
  }[];
}

type EditingField = 'budget' | 'start_date' | 'end_date' | null;

export function HierarchicalMediaTable({
  plan,
  lines,
  creatives,
  subdivisions,
  moments: momentsList,
  funnelStages,
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

  // Group lines hierarchically
  const groupedData = useMemo((): HierarchyNode[] => {
    const groups = new Map<string, HierarchyNode>();

    lines.forEach(line => {
      const subKey = line.subdivision_id || 'no-subdivision';
      
      if (!groups.has(subKey)) {
        const subdivision = subdivisions.find(s => s.id === line.subdivision_id) || null;
        groups.set(subKey, {
          subdivision,
          subdivisionBudget: 0,
          moments: [],
        });
      }

      const group = groups.get(subKey)!;
      group.subdivisionBudget += Number(line.budget) || 0;

      const momentKey = line.moment_id || 'no-moment';
      let momentGroup = group.moments.find(m => 
        (m.moment?.id || 'no-moment') === momentKey
      );

      if (!momentGroup) {
        const moment = momentsList.find(m => m.id === line.moment_id) || null;
        momentGroup = {
          moment,
          momentBudget: 0,
          funnelStages: [],
        };
        group.moments.push(momentGroup);
      }

      momentGroup.momentBudget += Number(line.budget) || 0;

      const funnelKey = line.funnel_stage_id || 'no-funnel';
      let funnelGroup = momentGroup.funnelStages.find(f =>
        (f.funnelStage?.id || 'no-funnel') === funnelKey
      );

      if (!funnelGroup) {
        const funnelStage = funnelStages.find(f => f.id === line.funnel_stage_id) || null;
        funnelGroup = {
          funnelStage,
          funnelStageBudget: 0,
          lines: [],
        };
        momentGroup.funnelStages.push(funnelGroup);
      }

      funnelGroup.funnelStageBudget += Number(line.budget) || 0;
      funnelGroup.lines.push(line);
    });

    return Array.from(groups.values());
  }, [lines, subdivisions, momentsList, funnelStages]);

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

  if (lines.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Plus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="font-medium text-lg mb-2">Nenhuma linha de mídia</h3>
        <p className="text-muted-foreground mb-4">
          Adicione linhas de mídia para detalhar seu plano
        </p>
        <Button onClick={onAddLine} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Linha
        </Button>
      </div>
    );
  }

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
                <div className="border rounded-lg p-2 h-full">
                  <div className="font-medium text-sm">
                    {subdivisionGroup.subdivision?.name || 'Sem subdivisão'}
                  </div>
                  <div className="text-lg font-bold mt-1">
                    {formatCurrency(subdivisionGroup.subdivisionBudget)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {plan.total_budget 
                      ? `${((subdivisionGroup.subdivisionBudget / Number(plan.total_budget)) * 100).toFixed(0)}% do plano`
                      : ''}
                  </div>
                  {subdivisionGroup.subdivision?.description && (
                    <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      ({subdivisionGroup.subdivision.description})
                    </div>
                  )}
                </div>
              </div>

              {/* Moments column */}
              <div className="flex-1 divide-y">
                {subdivisionGroup.moments.map((momentGroup, momIdx) => (
                  <div key={momentGroup.moment?.id || `no-mom-${momIdx}`} className="flex">
                    {/* Moment cell */}
                    <div className="w-[160px] p-2 border-r bg-background shrink-0">
                      <div className="border rounded-lg p-2 h-full">
                        <div className="font-medium text-sm">
                          {momentGroup.moment?.name || 'Sem momento'}
                        </div>
                        <div className="text-lg font-bold mt-1">
                          {formatCurrency(momentGroup.momentBudget)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {subdivisionGroup.subdivisionBudget 
                            ? `${((momentGroup.momentBudget / subdivisionGroup.subdivisionBudget) * 100).toFixed(0)}% de ${subdivisionGroup.subdivision?.name || 'subdivisão'}`
                            : ''}
                        </div>
                      </div>
                    </div>

                    {/* Funnel stages column */}
                    <div className="flex-1 divide-y">
                      {momentGroup.funnelStages.map((funnelGroup, funIdx) => (
                        <div key={funnelGroup.funnelStage?.id || `no-fun-${funIdx}`} className="flex">
                          {/* Funnel Stage cell */}
                          <div className="w-[130px] p-2 border-r bg-background shrink-0">
                            <div className="border rounded-lg p-2 h-full">
                              <div className="font-medium text-sm">
                                {funnelGroup.funnelStage?.name || 'Sem fase'}
                              </div>
                              <div className="text-base font-bold mt-1">
                                {formatCurrency(funnelGroup.funnelStageBudget)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {momentGroup.momentBudget 
                                  ? `${((funnelGroup.funnelStageBudget / momentGroup.momentBudget) * 100).toFixed(0)}% de ${momentGroup.moment?.name || 'momento'}`
                                  : ''}
                              </div>
                            </div>
                          </div>

                          {/* Lines */}
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
