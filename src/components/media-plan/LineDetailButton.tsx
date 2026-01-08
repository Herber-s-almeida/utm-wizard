import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface LineDetailButtonProps {
  detailsCount: number;
  onClick: () => void;
  className?: string;
}

export function LineDetailButton({ detailsCount, onClick, className }: LineDetailButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 relative", className)}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {detailsCount > 0 && (
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-medium"
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
  );
}
