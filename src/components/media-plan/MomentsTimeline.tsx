import { useMemo, useState } from 'react';
import { format, differenceInDays, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

interface MomentPeriod {
  id: string; // Distribution ID (unique)
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
  canEdit?: boolean;
  onUpdateMomentDates?: (distributionId: string, startDate: string | null, endDate: string | null) => void;
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
  canEdit = false,
  onUpdateMomentDates,
}: MomentsTimelineProps) {
  const [editingMomentId, setEditingMomentId] = useState<string | undefined>(undefined);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>(undefined);
  const [editEndDate, setEditEndDate] = useState<Date | undefined>(undefined);
  const [startPopoverOpen, setStartPopoverOpen] = useState(false);
  const [endPopoverOpen, setEndPopoverOpen] = useState(false);

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

  const formatFullDate = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return format(new Date(year, month - 1, day), "dd/MM/yyyy", { locale: ptBR });
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

  const handleStartEdit = (moment: typeof timelineData[0]) => {
    setEditingMomentId(moment.id);
    setEditStartDate(moment.startDate ? parseISO(moment.startDate) : parseISO(planStartDate));
    setEditEndDate(moment.endDate ? parseISO(moment.endDate) : parseISO(planEndDate));
  };

  const handleSaveEdit = () => {
    if (editingMomentId !== undefined && onUpdateMomentDates && editStartDate && editEndDate) {
      onUpdateMomentDates(
        editingMomentId,
        format(editStartDate, 'yyyy-MM-dd'),
        format(editEndDate, 'yyyy-MM-dd')
      );
    }
    setEditingMomentId(undefined);
    setEditStartDate(undefined);
    setEditEndDate(undefined);
  };

  const handleCancelEdit = () => {
    setEditingMomentId(undefined);
    setEditStartDate(undefined);
    setEditEndDate(undefined);
  };

  const planStartParsed = parseISO(planStartDate);
  const planEndParsed = parseISO(planEndDate);

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
        
        {/* Timeline track - multi-line layout */}
        {(() => {
          const ROW_HEIGHT = 24;
          const ROW_GAP = 4;
          const PADDING_Y = 6;
          const trackHeight = PADDING_Y * 2 + timelineData.length * ROW_HEIGHT + (timelineData.length - 1) * ROW_GAP;
          const maxHeight = 200;
          
          return (
            <div 
              className="relative bg-muted/30 rounded-lg border overflow-y-auto"
              style={{ height: Math.min(trackHeight, maxHeight) }}
            >
              <div className="relative" style={{ height: trackHeight, minHeight: '100%' }}>
                {/* Background grid lines */}
                {monthMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="absolute w-px bg-border/50"
                    style={{ left: `${marker.position}%`, top: 0, bottom: 0 }}
                  />
                ))}
                
                {/* Moment bars - each on its own lane */}
                <TooltipProvider>
                  {timelineData.map((moment, idx) => {
                    const top = PADDING_Y + idx * (ROW_HEIGHT + ROW_GAP);
                    
                    return (
                      <Tooltip key={moment.id || idx}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute rounded-md cursor-pointer transition-all hover:opacity-90 flex items-center justify-center overflow-hidden"
                            style={{
                              left: `${moment.startPercent}%`,
                              width: `${Math.max(moment.widthPercent, 2)}%`,
                              top: `${top}px`,
                              height: `${ROW_HEIGHT}px`,
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
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          );
        })()}
        
        {/* Legend with edit controls */}
        <div className="flex flex-wrap gap-4 mt-3">
          {timelineData.map((moment, idx) => {
            const isEditing = editingMomentId === moment.id;
            
            return (
              <div key={moment.id || idx} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: moment.color }}
                />
                
                {isEditing ? (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                    <span className="text-xs font-medium">{moment.name}:</span>
                    
                    <Popover open={startPopoverOpen} onOpenChange={setStartPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                          {editStartDate ? format(editStartDate, "dd/MM/yy") : "Início"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={editStartDate}
                          onSelect={(date) => {
                            setEditStartDate(date);
                            setStartPopoverOpen(false);
                          }}
                          disabled={(date) => date < planStartParsed || date > planEndParsed}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <span className="text-xs text-muted-foreground">-</span>
                    
                    <Popover open={endPopoverOpen} onOpenChange={setEndPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                          {editEndDate ? format(editEndDate, "dd/MM/yy") : "Fim"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={editEndDate}
                          onSelect={(date) => {
                            setEditEndDate(date);
                            setEndPopoverOpen(false);
                          }}
                          disabled={(date) => 
                            date < planStartParsed || 
                            date > planEndParsed || 
                            (editStartDate && date < editStartDate)
                          }
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{moment.name}</span>
                    <span className="text-xs text-muted-foreground/70">
                      ({formatFullDate(moment.actualStart)} - {formatFullDate(moment.actualEnd)})
                    </span>
                    {canEdit && onUpdateMomentDates && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-5 w-5"
                        onClick={() => handleStartEdit(moment)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
