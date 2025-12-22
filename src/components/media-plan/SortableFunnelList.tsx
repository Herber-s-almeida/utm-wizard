import { useState } from 'react';
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
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PercentageInput } from './PercentageInput';
import { cn } from '@/lib/utils';

interface AllocationItem {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

interface SortableItemProps {
  item: AllocationItem;
  totalBudget: number;
  onUpdate: (id: string, percentage: number) => void;
  onRemove: (id: string) => void;
  formatCurrency: (value: number) => string;
}

function SortableItem({ item, totalBudget, onUpdate, onRemove, formatCurrency }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 bg-background border rounded-lg p-3 group",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="font-medium flex-1">{item.name}</span>
      <PercentageInput
        value={item.percentage}
        onChange={(value) => onUpdate(item.id, value)}
        className="w-20"
      />
      <span className="text-sm text-muted-foreground font-mono w-24 text-right">
        {formatCurrency((totalBudget * item.percentage) / 100)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface SortableFunnelListProps {
  items: AllocationItem[];
  totalBudget: number;
  onUpdate: (id: string, percentage: number) => void;
  onRemove: (id: string) => void;
  onReorder: (items: AllocationItem[]) => void;
}

export function SortableFunnelList({
  items,
  totalBudget,
  onUpdate,
  onRemove,
  onReorder,
}: SortableFunnelListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              totalBudget={totalBudget}
              onUpdate={onUpdate}
              onRemove={onRemove}
              formatCurrency={formatCurrency}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Total row */}
      <div className={cn(
        "flex items-center gap-3 border-t-2 pt-3 mt-3",
        isValid ? "text-success" : "text-destructive"
      )}>
        <div className="w-4" />
        <span className="font-semibold flex-1">Total</span>
        <span className="font-semibold w-20 text-right">{totalPercentage.toFixed(1)}%</span>
        <span className="font-semibold font-mono w-24 text-right">
          {formatCurrency((totalBudget * totalPercentage) / 100)}
        </span>
        <div className="w-8" />
      </div>

      {!isValid && (
        <div className="p-3 border rounded-lg bg-destructive/10 text-destructive text-sm">
          A soma dos percentuais deve ser exatamente 100%
        </div>
      )}
    </div>
  );
}
