import { useMemo } from 'react';
import { format, differenceInDays, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MomentPeriod {
  id: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  budget: number;
  percentage: number;
  color?: string;
}

interface MomentsTimelineProps {
  moments: MomentPeriod[];
  planStartDate: string;
  planEndDate: string;
  className?: string;
}

const MOMENT_COLORS = [
  'hsl(var(--primary))',
  'hsl(271, 91%, 65%)',
  'hsl(199, 89%, 48%)',
  'hsl(142, 71%, 45%)',
  'hsl(45, 93%, 47%)',
  'hsl(0, 84%, 60%)',
  'hsl(316, 70%, 50%)',
];

export function MomentsTimeline({
  moments,
  planStartDate,
  planEndDate,
  className,
}: MomentsTimelineProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return format(new Date(year, month - 1, day), "dd MMM", { locale: ptBR });
  };

  const timelineData = useMemo(() => {
    const planStart = parseISO(planStartDate);
    const planEnd = parseISO(planEndDate);
    const totalDays = differenceInDays(planEnd, planStart) + 1;

    return moments.map((moment, index) => {
      const momentStart = moment.startDate ? parseISO(moment.startDate) : planStart;
      const momentEnd = moment.endDate ? parseISO(moment.endDate) : planEnd;
      
      const startOffset = Math.max(0, differenceInDays(momentStart, planStart));
      const endOffset = Math.min(totalDays, differenceInDays(momentEnd, planStart) + 1);
      const duration = endOffset - startOffset;
      
      const startPercent = (startOffset / totalDays) * 100;
      const widthPercent = (duration / totalDays) * 100;
      
      return {
        ...moment,
        color: moment.color || MOMENT_COLORS[index % MOMENT_COLORS.length],
        startPercent,
        widthPercent,
        duration,
        actualStart: moment.startDate || planStartDate,
        actualEnd: moment.endDate || planEndDate,
      };
    });
  }, [moments, planStartDate, planEndDate]);

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const planStart = parseISO(planStartDate);
    const planEnd = parseISO(planEndDate);
    const totalDays = differenceInDays(planEnd, planStart) + 1;
    
    const markers: { label: string; position: number }[] = [];
    const days = eachDayOfInterval({ start: planStart, end: planEnd });
    
    let currentMonth = -1;
    days.forEach((day, index) => {
      const month = day.getMonth();
      if (month !== currentMonth) {
        currentMonth = month;
        markers.push({
          label: format(day, 'MMM', { locale: ptBR }),
          position: (index / totalDays) * 100,
        });
      }
    });
    
    return markers;
  }, [planStartDate, planEndDate]);

  if (moments.length === 0 || !planStartDate || !planEndDate) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Timeline de Momentos</span>
        <span className="text-xs">
          ({formatDate(planStartDate)} - {formatDate(planEndDate)})
        </span>
      </div>
      
      <div className="relative">
        {/* Month markers */}
        <div className="relative h-6 mb-1">
          {monthMarkers.map((marker, idx) => (
            <div
              key={idx}
              className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
              style={{ left: `${marker.position}%` }}
            >
              {marker.label}
            </div>
          ))}
        </div>
        
        {/* Timeline track */}
        <div className="relative h-12 bg-muted/30 rounded-lg border overflow-hidden">
          {/* Background grid lines */}
          <div className="absolute inset-0 flex">
            {monthMarkers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute h-full w-px bg-border/50"
                style={{ left: `${marker.position}%` }}
              />
            ))}
          </div>
          
          {/* Moment bars */}
          <TooltipProvider>
            {timelineData.map((moment, idx) => (
              <Tooltip key={moment.id || idx}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-1 bottom-1 rounded-md cursor-pointer transition-all hover:opacity-90 hover:scale-y-110 flex items-center justify-center overflow-hidden"
                    style={{
                      left: `${moment.startPercent}%`,
                      width: `${Math.max(moment.widthPercent, 2)}%`,
                      backgroundColor: moment.color,
                    }}
                  >
                    <span className="text-xs font-medium text-white truncate px-2 drop-shadow-md">
                      {moment.name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{moment.name}</p>
                    <div className="text-xs space-y-0.5 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(moment.actualStart)} - {formatDate(moment.actualEnd)}</span>
                        <span className="text-foreground font-medium">({moment.duration} dias)</span>
                      </div>
                      <div>
                        <span className="text-foreground font-medium">{formatCurrency(moment.budget)}</span>
                        <span> ({moment.percentage.toFixed(1)}% do plano)</span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3">
          {timelineData.map((moment, idx) => (
            <div key={moment.id || idx} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: moment.color }}
              />
              <span className="text-xs text-muted-foreground">{moment.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
