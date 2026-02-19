import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type ColumnDef, type BlockDef } from '@/utils/detailSchemas';

interface BlockHeaderProps {
  block: BlockDef;
  isCollapsed: boolean;
  onToggle: () => void;
  /** Number of columns to span in the table */
  colSpan: number;
}

export function BlockHeader({ block, isCollapsed, onToggle, colSpan }: BlockHeaderProps) {
  if (!block.collapsible) {
    return (
      <th
        colSpan={colSpan}
        className="px-2 py-1.5 bg-muted/50 border-b border-r select-none"
      >
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {block.label}
        </div>
      </th>
    );
  }

  return (
    <th
      colSpan={colSpan}
      className="px-2 py-1.5 bg-muted/70 border-b border-r cursor-pointer select-none group"
      onClick={onToggle}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        {block.label}
      </div>
    </th>
  );
}
