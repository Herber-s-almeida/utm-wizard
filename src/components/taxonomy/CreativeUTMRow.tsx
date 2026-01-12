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
  defaultUrl?: string | null;
  onCopy: (url: string) => void;
}

// Helper to build utm_content from format, message_slug and creative_id
function buildUtmContent(
  formatSlug: string | null | undefined,
  messageSlug: string | null | undefined,
  creativeId: string | null | undefined
): string {
  const parts = [
    formatSlug || '',
    messageSlug || '',
    creativeId || ''
  ].filter(Boolean);
  return parts.join('-');
}

export function CreativeUTMRow({ creative, parentLine, planName, defaultUrl, onCopy }: CreativeUTMRowProps) {
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

  const utmContent = buildUtmContent(
    creative.format?.slug,
    creative.message_slug,
    creative.creative_id
  );

  const destinationUrl = parentLine.destination_url || defaultUrl;

  const handleCopy = () => {
    if (!destinationUrl) return;

    const utmParams = {
      utm_source: getUtmSource(),
      utm_medium: getUtmMedium(),
      utm_campaign: parentLine.utm_campaign || buildUtmCampaign(),
      utm_term: parentLine.utm_term || '',
      utm_content: utmContent,
    };

    const fullUrl = buildUrlWithUTM(destinationUrl, utmParams);
    onCopy(fullUrl);
  };

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/30">
      <TableCell className="p-2 pl-8">
        <Image className="h-3.5 w-3.5 text-muted-foreground" />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        —
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{creative.name}</span>
      </TableCell>
      <TableCell>
        {creative.format?.name ? (
          <span className="text-xs truncate block max-w-[100px]" title={creative.format.name}>
            {creative.format.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {creative.copy_text ? (
          <span className="text-xs truncate block max-w-[120px]" title={creative.copy_text}>
            {creative.copy_text}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {creative.creative_id ? (
          <code className="text-xs px-1.5 py-0.5 bg-muted rounded">
            {creative.creative_id}
          </code>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      {/* Empty cells for utm_source, utm_medium, utm_campaign, utm_term */}
      <TableCell></TableCell>
      <TableCell></TableCell>
      <TableCell></TableCell>
      <TableCell></TableCell>
      <TableCell>
        {utmContent ? (
          <code className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded truncate block max-w-[130px]" title={utmContent}>
            {utmContent}
          </code>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell></TableCell>
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
          disabled={!destinationUrl}
          title="Copiar URL completa do criativo"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
