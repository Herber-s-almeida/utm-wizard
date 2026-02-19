/**
 * Inline Grid Block - Monthly calendar with collapsible months.
 * Each item has its own period (period_start/period_end).
 * Supports auto-paint: selecting days_of_week fills matching cells with a default qty.
 * Footer shows daily totals across all items.
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Paintbrush, Save } from 'lucide-react';
import {
  format,
  parseISO,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
  getDay,
  isValid,
  isBefore,
  isAfter,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

interface GridItem {
  id: string;
  label?: string; // e.g. line_code or item index
  daysOfWeek?: string[];
  periodStart?: string | null;
  periodEnd?: string | null;
}

interface GridBlockProps {
  items: GridItem[];
  /** All insertions for items: itemId -> { date -> qty } */
  insertions: Record<string, Record<string, number>>;
  /** Fallback period from the plan (used if item has no period) */
  planPeriodStart: string | null;
  planPeriodEnd: string | null;
  onInsertionChange: (itemId: string, date: string, quantity: number) => void;
  /** Called when user clicks "Salvar Grade" */
  onSaveAll?: () => Promise<void>;
  readOnly?: boolean;
}

interface MonthData {
  key: string;
  label: string;
  days: Date[];
}

function getItemPeriod(item: GridItem, planStart: string | null, planEnd: string | null) {
  const start = item.periodStart || planStart;
  const end = item.periodEnd || planEnd;
  if (!start || !end) return null;
  const s = parseISO(start);
  const e = parseISO(end);
  if (!isValid(s) || !isValid(e)) return null;
  return { start: s, end: e };
}

function isDateInItemPeriod(day: Date, item: GridItem, planStart: string | null, planEnd: string | null): boolean {
  const period = getItemPeriod(item, planStart, planEnd);
  if (!period) return false;
  return (isSameDay(day, period.start) || isAfter(day, period.start)) &&
         (isSameDay(day, period.end) || isBefore(day, period.end));
}

