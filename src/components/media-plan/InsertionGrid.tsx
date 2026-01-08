import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  parseISO,
  isSameMonth,
  getDay,
  isWeekend,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LineDetailInsertion } from '@/hooks/useLineDetails';

interface InsertionGridProps {
  itemId: string;
  insertions: LineDetailInsertion[];
  startDate?: string | null;
  endDate?: string | null;
  onSave: (insertions: { date: string; quantity: number }[]) => void;
  onCancel: () => void;
}

export function InsertionGrid({
  itemId,
  insertions,
  startDate,
  endDate,
  onSave,
  onCancel,
}: InsertionGridProps) {
  // Parse dates
  const planStart = startDate ? parseISO(startDate) : new Date();
  const planEnd = endDate ? parseISO(endDate) : addMonths(planStart, 1);
  
  const [currentMonth, setCurrentMonth] = useState(planStart);
  const [localInsertions, setLocalInsertions] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    insertions.forEach(ins => {
      map[ins.insertion_date] = ins.quantity;
    });
    return map;
  });

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Group by weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // Pad start of first week
    const firstDayOfWeek = getDay(daysInMonth[0]);
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null as unknown as Date);
    }
    
    daysInMonth.forEach(day => {
      currentWeek.push(day);
      if (getDay(day) === 6) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null as unknown as Date);
      }
      result.push(currentWeek);
    }
    
    return result;
  }, [daysInMonth]);

  const totalForMonth = useMemo(() => {
    return daysInMonth.reduce((sum, day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return sum + (localInsertions[dateStr] || 0);
    }, 0);
  }, [daysInMonth, localInsertions]);

  const totalAll = useMemo(() => {
    return Object.values(localInsertions).reduce((sum, qty) => sum + qty, 0);
  }, [localInsertions]);

  const handleQuantityChange = (date: Date, quantity: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setLocalInsertions(prev => ({
      ...prev,
      [dateStr]: Math.max(0, quantity),
    }));
  };

  const handleSave = () => {
    const result = Object.entries(localInsertions).map(([date, quantity]) => ({
      date,
      quantity,
    }));
    onSave(result);
  };

  const canGoBack = isSameMonth(currentMonth, planStart) ? false : true;
  const canGoForward = isSameMonth(currentMonth, planEnd) ? false : true;

  return (
    <div className="p-4 w-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={!canGoForward}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIdx) => {
              if (!day) {
                return <div key={dayIdx} className="h-9" />;
              }
              
              const dateStr = format(day, 'yyyy-MM-dd');
              const quantity = localInsertions[dateStr] || 0;
              const isWeekendDay = isWeekend(day);
              
              return (
                <div 
                  key={dayIdx} 
                  className={cn(
                    "relative rounded-md border text-center",
                    isWeekendDay && "bg-muted/50"
                  )}
                >
                  <div className="text-[10px] text-muted-foreground pt-0.5">
                    {format(day, 'd')}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    className="h-6 text-xs text-center border-0 p-0 bg-transparent focus-visible:ring-0"
                    value={quantity || ''}
                    onChange={(e) => handleQuantityChange(day, parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Este mês:</span>
            <Badge variant="secondary" className="ml-2">{totalForMonth}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>
            <Badge className="ml-2">{totalAll}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
