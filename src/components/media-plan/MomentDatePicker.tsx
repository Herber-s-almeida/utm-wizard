import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MomentDatePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  planStartDate?: string;
  planEndDate?: string;
  disabled?: boolean;
}

export function MomentDatePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  planStartDate,
  planEndDate,
  disabled = false,
}: MomentDatePickerProps) {
  const isStartValid = !planStartDate || startDate >= planStartDate;
  const isEndValid = !planEndDate || endDate <= planEndDate;
  const isRangeValid = !startDate || !endDate || endDate >= startDate;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Período de veiculação deste momento</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          min={planStartDate}
          max={planEndDate}
          disabled={disabled}
          className={`w-36 h-8 text-xs ${!isStartValid ? 'border-destructive' : ''}`}
        />
        <span className="text-muted-foreground text-xs">até</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          min={startDate || planStartDate}
          max={planEndDate}
          disabled={disabled}
          className={`w-36 h-8 text-xs ${!isEndValid || !isRangeValid ? 'border-destructive' : ''}`}
        />
      </div>
    </div>
  );
}
