import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Image } from 'lucide-react';
import { TaxonomyLine, TaxonomyCreative } from '@/hooks/useTaxonomyData';
import { toSlug, buildUrlWithUTM } from '@/utils/utmGenerator';

interface CreativeUTMRowProps {
  creative: TaxonomyCreative;
  parentLine: TaxonomyLine;
  planName: string;
  onCopy: (url: string) => void;
}

export function CreativeUTMRow({ creative, parentLine, planName, onCopy }: CreativeUTMRowProps) {
  const buildUtmCampaign = (): string => {
    const parts = [
      parentLine.line_code || '',
      toSlug(planName),
      parentLine.subdivision?.slug || 'geral',
      parentLine.moment?.slug || 'geral',
      parentLine.funnel_stage_ref?.slug || 'geral',
    ].filter(Boolean);
    return parts.join('_');
  };

  const getUtmSource = (): string => {
    return parentLine.vehicle?.slug || parentLine.utm_source || '';
  };

  const getUtmMedium = (): string => {
    return parentLine.channel?.slug || parentLine.utm_medium || '';
  };

  const utmContent = creative.creative_id || creative.id.slice(0, 6);

  const handleCopy = () => {
    if (!parentLine.destination_url) return;

    const utmParams = {
      utm_source: getUtmSource(),
      utm_medium: getUtmMedium(),
      utm_campaign: parentLine.utm_campaign || buildUtmCampaign(),
      utm_term: parentLine.utm_term || '',
      utm_content: utmContent,
    };

    const fullUrl = buildUrlWithUTM(parentLine.destination_url, utmParams);
    onCopy(fullUrl);
  };

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/30">
      <TableCell className="p-2 pl-8">
        <Image className="h-3.5 w-3.5 text-muted-foreground" />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {creative.creative_id || '—'}
      </TableCell>
      <TableCell colSpan={4}>
        <span className="text-sm text-muted-foreground">{creative.name}</span>
      </TableCell>
      <TableCell colSpan={2}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">utm_content:</span>
          <code className="text-xs px-1.5 py-0.5 bg-muted rounded">
            {utmContent}
          </code>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="text-xs">
          Criativo
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
          disabled={!parentLine.destination_url}
          title="Copiar URL completa do criativo"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
