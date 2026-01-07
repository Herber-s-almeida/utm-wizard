import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ColumnKey } from '@/hooks/useResizableColumns';

interface ResizableColumnHeaderProps {
  columnKey: ColumnKey;
  width: number;
  onResize: (column: ColumnKey, newWidth: number) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ResizableColumnHeader({
  columnKey,
  width,
  onResize,
  children,
  className,
  style,
}: ResizableColumnHeaderProps) {
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startXRef.current;
      const newWidth = startWidthRef.current + delta;
      onResize(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnKey, width, onResize]);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width, ...style }}
    >
      {children}
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary/70 transition-colors z-10"
        onMouseDown={handleMouseDown}
        title="Arraste para redimensionar"
      />
    </div>
  );
}
