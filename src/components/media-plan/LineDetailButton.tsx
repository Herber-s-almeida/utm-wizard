import { FileSpreadsheet, Link2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLineLinksForLine } from '@/hooks/useLineDetailLinks';

export interface LineDetailButtonProps {
  mediaLineId: string;
  planId?: string;
  startDate?: string | null;
  endDate?: string | null;
  lineBudget?: number;
  lineCode?: string;
  platform?: string;
  className?: string;
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
  className,
}: LineDetailButtonProps) {
  const navigate = useNavigate();
  const { id: planSlug } = useParams<{ id: string }>();
  const { data: lineLinks } = useLineLinksForLine(mediaLineId);
  
  const linksCount = lineLinks?.length || 0;
  const hasDetails = linksCount > 0;

  return (
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
            navigate(`/media-plans/${planSlug}/line/${mediaLineId}`);
          }}
        >
          {hasDetails ? (
            <Link2 className="h-3 w-3" />
          ) : (
            <FileSpreadsheet className="h-3 w-3" />
          )}
          {linksCount > 0 && (
            <Badge 
              variant="secondary"
              className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 text-[9px] font-medium"
            >
              {linksCount}
            </Badge>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {linksCount > 0 
          ? `${linksCount} detalhamento${linksCount > 1 ? 's' : ''}`
          : 'Adicionar detalhamento'
        }
      </TooltipContent>
    </Tooltip>
  );
}
