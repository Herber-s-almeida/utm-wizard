/**
 * Inline Grid Block - Monthly calendar with collapsible months.
 * Each month shows day columns with weekday headers.
 * Cells allow inputting insertion quantities per day.
 */
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown } from 'lucide-react';
import {
  format,
  parseISO,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
  getDay,
  isValid,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface GridBlockProps {
  items: Array<{
    id: string;
    daysOfWeek?: string[];
  }>;
  /** All insertions for items in this detail */
  insertions: Record<string, Record<string, number>>; // itemId -> { date -> qty }
  periodStart: string | null;
  periodEnd: string | null;
  onInsertionChange: (itemId: string, date: string, quantity: number) => void;
  readOnly?: boolean;
}

interface MonthData {
  key: string;
  label: string;
  days: Date[];
}

export function GridBlock({
  items,
  insertions,
  periodStart,
  periodEnd,
  onInsertionChange,
  readOnly,
}: GridBlockProps) {
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const months = useMemo((): MonthData[] => {
    if (!periodStart || !periodEnd) return [];
    const start = parseISO(periodStart);
    const end = parseISO(periodEnd);
    if (!isValid(start) || !isValid(end)) return [];

    const result: MonthData[] = [];
    let current = startOfMonth(start);

    while (current <= end) {
      const monthEnd = endOfMonth(current);
      const rangeStart = current < start ? start : current;
      const rangeEnd = monthEnd > end ? end : monthEnd;

      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      result.push({
        key: format(current, 'yyyy-MM'),
        label: format(current, 'MMM/yy', { locale: ptBR }).toUpperCase(),
        days,
      });

      current = addMonths(current, 1);
      current = startOfMonth(current);
    }

    return result;
  }, [periodStart, periodEnd]);

  const toggleMonth = (key: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  if (months.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic px-4 py-2">
        Defina Início e Fim para exibir a grade de inserções.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-t">
      <table className="min-w-max text-[11px]">
        <thead>
          {/* Month headers row */}
          <tr className="bg-muted/50">
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
          </tr>
          {/* Weekday row */}
          <tr className="bg-muted/30">
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
          </tr>
          {/* Date row */}
          <tr className="bg-muted/20">
            {months.map(month => {
              if (collapsedMonths.has(month.key)) {
                return <th key={`${month.key}-dt`} className="border-r border-b" />;
              }
              return month.days.map(day => (
                <th
                  key={`d-${format(day, 'yyyy-MM-dd')}`}
                  className="px-0.5 py-0.5 border-r border-b text-center text-[9px] text-muted-foreground"
                >
                  {format(day, 'dd/MM')}
                </th>
              ));
            })}
          </tr>
        </thead>
        <tbody>
          {/* Item rows */}
          {items.map(item => {
            const itemInsertions = insertions[item.id] || {};
            const selectedDays = item.daysOfWeek || [];

            return (
              <tr key={item.id} className="hover:bg-muted/20">
                {months.map(month => {
                  if (collapsedMonths.has(month.key)) {
                    // Show sum for collapsed month
                    const monthTotal = month.days.reduce((sum, day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      return sum + (itemInsertions[dateStr] || 0);
                    }, 0);
                    return (
                      <td key={month.key} className="border-r border-b text-center text-[10px] font-medium px-1">
                        {monthTotal || ''}
                      </td>
                    );
                  }
                  return month.days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayOfWeek = WEEKDAY_LABELS[getDay(day)];
                    const isHighlighted = selectedDays.length === 0 || selectedDays.includes(dayOfWeek);
                    const qty = itemInsertions[dateStr] || 0;

                    return (
                      <td
                        key={dateStr}
                        className={cn(
                          "border-r border-b p-0 min-w-[32px]",
                          !isHighlighted && "bg-muted/30"
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
                              onInsertionChange(item.id, dateStr, parseInt(e.target.value) || 0);
                            }}
                          />
                        )}
                      </td>
                    );
                  });
                })}
              </tr>
            );
          })}

          {/* Day totals row */}
          <tr className="bg-muted font-medium">
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
          </tr>
        </tbody>
      </table>
    </div>
  );
}