export function GridBlock({
  items,
  insertions,
  planPeriodStart,
  planPeriodEnd,
  onInsertionChange,
  onSaveAll,
  readOnly,
}: GridBlockProps) {
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Compute the global date range across all items
  const globalPeriod = useMemo(() => {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const item of items) {
      const period = getItemPeriod(item, planPeriodStart, planPeriodEnd);
      if (!period) continue;
      if (!minDate || isBefore(period.start, minDate)) minDate = period.start;
      if (!maxDate || isAfter(period.end, maxDate)) maxDate = period.end;
    }

    return minDate && maxDate ? { start: minDate, end: maxDate } : null;
  }, [items, planPeriodStart, planPeriodEnd]);

  const months = useMemo((): MonthData[] => {
    if (!globalPeriod) return [];
    const { start, end } = globalPeriod;

    const result: MonthData[] = [];
    let current = startOfMonth(start);

    while (current <= end) {
      const monthEnd = endOfMonth(current);
      const rangeStart = isBefore(current, start) ? start : current;
      const rangeEnd = isAfter(monthEnd, end) ? end : monthEnd;

      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      result.push({
        key: format(current, 'yyyy-MM'),
        label: format(current, 'MMM/yy', { locale: ptBR }).toUpperCase(),
        days,
      });

      current = startOfMonth(addMonths(current, 1));
    }

    return result;
  }, [globalPeriod]);

  const toggleMonth = (key: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleChange = useCallback((itemId: string, dateStr: string, qty: number) => {
    onInsertionChange(itemId, dateStr, qty);
    setHasChanges(true);
  }, [onInsertionChange]);

  // Auto-paint: fill all matching weekday cells in the item's period with qty=1
  const handleAutoPaint = useCallback((item: GridItem) => {
    const selectedDays = item.daysOfWeek || [];
    if (selectedDays.length === 0) return;

    const period = getItemPeriod(item, planPeriodStart, planPeriodEnd);
    if (!period) return;

    const allDays = eachDayOfInterval({ start: period.start, end: period.end });
    for (const day of allDays) {
      const dayLabel = WEEKDAY_LABELS[getDay(day)];
      if (selectedDays.includes(dayLabel)) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const current = insertions[item.id]?.[dateStr] || 0;
        if (current === 0) {
          onInsertionChange(item.id, dateStr, 1);
        }
      }
    }
    setHasChanges(true);
  }, [items, insertions, onInsertionChange, planPeriodStart, planPeriodEnd]);

  const handleSave = async () => {
    if (!onSaveAll) return;
    setIsSaving(true);
    try {
      await onSaveAll();
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate day totals across all items
  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.values(insertions).forEach(itemIns => {
      Object.entries(itemIns).forEach(([date, qty]) => {
        totals[date] = (totals[date] || 0) + qty;
      });
    });
    return totals;
  }, [insertions]);

  // Item totals (for collapsed month view)
  const getItemMonthTotal = (itemId: string, month: MonthData) => {
    const itemIns = insertions[itemId] || {};
    return month.days.reduce((sum, day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return sum + (itemIns[dateStr] || 0);
    }, 0);
  };

  if (months.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic px-4 py-3 border-t">
        Defina Início e Fim nos itens (ou no plano) para exibir a grade de inserções.
      </div>
    );
  }

  return (
    <div>
      {/* Save bar */}
      {!readOnly && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b sticky top-0 z-30">
          <span className="text-[10px] font-medium text-muted-foreground">
            Grade de Inserções
            {hasChanges && (
              <Badge variant="outline" className="ml-2 text-[9px] h-4 border-destructive/50 text-destructive">
                alterações não salvas
              </Badge>
            )}
          </span>
          {onSaveAll && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] gap-1"
              disabled={!hasChanges || isSaving}
              onClick={handleSave}
            >
              <Save className="h-3 w-3" />
              {isSaving ? 'Salvando...' : 'Salvar Grade'}
            </Button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-max text-[11px]">
          <thead className="sticky top-[33px] z-20">
            {/* Month headers row */}
            <tr className="bg-muted/80 backdrop-blur-sm">
              <th className="sticky left-0 z-30 bg-muted/80 border-r border-b px-2 py-1 text-left text-[10px] font-semibold min-w-[80px]">
                Item
              </th>
              {months.map(month => {
                const isCollapsed = collapsedMonths.has(month.key);
                return (
                  <th
                    key={month.key}
                    colSpan={isCollapsed ? 1 : month.days.length}
                    className="px-1 py-1 border-r border-b text-center"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] font-bold"
                      onClick={() => toggleMonth(month.key)}
                    >
                      {isCollapsed ? <ChevronRight className="h-3 w-3 mr-0.5" /> : <ChevronDown className="h-3 w-3 mr-0.5" />}
                      {month.label}
                    </Button>
                  </th>
                );
              })}
              <th className="border-b px-2 py-1 text-center text-[10px] font-semibold min-w-[50px]">
                Total
              </th>
            </tr>
            {/* Weekday row */}
            <tr className="bg-muted/60 backdrop-blur-sm">
              <th className="sticky left-0 z-30 bg-muted/60 border-r border-b" />
              {months.map(month => {
                if (collapsedMonths.has(month.key)) {
                  return <th key={`${month.key}-wd`} className="border-r border-b" />;
                }
                return month.days.map(day => (
                  <th
                    key={format(day, 'yyyy-MM-dd')}
                    className="px-0.5 py-0.5 border-r border-b text-center text-[9px] font-medium text-muted-foreground min-w-[32px]"
                  >
                    {WEEKDAY_LABELS[getDay(day)]}
                  </th>
                ));
              })}
              <th className="border-b" />
            </tr>
            {/* Date row */}
            <tr className="bg-muted/40 backdrop-blur-sm">
              <th className="sticky left-0 z-30 bg-muted/40 border-r border-b" />
              {months.map(month => {
                if (collapsedMonths.has(month.key)) {
                  return <th key={`${month.key}-dt`} className="border-r border-b text-[9px] text-muted-foreground">Σ</th>;
                }
                return month.days.map(day => (
                  <th
                    key={`d-${format(day, 'yyyy-MM-dd')}`}
                    className="px-0.5 py-0.5 border-r border-b text-center text-[9px] text-muted-foreground"
                  >
                    {format(day, 'dd')}
                  </th>
                ));
              })}
              <th className="border-b" />
            </tr>
          </thead>
          <tbody>
            {/* Item rows */}
            {items.map((item, idx) => {
              const itemInsertions = insertions[item.id] || {};
              const selectedDays = item.daysOfWeek || [];
              const itemTotal = Object.values(itemInsertions).reduce((s, q) => s + q, 0);

              return (
                <tr key={item.id} className="hover:bg-muted/20 group">
                  <td className="sticky left-0 z-10 bg-background border-r border-b px-2 py-0.5 text-[10px] font-medium whitespace-nowrap group-hover:bg-muted/20">
                    <div className="flex items-center gap-1">
                      <span>{item.label || `#${idx + 1}`}</span>
                      {!readOnly && selectedDays.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 opacity-0 group-hover:opacity-100"
                          title="Auto-preencher dias selecionados"
                          onClick={() => handleAutoPaint(item)}
                        >
                          <Paintbrush className="h-3 w-3 text-primary" />
                        </Button>
                      )}
                    </div>
                  </td>
                  {months.map(month => {
                    if (collapsedMonths.has(month.key)) {
                      const monthTotal = getItemMonthTotal(item.id, month);
                      return (
                        <td key={month.key} className="border-r border-b text-center text-[10px] font-medium px-1">
                          {monthTotal || ''}
                        </td>
                      );
                    }
                    return month.days.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const inPeriod = isDateInItemPeriod(day, item, planPeriodStart, planPeriodEnd);
                      const dayLabel = WEEKDAY_LABELS[getDay(day)];
                      const isHighlighted = selectedDays.length === 0 || selectedDays.includes(dayLabel);
                      const qty = itemInsertions[dateStr] || 0;

                      if (!inPeriod) {
                        return (
                          <td key={dateStr} className="border-r border-b p-0 min-w-[32px] bg-muted/40" />
                        );
                      }

                      return (
                        <td
                          key={dateStr}
                          className={cn(
                            "border-r border-b p-0 min-w-[32px]",
                            !isHighlighted && "bg-muted/20"
                          )}
                        >
                          {readOnly ? (
                            <div className="text-center text-[10px] px-0.5 py-0.5">
                              {qty || ''}
                            </div>
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              className={cn(
                                "h-6 text-[10px] text-center border-0 p-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary/30 rounded-none w-full",
                                isHighlighted && qty > 0 && "bg-primary/10 font-medium"
                              )}
                              value={qty || ''}
                              onChange={(e) => {
                                handleChange(item.id, dateStr, parseInt(e.target.value) || 0);
                              }}
                            />
                          )}
                        </td>
                      );
                    });
                  })}
                  <td className="border-b text-center text-[10px] font-bold px-2">
                    {itemTotal || ''}
                  </td>
                </tr>
              );
            })}

            {/* Day totals row */}
            <tr className="bg-muted font-medium">
              <td className="sticky left-0 z-10 bg-muted border-r border-b px-2 py-0.5 text-[10px] font-bold">
                Inserções/dia
              </td>
              {months.map(month => {
                if (collapsedMonths.has(month.key)) {
                  const monthTotal = month.days.reduce((sum, day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    return sum + (dayTotals[dateStr] || 0);
                  }, 0);
                  return (
                    <td key={`t-${month.key}`} className="border-r border-b text-center text-[10px] font-bold px-1">
                      {monthTotal || ''}
                    </td>
                  );
                }
                return month.days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const total = dayTotals[dateStr] || 0;
                  return (
                    <td
                      key={`t-${dateStr}`}
                      className="border-r border-b text-center text-[10px] font-bold px-0.5 py-0.5"
                    >
                      {total || ''}
                    </td>
                  );
                });
              })}
              <td className="border-b text-center text-[10px] font-bold px-2">
                {Object.values(dayTotals).reduce((s, q) => s + q, 0) || ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}