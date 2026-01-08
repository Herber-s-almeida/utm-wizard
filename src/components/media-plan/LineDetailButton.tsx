import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLineDetails } from '@/hooks/useLineDetails';
import { LineDetailDialog } from './LineDetailDialog';

export interface LineDetailButtonProps {
  mediaLineId: string;
  startDate?: string | null;
  endDate?: string | null;
  className?: string;
}

export function LineDetailButton({ 
  mediaLineId, 
  startDate, 
  endDate,
  className 
}: LineDetailButtonProps) {
  const [open, setOpen] = useState(false);
  const { details } = useLineDetails(mediaLineId);
  
  const detailsCount = details?.length || 0;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6 relative", className)}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <FileSpreadsheet className="h-3 w-3" />
            {detailsCount > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 text-[9px] font-medium"
              >
                {detailsCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {detailsCount > 0 
            ? `${detailsCount} detalhamento${detailsCount > 1 ? 's' : ''}`
            : 'Adicionar detalhamento'
          }
        </TooltipContent>
      </Tooltip>

      <LineDetailDialog
        open={open}
        onOpenChange={setOpen}
        mediaLineId={mediaLineId}
        startDate={startDate}
        endDate={endDate}
      />
    </>
  );
}
