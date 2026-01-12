import { useMemo } from 'react';
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
import { Layers, Clock, Filter, GripVertical, X, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HierarchyLevel, HIERARCHY_LEVEL_CONFIG } from '@/types/hierarchy';

interface HierarchyOrderSelectorProps {
  selectedLevels: HierarchyLevel[];
  onOrderChange: (levels: HierarchyLevel[]) => void;
  disabled?: boolean;
}

const ICON_MAP = {
  Layers: Layers,
  Clock: Clock,
  Filter: Filter,
};

// Sortable item component
function SortableLevel({ 
  level, 
  index, 
  onRemove,
  disabled,
}: { 
  level: HierarchyLevel; 
  index: number;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const config = HIERARCHY_LEVEL_CONFIG[level];
  const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: level, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border-2 bg-card transition-all",
        config.color,
        isDragging && "opacity-50 shadow-lg scale-105",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className={cn(
          "p-1 rounded hover:bg-background/50 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold",
        "bg-background/50"
      )}>
        {index + 1}
      </div>
      
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-background/50">
        <Icon className="h-5 w-5" />
      </div>
      
      <div className="flex-1">
        <p className="font-medium">{config.label}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
      
      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// Available level card (not selected)
function AvailableLevelCard({
  level,
  onAdd,
  disabled,
}: {
  level: HierarchyLevel;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const config = HIERARCHY_LEVEL_CONFIG[level];
  const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all w-full text-left",
        "hover:border-primary/50 hover:bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <p className="font-medium text-muted-foreground">{config.label}</p>
        <p className="text-xs text-muted-foreground/70">{config.description}</p>
      </div>
      
      <Plus className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}

export function HierarchyOrderSelector({
  selectedLevels,
  onOrderChange,
  disabled,
}: HierarchyOrderSelectorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const availableLevels = useMemo(() => {
    const allLevels: HierarchyLevel[] = ['subdivision', 'moment', 'funnel_stage'];
    return allLevels.filter(level => !selectedLevels.includes(level));
  }, [selectedLevels]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedLevels.indexOf(active.id as HierarchyLevel);
      const newIndex = selectedLevels.indexOf(over.id as HierarchyLevel);
      onOrderChange(arrayMove(selectedLevels, oldIndex, newIndex));
    }
  };

  const handleRemove = (level: HierarchyLevel) => {
    onOrderChange(selectedLevels.filter(l => l !== level));
  };

  const handleAdd = (level: HierarchyLevel) => {
    if (selectedLevels.length < 3) {
      onOrderChange([...selectedLevels, level]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Estrutura do Orçamento</CardTitle>
            <CardDescription>
              Escolha quais níveis de divisão usar e sua ordem. Arraste para reordenar.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected levels - sortable */}
        {selectedLevels.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Níveis selecionados ({selectedLevels.length}/3)
              </h3>
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                Ordem definida
              </Badge>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedLevels}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {selectedLevels.map((level, index) => (
                    <SortableLevel
                      key={level}
                      level={level}
                      index={index}
                      onRemove={() => handleRemove(level)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Preview of structure */}
        {selectedLevels.length > 0 && (
          <div className="p-4 bg-muted/30 rounded-xl border">
            <h4 className="text-sm font-medium mb-3">Preview da estrutura:</h4>
            <div className="space-y-1 text-sm font-mono">
              <p className="text-muted-foreground">Orçamento Total</p>
              {selectedLevels.map((level, index) => {
                const config = HIERARCHY_LEVEL_CONFIG[level];
                const indent = '  '.repeat(index + 1);
                return (
                  <p key={level} className="text-muted-foreground">
                    {indent}└── Nível {index + 1}: {config.label}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Available levels */}
        {availableLevels.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Níveis disponíveis (clique para adicionar)
            </h3>
            <div className="space-y-2">
              {availableLevels.map(level => (
                <AvailableLevelCard
                  key={level}
                  level={level}
                  onAdd={() => handleAdd(level)}
                  disabled={disabled || selectedLevels.length >= 3}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state - General Budget */}
        {selectedLevels.length === 0 && (
          <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/20 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium text-foreground">Orçamento Geral</p>
            <p className="text-sm text-muted-foreground mt-1">
              O plano terá um único orçamento sem divisões. Você pode adicionar níveis clicando acima.
            </p>
            <Badge variant="outline" className="mt-3 gap-1 border-primary/30 text-primary">
              <Check className="h-3 w-3" />
              Configuração válida
            </Badge>
          </div>
        )}

        {/* Hint */}
        <p className="text-xs text-muted-foreground text-center">
          💡 Você pode usar de 0 a 3 níveis. Planos simples podem não ter nenhuma divisão (orçamento geral).
        </p>
      </CardContent>
    </Card>
  );
}
