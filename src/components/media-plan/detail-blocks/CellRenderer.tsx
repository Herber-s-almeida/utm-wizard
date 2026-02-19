import { memo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { type ColumnDef } from '@/utils/detailSchemas';
import { formatBRL, formatPercentage } from '@/utils/financialCalculations';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CellRendererProps {
  column: ColumnDef;
  value: unknown;
  isEditing: boolean;
  onChange?: (value: unknown) => void;
  readOnly?: boolean;
  /** Options for select fields */
  selectOptions?: Array<{ id: string; name: string; label?: string }>;
  /** Callback to open a create wizard for select+create fields */
  onCreateNew?: () => void;
  /** Date constraints for period validation */
  minDate?: string | null;
  maxDate?: string | null;
}

export const CellRenderer = memo(function CellRenderer({ column, value, isEditing, onChange, readOnly, selectOptions, onCreateNew, minDate, maxDate }: CellRendererProps) {
  // Read-only / inherited / calculated cells always display
  if (column.inherited || column.type === 'calculated' || column.type === 'readonly' || readOnly) {
    return <span className="text-xs whitespace-nowrap">{formatDisplayValue(column, value)}</span>;
  }

  if (!isEditing) {
    // For selects, show the resolved name
    if (column.type === 'select' && selectOptions) {
      const opt = selectOptions.find(o => o.id === value);
      return (
        <span className="text-xs whitespace-nowrap cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
          {opt ? (opt.name || opt.label) : (value ? String(value) : '—')}
        </span>
      );
    }
    return (
      <span className="text-xs whitespace-nowrap cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
        {formatDisplayValue(column, value)}
      </span>
    );
  }

  // Editable inputs
  switch (column.type) {
    case 'select':
      return (
        <div className="flex items-center gap-0.5">
          <Select value={String(value || '')} onValueChange={(v) => onChange?.(v)}>
            <SelectTrigger className="h-7 text-xs min-w-[100px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {(selectOptions || []).map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name || opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onCreateNew && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              title="Criar novo"
              onClick={onCreateNew}
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
            </Button>
          )}
        </div>
      );

    case 'multi-select': {
      const selected = Array.isArray(value) ? value as string[] : [];
      const options = column.options || [];
      return (
        <div className="flex flex-wrap gap-0.5 min-w-[120px]">
          {options.map((opt) => {
            const isActive = selected.includes(opt);
            return (
              <Badge
                key={opt}
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  "text-[10px] px-1.5 py-0 cursor-pointer h-5",
                  isActive && "bg-primary text-primary-foreground"
                )}
                onClick={() => {
                  const next = isActive
                    ? selected.filter(s => s !== opt)
                    : [...selected, opt];
                  onChange?.(next);
                }}
              >
                {opt}
              </Badge>
            );
          })}
        </div>
      );
    }

    case 'currency':
      return (
        <Input
          type="number"
          step="0.01"
          min="0"
          className="h-7 text-xs w-[110px]"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange?.(e.target.value ? parseFloat(e.target.value) : null)}
        />
      );

    case 'percentage':
      return (
        <Input
          type="number"
          step="0.01"
          min="0"
          max="100"
          className="h-7 text-xs w-[80px]"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange?.(e.target.value ? parseFloat(e.target.value) : null)}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          step={column.decimals === 0 ? '1' : '0.01'}
          min="0"
          className="h-7 text-xs w-[80px]"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange?.(e.target.value ? parseFloat(e.target.value) : null)}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          className="h-7 text-xs w-[120px]"
          value={String(value || '')}
          min={minDate || undefined}
          max={maxDate || undefined}
          onChange={(e) => onChange?.(e.target.value || null)}
        />
      );

    case 'url':
      return (
        <Input
          type="url"
          placeholder="https://..."
          className="h-7 text-xs w-[140px]"
          value={String(value || '')}
          onChange={(e) => onChange?.(e.target.value)}
        />
      );

    default: // text
      return (
        <Input
          type="text"
          className="h-7 text-xs w-[120px]"
          value={String(value || '')}
          onChange={(e) => onChange?.(e.target.value)}
        />
      );
  }
});

function formatDisplayValue(column: ColumnDef, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';

  switch (column.type) {
    case 'currency':
    case 'calculated': {
      if (column.formula === 'period_days') {
        return String(Math.round(Number(value)));
      }
      if (column.type === 'calculated' || column.type === 'currency') {
        return formatBRL(Number(value), column.decimals ?? 2);
      }
      return String(value);
    }
    case 'percentage':
      return formatPercentage(Number(value), column.decimals ?? 2);
    case 'date': {
      try {
        const d = parseISO(String(value));
        if (isValid(d)) return format(d, 'dd/MM/yyyy', { locale: ptBR });
      } catch { /* noop */ }
      return String(value);
    }
    case 'multi-select': {
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    }
    case 'url': {
      const url = String(value);
      if (url.length > 25) return url.slice(0, 25) + '…';
      return url;
    }
    default:
      return String(value);
  }
}