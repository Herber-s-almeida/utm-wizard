import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, ChevronDown, ChevronRight, Copy, ExternalLink, Edit2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { toSlug, buildUrlWithUTM } from '@/utils/utmGenerator';
import { TaxonomyLine } from '@/hooks/useTaxonomyData';
import { CreativeUTMRow } from './CreativeUTMRow';

interface TaxonomyTableProps {
  data: TaxonomyLine[];
  planName: string;
  defaultUrl?: string | null;
  userId: string;
  onUpdate: () => void;
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

export function TaxonomyTable({ data, planName, defaultUrl, userId, onUpdate }: TaxonomyTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [termValue, setTermValue] = useState('');

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const buildUtmCampaign = (line: TaxonomyLine): string => {
    const parts = [
      line.line_code || '',
      toSlug(planName),
      line.subdivision?.slug || 'geral',
      line.moment?.slug || 'geral',
      line.funnel_stage_ref?.slug || 'geral',
    ].filter(Boolean);
    return parts.join('_');
  };

  const getUtmSource = (line: TaxonomyLine): string => {
    return line.vehicle?.slug || line.utm_source || '';
  };

  const getUtmMedium = (line: TaxonomyLine): string => {
    return line.channel?.slug || line.utm_medium || '';
  };

  // Get the first creative's utm_content or empty string
  const getLineUtmContent = (line: TaxonomyLine): string => {
    if (line.creatives.length > 0) {
      const firstCreative = line.creatives[0];
      return buildUtmContent(
        firstCreative.format?.slug,
        firstCreative.message_slug,
        firstCreative.creative_id
      );
    }
    return '';
  };

  // Get first creative's format name
  const getLineFormat = (line: TaxonomyLine): string | null => {
    if (line.creatives.length > 0 && line.creatives[0].format) {
      return line.creatives[0].format.name;
    }
    return null;
  };

  // Get first creative's message
  const getLineMessage = (line: TaxonomyLine): string | null => {
    if (line.creatives.length > 0 && line.creatives[0].copy_text) {
      return line.creatives[0].copy_text;
    }
    return null;
  };

  // Get first creative's ID
  const getLineCreativeId = (line: TaxonomyLine): string | null => {
    if (line.creatives.length > 0 && line.creatives[0].creative_id) {
      return line.creatives[0].creative_id;
    }
    return null;
  };

  const handleValidate = async (lineId: string) => {
    const { error } = await supabase
      .from('media_lines')
      .update({
        utm_validated: true,
        utm_validated_at: new Date().toISOString(),
        utm_validated_by: userId,
      })
      .eq('id', lineId);

    if (error) {
      toast.error('Erro ao validar UTM');
    } else {
      toast.success('UTM validada!');
      onUpdate();
    }
  };

  const handleInvalidate = async (lineId: string) => {
    const { error } = await supabase
      .from('media_lines')
      .update({
        utm_validated: false,
        utm_validated_at: null,
        utm_validated_by: null,
      })
      .eq('id', lineId);

    if (error) {
      toast.error('Erro ao invalidar UTM');
    } else {
      toast.success('Validação removida');
      onUpdate();
    }
  };

  const handleSaveUrl = async (lineId: string) => {
    // If user clears the field, save null (will use default)
    // If user enters something, save that value
    const valueToSave = urlValue.trim() || null;
    
    const { error } = await supabase
      .from('media_lines')
      .update({ destination_url: valueToSave })
      .eq('id', lineId);

    if (error) {
      toast.error('Erro ao salvar URL');
    } else {
      toast.success(valueToSave ? 'URL salva' : 'URL removida, usando padrão');
      setEditingUrl(null);
      onUpdate();
    }
  };

  const handleSaveTerm = async (lineId: string) => {
    const { error } = await supabase
      .from('media_lines')
      .update({ utm_term: termValue || null })
      .eq('id', lineId);

    if (error) {
      toast.error('Erro ao salvar termo');
    } else {
      toast.success('Termo salvo');
      setEditingTerm(null);
      onUpdate();
    }
  };

  const handleCopyUrl = (line: TaxonomyLine) => {
    const destinationUrl = line.destination_url || defaultUrl;
    if (!destinationUrl) {
      toast.error('URL de destino não definida');
      return;
    }

    const utmParams = {
      utm_source: getUtmSource(line),
      utm_medium: getUtmMedium(line),
      utm_campaign: line.utm_campaign || buildUtmCampaign(line),
      utm_term: line.utm_term || '',
      utm_content: getLineUtmContent(line),
    };

    const fullUrl = buildUrlWithUTM(destinationUrl, utmParams);
    navigator.clipboard.writeText(fullUrl);
    toast.success('URL copiada!');
  };

  const handleUpdateCampaign = async (lineId: string, line: TaxonomyLine) => {
    const newCampaign = buildUtmCampaign(line);
    const { error } = await supabase
      .from('media_lines')
      .update({ 
        utm_campaign: newCampaign,
        utm_source: getUtmSource(line),
        utm_medium: getUtmMedium(line),
      })
      .eq('id', lineId);

    if (error) {
      toast.error('Erro ao atualizar UTM');
    } else {
      toast.success('UTM atualizada');
      onUpdate();
    }
  };

  // Get display URL (line's own or default)
  const getDisplayUrl = (line: TaxonomyLine): { url: string | null; isDefault: boolean } => {
    if (line.destination_url) {
      return { url: line.destination_url, isDefault: false };
    }
    if (defaultUrl) {
      return { url: defaultUrl, isDefault: true };
    }
    return { url: null, isDefault: false };
  };

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-24">
                <div className="flex items-center gap-1">
                  Código
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Código único da linha no plano de mídia</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead>Veículo / Canal</TableHead>
              <TableHead className="w-28">Formato</TableHead>
              <TableHead className="w-32">Mensagem</TableHead>
              <TableHead className="w-24">ID Criativo</TableHead>
              <TableHead className="w-28">utm_source</TableHead>
              <TableHead className="w-28">utm_medium</TableHead>
              <TableHead className="min-w-[180px]">utm_campaign</TableHead>
              <TableHead className="w-28">utm_term</TableHead>
              <TableHead className="w-36">utm_content</TableHead>
              <TableHead className="min-w-[180px]">URL de destino</TableHead>
              <TableHead className="w-24 text-center">Validado</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((line) => {
              const hasCreatives = line.creatives.length > 0;
              const isExpanded = expandedRows.has(line.id);
              const utmCampaign = line.utm_campaign || buildUtmCampaign(line);
              const { url: displayUrl, isDefault: isDefaultUrl } = getDisplayUrl(line);
              const lineFormat = getLineFormat(line);
              const lineMessage = getLineMessage(line);
              const lineCreativeId = getLineCreativeId(line);
              const lineUtmContent = getLineUtmContent(line);

              return (
                <>
                  <TableRow key={line.id} className="hover:bg-muted/30">
                    <TableCell className="p-2">
                      {hasCreatives && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleRow(line.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Criativos na Linha ({line.creatives.length})</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {line.line_code || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{line.vehicle?.name || line.platform}</span>
                        {line.channel && (
                          <span className="text-muted-foreground"> / {line.channel.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lineFormat ? (
                        <span className="text-xs truncate block max-w-[100px]" title={lineFormat}>
                          {lineFormat}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lineMessage ? (
                        <span className="text-xs truncate block max-w-[120px]" title={lineMessage}>
                          {lineMessage}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lineCreativeId ? (
                        <code className="text-xs px-1.5 py-0.5 bg-muted rounded">
                          {lineCreativeId}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs px-1.5 py-0.5 bg-muted rounded">
                        {getUtmSource(line) || '—'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs px-1.5 py-0.5 bg-muted rounded">
                        {getUtmMedium(line) || '—'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs px-1.5 py-0.5 bg-muted rounded truncate max-w-[150px]" title={utmCampaign}>
                          {utmCampaign}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => handleUpdateCampaign(line.id, line)}
                          title="Atualizar UTM campaign"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingTerm === line.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={termValue}
                            onChange={(e) => setTermValue(e.target.value)}
                            className="h-6 text-xs w-20"
                            placeholder="termo..."
                          />
                          <Button size="icon" className="h-5 w-5" onClick={() => handleSaveTerm(line.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingTerm(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            setEditingTerm(line.id);
                            setTermValue(line.utm_term || '');
                          }}
                        >
                          {line.utm_term ? (
                            <code className="text-xs">{line.utm_term}</code>
                          ) : (
                            <span className="text-muted-foreground">+ termo</span>
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {lineUtmContent ? (
                        <code className="text-xs px-1.5 py-0.5 bg-muted rounded truncate block max-w-[130px]" title={lineUtmContent}>
                          {lineUtmContent}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingUrl === line.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={urlValue}
                            onChange={(e) => setUrlValue(e.target.value)}
                            className="h-6 text-xs"
                            placeholder={defaultUrl || 'https://...'}
                          />
                          <Button size="icon" className="h-5 w-5" onClick={() => handleSaveUrl(line.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingUrl(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 text-xs px-2 truncate max-w-[140px] ${isDefaultUrl ? 'italic text-muted-foreground' : ''}`}
                            onClick={() => {
                              setEditingUrl(line.id);
                              setUrlValue(line.destination_url || '');
                            }}
                          >
                            {displayUrl ? (
                              <span className="truncate flex items-center gap-1">
                                {displayUrl}
                                {isDefaultUrl && <span className="text-xs">(padrão)</span>}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">+ URL</span>
                            )}
                          </Button>
                          {displayUrl && (
                            <a href={displayUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-5 w-5">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {line.utm_validated ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <Check className="h-3 w-3" />
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {line.utm_validated ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-destructive"
                            onClick={() => handleInvalidate(line.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => handleValidate(line.id)}
                            title="Validar UTM"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyUrl(line)}
                          title="Copiar URL completa"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Creatives rows */}
                  {isExpanded && line.creatives.map((creative) => (
                    <CreativeUTMRow
                      key={creative.id}
                      creative={creative}
                      parentLine={line}
                      planName={planName}
                      defaultUrl={defaultUrl}
                      onCopy={(fullUrl) => {
                        navigator.clipboard.writeText(fullUrl);
                        toast.success('URL do criativo copiada!');
                      }}
                    />
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
