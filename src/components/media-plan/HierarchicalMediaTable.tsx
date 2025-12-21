import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Plus, Image as ImageIcon, Check, X } from 'lucide-react';
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
  onEditLine: (line: MediaLine) => void;
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
  const [editValues, setEditValues] = useState<Partial<MediaLine>>({});

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

  const startEditing = (line: MediaLine) => {
    setEditingLineId(line.id);
    setEditValues({
      budget: line.budget,
      start_date: line.start_date,
      end_date: line.end_date,
    });
  };

  const saveEditing = async () => {
    if (!editingLineId) return;
    await onUpdateLine(editingLineId, editValues);
    setEditingLineId(null);
    setEditValues({});
  };

  const cancelEditing = () => {
    setEditingLineId(null);
    setEditValues({});
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

  return (
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
        <div className="w-[90px] p-3 border-r shrink-0">Orçamento</div>
        <div className="w-[80px] p-3 border-r shrink-0">Criativos</div>
        <div className="w-[100px] p-3 border-r shrink-0">Início</div>
        <div className="w-[100px] p-3 border-r shrink-0">Fim</div>
        <div className="w-[80px] p-3 shrink-0">Ações</div>
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
                            const isEditing = editingLineId === line.id;

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
                                <div className="w-[90px] p-2 border-r shrink-0">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      className="h-6 text-xs px-1 w-full"
                                      value={editValues.budget || ''}
                                      onChange={(e) => setEditValues(prev => ({ ...prev, budget: parseFloat(e.target.value) }))}
                                      onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                                    />
                                  ) : (
                                    <span className="font-medium">{formatCurrency(Number(line.budget))}</span>
                                  )}
                                </div>
                                <div className="w-[80px] p-2 border-r flex items-center gap-1 shrink-0">
                                  <ImageIcon className="w-3 h-3 text-muted-foreground" />
                                  <span>{info.creativesCount}</span>
                                </div>
                                <div className="w-[100px] p-2 border-r shrink-0">
                                  {isEditing ? (
                                    <Input
                                      type="date"
                                      className="h-6 text-xs px-1 w-full"
                                      value={editValues.start_date || ''}
                                      onChange={(e) => setEditValues(prev => ({ ...prev, start_date: e.target.value }))}
                                    />
                                  ) : (
                                    formatDate(line.start_date)
                                  )}
                                </div>
                                <div className="w-[100px] p-2 border-r shrink-0">
                                  {isEditing ? (
                                    <Input
                                      type="date"
                                      className="h-6 text-xs px-1 w-full"
                                      value={editValues.end_date || ''}
                                      onChange={(e) => setEditValues(prev => ({ ...prev, end_date: e.target.value }))}
                                    />
                                  ) : (
                                    formatDate(line.end_date)
                                  )}
                                </div>
                                <div className="w-[80px] p-2 flex items-center gap-1 shrink-0">
                                  {isEditing ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-success hover:text-success"
                                        onClick={saveEditing}
                                      >
                                        <Check className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={cancelEditing}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => startEditing(line)}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                        onClick={() => onDeleteLine(line)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
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
        <div className="w-[90px] p-3 font-bold shrink-0">{formatCurrency(totalBudget)}</div>
        <div className="flex-1"></div>
      </div>
    </div>
  );
}
