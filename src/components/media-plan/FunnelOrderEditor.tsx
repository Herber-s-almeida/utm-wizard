import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, Filter, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FunnelStage {
  id: string;
  name: string;
  description?: string | null;
}

interface SortableStageProps {
  stage: FunnelStage;
  index: number;
  totalItems: number;
  onRemove: (id: string) => void;
}

function SortableStage({ stage, index, totalItems, onRemove }: SortableStageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate width based on position (funnel effect: wider at top, narrower at bottom)
  const widthPercentage = 100 - ((index / Math.max(totalItems - 1, 1)) * 25);
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex justify-center"
    >
      <div
        className={cn(
          "flex items-center gap-3 border-2 rounded-lg p-3 transition-all group bg-gradient-to-r",
          isDragging && "opacity-50 shadow-lg z-50",
          "from-primary/5 to-primary/10 border-primary/30 hover:border-primary/50"
        )}
        style={{ width: `${widthPercentage}%`, minWidth: '200px' }}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            {index + 1}º
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-foreground truncate block">{stage.name}</span>
          {stage.description && (
            <span className="text-xs text-muted-foreground truncate block">{stage.description}</span>
          )}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => onRemove(stage.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface FunnelOrderEditorProps {
  selectedStages: FunnelStage[];
  availableStages: FunnelStage[];
  onOrderChange: (stages: FunnelStage[]) => void;
  onAdd: (stage: FunnelStage) => void;
  onRemove: (id: string) => void;
  onCreate: (name: string) => Promise<any>;
  maxStages?: number;
}

export function FunnelOrderEditor({
  selectedStages,
  availableStages,
  onOrderChange,
  onAdd,
  onRemove,
  onCreate,
  maxStages = 7,
}: FunnelOrderEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedStages.findIndex((s) => s.id === active.id);
      const newIndex = selectedStages.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(selectedStages, oldIndex, newIndex);
      onOrderChange(newOrder);
    }
  };

  const handleCreate = async () => {
    if (!newStageName.trim()) return;
    
    setCreating(true);
    try {
      const created = await onCreate(newStageName.trim());
      if (created) {
        onAdd({ id: created.id, name: created.name, description: created.description });
        setNewStageName('');
        setCreateDialogOpen(false);
      }
    } finally {
      setCreating(false);
    }
  };

  // Filter out already selected stages
  const stagesNotSelected = availableStages.filter(
    (s) => !selectedStages.some((sel) => sel.id === s.id)
  );

  return (
    <div className="space-y-6">
      {/* Header with info */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
        <Filter className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="font-medium text-sm">Desenhe o Funil deste Plano</h4>
          <p className="text-sm text-muted-foreground">
            Defina a ordem das fases do funil para este plano. A ordem vai do topo (maior alcance) 
            ao fundo (conversão). Arraste para reordenar.
          </p>
        </div>
      </div>

      {/* Funnel visual */}
      {selectedStages.length > 0 ? (
        <div className="space-y-2 py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedStages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {selectedStages.map((stage, index) => (
                <SortableStage
                  key={stage.id}
                  stage={stage}
                  index={index}
                  totalItems={selectedStages.length}
                  onRemove={onRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg bg-muted/30">
          <Filter className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground text-center mb-4">
            Nenhuma fase do funil adicionada ainda.
            <br />
            Adicione fases para desenhar o funil deste plano.
          </p>
        </div>
      )}

      {/* Add buttons */}
      {selectedStages.length < maxStages && (
        <div className="flex flex-wrap gap-2 justify-center">
          {/* Add existing stage */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar fase existente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Fase do Funil</DialogTitle>
                <DialogDescription>
                  Selecione uma fase existente da biblioteca
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[300px] overflow-y-auto space-y-2 py-4">
                {stagesNotSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todas as fases disponíveis já foram adicionadas.
                  </p>
                ) : (
                  stagesNotSelected.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => {
                        onAdd(stage);
                        setDialogOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent hover:border-primary/50 transition-colors text-left"
                    >
                      <Filter className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium block truncate">{stage.name}</span>
                        {stage.description && (
                          <span className="text-xs text-muted-foreground block truncate">
                            {stage.description}
                          </span>
                        )}
                      </div>
                      <Check className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Create new stage */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Plus className="w-4 h-4" />
                Criar nova fase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Fase do Funil</DialogTitle>
                <DialogDescription>
                  A fase será criada na biblioteca e adicionada a este plano
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="stage-name">Nome da fase</Label>
                  <Input
                    id="stage-name"
                    placeholder="Ex: Awareness, Consideração, Conversão..."
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewStageName('');
                      setCreateDialogOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newStageName.trim() || creating}
                  >
                    {creating ? 'Criando...' : 'Criar e Adicionar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Hint about methodologies */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground cursor-help">
              <Info className="w-3 h-3" />
              <span>Diferentes metodologias de funil</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">
              <strong>Exemplos de metodologias:</strong>
              <br />• 5As de Kotler: Assimilação → Atração → Arguição → Ação → Apologia
              <br />• 3Cs: Conhecimento → Consideração → Conversão
              <br />• Jornada: Atração → Conversão → Qualificação → Venda → Relacionamento
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Limit indicator */}
      <div className="text-center text-xs text-muted-foreground">
        {selectedStages.length} de {maxStages} fases
      </div>
    </div>
  );
}
