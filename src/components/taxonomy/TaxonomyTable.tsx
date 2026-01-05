import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, ChevronDown, ChevronRight, Copy, ExternalLink, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { toSlug, buildUrlWithUTM } from '@/utils/utmGenerator';
import { TaxonomyLine } from '@/hooks/useTaxonomyData';
import { CreativeUTMRow } from './CreativeUTMRow';

interface TaxonomyTableProps {
  data: TaxonomyLine[];
  planName: string;
  userId: string;
  onUpdate: () => void;
}

export function TaxonomyTable({ data, planName, userId, onUpdate }: TaxonomyTableProps) {
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
    const { error } = await supabase
      .from('media_lines')
      .update({ destination_url: urlValue || null })
      .eq('id', lineId);

    if (error) {
      toast.error('Erro ao salvar URL');
    } else {
      toast.success('URL salva');
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
    if (!line.destination_url) {
      toast.error('URL de destino não definida');
      return;
    }

    const utmParams = {
      utm_source: getUtmSource(line),
      utm_medium: getUtmMedium(line),
      utm_campaign: line.utm_campaign || buildUtmCampaign(line),
      utm_term: line.utm_term || '',
      utm_content: line.utm_content || '',
    };

    const fullUrl = buildUrlWithUTM(line.destination_url, utmParams);
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10"></TableHead>
            <TableHead className="w-24">Código</TableHead>
            <TableHead>Veículo / Canal</TableHead>
            <TableHead className="w-32">utm_source</TableHead>
            <TableHead className="w-32">utm_medium</TableHead>
            <TableHead className="min-w-[200px]">utm_campaign</TableHead>
            <TableHead className="w-32">utm_term</TableHead>
            <TableHead className="min-w-[200px]">URL de destino</TableHead>
            <TableHead className="w-24 text-center">Validado</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((line) => {
            const hasCreatives = line.creatives.length > 0;
            const isExpanded = expandedRows.has(line.id);
            const utmCampaign = line.utm_campaign || buildUtmCampaign(line);

            return (
              <>
                <TableRow key={line.id} className="hover:bg-muted/30">
                  <TableCell className="p-2">
                    {hasCreatives && (
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
                      <code className="text-xs px-1.5 py-0.5 bg-muted rounded truncate max-w-[180px]" title={utmCampaign}>
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
                          className="h-6 text-xs w-24"
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
                    {editingUrl === line.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={urlValue}
                          onChange={(e) => setUrlValue(e.target.value)}
                          className="h-6 text-xs"
                          placeholder="https://..."
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
                          className="h-6 text-xs px-2 truncate max-w-[150px]"
                          onClick={() => {
                            setEditingUrl(line.id);
                            setUrlValue(line.destination_url || '');
                          }}
                        >
                          {line.destination_url ? (
                            <span className="truncate">{line.destination_url}</span>
                          ) : (
                            <span className="text-muted-foreground">+ URL</span>
                          )}
                        </Button>
                        {line.destination_url && (
                          <a href={line.destination_url} target="_blank" rel="noopener noreferrer">
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
                          disabled={!line.destination_url}
                          title={!line.destination_url ? 'Defina a URL de destino primeiro' : 'Validar UTM'}
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
  );
}
