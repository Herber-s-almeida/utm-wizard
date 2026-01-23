import { useState } from 'react';
import { FileSpreadsheet, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLineDetails } from '@/hooks/useLineDetails';
import { useLineLinksForLine } from '@/hooks/useLineDetailLinks';
import { LineDetailDialog } from './LineDetailDialog';

export interface LineDetailButtonProps {
  mediaLineId: string;
  planId?: string;
  startDate?: string | null;
  endDate?: string | null;
  lineBudget?: number;
  lineCode?: string;
  platform?: string;
  className?: string;
  // Context for inheritance
  vehicleName?: string;
  mediumName?: string;
  channelName?: string;
  subdivisionName?: string;
  momentName?: string;
  funnelStageName?: string;
  formatName?: string;
}

export function LineDetailButton({ 
  mediaLineId, 
  planId,
  startDate, 
  endDate,
  lineBudget,
  lineCode,
  platform,
  className,
  vehicleName,
  mediumName,
  channelName,
  subdivisionName,
  momentName,
  funnelStageName,
  formatName,
}: LineDetailButtonProps) {
  const [open, setOpen] = useState(false);
  const { details } = useLineDetails(mediaLineId);
  const { data: lineLinks } = useLineLinksForLine(mediaLineId);
  
  const detailsCount = details?.length || 0;
  const linksCount = lineLinks?.length || 0;

  // Check if any linked detail is shared (has multiple links)
  const hasSharedDetails = lineLinks?.some(link => {
    // This would require additional data, for now just check if we have links
    return linksCount > 0;
  });

  // Determine icon state
  const hasDetails = detailsCount > 0 || linksCount > 0;
  const totalCount = Math.max(detailsCount, linksCount);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 relative",
              hasDetails && "text-primary",
              className
            )}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            {hasSharedDetails ? (
              <Link2 className="h-3 w-3" />
            ) : (
              <FileSpreadsheet className={cn(
                "h-3 w-3",
                hasDetails && "fill-primary/20"
              )} />
            )}
            {totalCount > 0 && (
              <Badge 
                variant={hasSharedDetails ? "default" : "secondary"}
                className={cn(
                  "absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 text-[9px] font-medium",
                  hasSharedDetails && "bg-primary"
                )}
              >
                {totalCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {totalCount > 0 
            ? hasSharedDetails
              ? `${totalCount} detalhamento${totalCount > 1 ? 's' : ''} (compartilhado)`
              : `${totalCount} detalhamento${totalCount > 1 ? 's' : ''}`
            : 'Adicionar detalhamento'
          }
        </TooltipContent>
      </Tooltip>

      <LineDetailDialog
        open={open}
        onOpenChange={setOpen}
        mediaLineId={mediaLineId}
        planId={planId}
        startDate={startDate}
        endDate={endDate}
        lineBudget={lineBudget}
        lineCode={lineCode}
        platform={platform}
        vehicleName={vehicleName}
        mediumName={mediumName}
        channelName={channelName}
        subdivisionName={subdivisionName}
        momentName={momentName}
        funnelStageName={funnelStageName}
        formatName={formatName}
      />
    </>
  );
}
