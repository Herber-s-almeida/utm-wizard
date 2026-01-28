import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ColumnId } from './KanbanBoard';

interface KanbanColumnProps {
  id: ColumnId;
  title: string;
  count: number;
  isOver?: boolean;
  children: React.ReactNode;
}

const COLUMN_COLORS: Record<ColumnId, string> = {
  fazer: 'border-t-blue-500',
  fazendo: 'border-t-yellow-500',
  feito: 'border-t-green-500',
};

const COLUMN_BG: Record<ColumnId, string> = {
  fazer: 'bg-blue-500/5',
  fazendo: 'bg-yellow-500/5',
  feito: 'bg-green-500/5',
};

export function KanbanColumn({ id, title, count, isOver, children }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[320px] max-w-[400px] rounded-lg border border-t-4 transition-all',
        COLUMN_COLORS[id],
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Column Header */}
      <div className={cn('p-3 border-b', COLUMN_BG[id])}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
        <div className="p-3 space-y-3">
          {children}
          {count === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum item
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
