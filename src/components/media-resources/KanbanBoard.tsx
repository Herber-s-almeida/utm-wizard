import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

// Status mapping to columns
const STATUS_TO_COLUMN: Record<string, 'fazer' | 'fazendo' | 'feito'> = {
  solicitado: 'fazer',
  enviado: 'fazendo',
  em_andamento: 'fazendo',
  entregue: 'fazendo',
  alteracao: 'fazendo',
  finalizado: 'feito',
  aprovado: 'feito',
};

const COLUMN_TO_STATUSES: Record<string, string[]> = {
  fazer: ['solicitado'],
  fazendo: ['enviado', 'em_andamento', 'entregue', 'alteracao'],
  feito: ['finalizado', 'aprovado'],
};

interface ChangeLog {
  id: string;
  change_date: string;
  notes: string | null;
}

interface MediaCreativeWithDetails {
  id: string;
  name: string;
  creative_id: string | null;
  copy_text: string | null;
  notes: string | null;
  format_id: string | null;
  media_line_id: string;
  created_at: string;
  production_status: string | null;
  opening_date: string | null;
  received_date: string | null;
  approved_date: string | null;
  piece_link: string | null;
  format: {
    id: string;
    name: string;
  } | null;
  media_line: {
    id: string;
    platform: string;
    line_code: string | null;
    funnel_stage: string | null;
    subdivision: { name: string } | null;
    moment: { name: string } | null;
    medium: { name: string } | null;
    vehicle: { name: string } | null;
    channel: { name: string } | null;
    target: { name: string } | null;
    funnel_stage_ref: { name: string } | null;
  } | null;
  change_logs?: ChangeLog[];
}

interface KanbanBoardProps {
  creatives: MediaCreativeWithDetails[];
  onUpdate: () => void;
}

export type ColumnId = 'fazer' | 'fazendo' | 'feito';

export function KanbanBoard({ creatives, onUpdate }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group creatives by column
  const columns = useMemo(() => {
    const result: Record<ColumnId, MediaCreativeWithDetails[]> = {
      fazer: [],
      fazendo: [],
      feito: [],
    };

    creatives.forEach(creative => {
      const status = creative.production_status || 'solicitado';
      const column = STATUS_TO_COLUMN[status] || 'fazer';
      result[column].push(creative);
    });

    return result;
  }, [creatives]);

  const activeCreative = useMemo(() => {
    if (!activeId) return null;
    return creatives.find(c => c.id === activeId) || null;
  }, [activeId, creatives]);

  // Check if a creative is in the wrong column based on status
  const isInWrongColumn = (creative: MediaCreativeWithDetails, columnId: ColumnId): boolean => {
    const status = creative.production_status || 'solicitado';
    const expectedColumn = STATUS_TO_COLUMN[status] || 'fazer';
    return expectedColumn !== columnId;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Check if hovering over a column or a card in a column
      const overId = over.id as string;
      if (['fazer', 'fazendo', 'feito'].includes(overId)) {
        setOverColumnId(overId as ColumnId);
      } else {
        // Find which column the card belongs to
        for (const [columnId, columnCreatives] of Object.entries(columns)) {
          if (columnCreatives.some(c => c.id === overId)) {
            setOverColumnId(columnId as ColumnId);
            break;
          }
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverColumnId(null);
    // Note: Dragging between columns does NOT change status
    // Status can only be changed via the status selector on the card
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Fazer Column */}
        <SortableContext
          items={columns.fazer.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <KanbanColumn
            id="fazer"
            title="Fazer"
            count={columns.fazer.length}
            isOver={overColumnId === 'fazer'}
          >
            {columns.fazer.map(creative => (
              <KanbanCard
                key={creative.id}
                creative={creative}
                columnId="fazer"
                hasWarning={isInWrongColumn(creative, 'fazer')}
                onUpdate={onUpdate}
              />
            ))}
          </KanbanColumn>
        </SortableContext>

        {/* Fazendo Column */}
        <SortableContext
          items={columns.fazendo.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <KanbanColumn
            id="fazendo"
            title="Fazendo"
            count={columns.fazendo.length}
            isOver={overColumnId === 'fazendo'}
          >
            {columns.fazendo.map(creative => (
              <KanbanCard
                key={creative.id}
                creative={creative}
                columnId="fazendo"
                hasWarning={isInWrongColumn(creative, 'fazendo')}
                onUpdate={onUpdate}
              />
            ))}
          </KanbanColumn>
        </SortableContext>

        {/* Feito Column */}
        <SortableContext
          items={columns.feito.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <KanbanColumn
            id="feito"
            title="Feito"
            count={columns.feito.length}
            isOver={overColumnId === 'feito'}
          >
            {columns.feito.map(creative => (
              <KanbanCard
                key={creative.id}
                creative={creative}
                columnId="feito"
                hasWarning={isInWrongColumn(creative, 'feito')}
                onUpdate={onUpdate}
              />
            ))}
          </KanbanColumn>
        </SortableContext>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCreative && (
          <KanbanCard
            creative={activeCreative}
            columnId="fazer"
            hasWarning={false}
            onUpdate={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
