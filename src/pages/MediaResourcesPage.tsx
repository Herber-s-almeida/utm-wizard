import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Image, FileText, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface FormatCreativeType {
  id: string;
  name: string;
  specifications: {
    id: string;
    name: string;
    has_duration: boolean | null;
    duration_value: number | null;
    duration_unit: string | null;
    max_weight: number | null;
    weight_unit: string | null;
    dimensions: {
      width: number;
      height: number;
      unit: string;
      description: string | null;
    }[];
    extensions: {
      name: string;
    }[];
    copy_fields: {
      name: string;
      max_characters: number | null;
      observation: string | null;
    }[];
  }[];
}

interface MediaCreativeWithDetails {
  id: string;
  name: string;
  creative_id: string | null;
  copy_text: string | null;
  notes: string | null;
  format_id: string | null;
  media_line_id: string;
  created_at: string;
  format: {
    id: string;
    name: string;
  } | null;
  media_line: {
    id: string;
    platform: string;
    line_code: string | null;
    funnel_stage: string | null;
    subdivision: { name: string } | null;
    moment: { name: string } | null;
    medium: { name: string } | null;
    vehicle: { name: string } | null;
    channel: { name: string } | null;
    target: { name: string } | null;
    funnel_stage_ref: { name: string } | null;
  } | null;
  format_details?: FormatCreativeType[];
}

function SpecificationsCell({ formatDetails }: { formatDetails?: FormatCreativeType[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!formatDetails || formatDetails.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const allSpecs: {
    typeName: string;
    specName: string;
    dimensions: string;
    extensions: string;
    duration: string;
    weight: string;
    copyFields: string;
  }[] = [];

  formatDetails.forEach(type => {
    type.specifications.forEach(spec => {
      const dimensions = spec.dimensions
        .map(d => `${d.width}x${d.height}${d.unit}${d.description ? ` (${d.description})` : ''}`)
        .join(', ') || '—';
      
      const extensions = spec.extensions.map(e => e.name).join(', ') || '—';
      
      const duration = spec.has_duration && spec.duration_value
        ? `${spec.duration_value}${spec.duration_unit || 's'}`
        : '—';
      
      const weight = spec.max_weight
        ? `${spec.max_weight}${spec.weight_unit || 'KB'}`
        : '—';
      
      const copyFields = spec.copy_fields
        .map(cf => `${cf.name}${cf.max_characters ? ` (${cf.max_characters} chars)` : ''}`)
        .join(', ') || '—';

      allSpecs.push({
        typeName: type.name,
        specName: spec.name,
        dimensions,
        extensions,
        duration,
        weight,
        copyFields,
      });
    });
  });

  if (allSpecs.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {allSpecs.length} especificação(ões)
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {allSpecs.map((spec, idx) => (
          <div key={idx} className="text-xs p-2 bg-muted/50 rounded space-y-1">
            <div className="font-medium">{spec.typeName} › {spec.specName}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span>Dimensões: {spec.dimensions}</span>
              <span>Extensões: {spec.extensions}</span>
              <span>Duração: {spec.duration}</span>
              <span>Peso máx: {spec.weight}</span>
              {spec.copyFields !== '—' && (
                <span className="col-span-2">Copy: {spec.copyFields}</span>
              )}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function MediaResourcesPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Fetch media plan details
  const { data: mediaPlan, isLoading: loadingPlan } = useQuery({
    queryKey: ['media-plan', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_plans')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Fetch all creatives for this plan's lines with full details
  const { data: creatives, isLoading: loadingCreatives } = useQuery({
    queryKey: ['media-resources', id],
    queryFn: async () => {
      // First get all media lines for this plan
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select(`
          id,
          platform,
          line_code,
          funnel_stage,
          subdivision:plan_subdivisions(name),
          moment:moments(name),
          medium:mediums(name),
          vehicle:vehicles(name),
          channel:channels(name),
          target:targets(name),
          funnel_stage_ref:funnel_stages(name)
        `)
        .eq('media_plan_id', id!);

      if (linesError) throw linesError;
      if (!lines || lines.length === 0) return [];

      const lineIds = lines.map(l => l.id);

      // Get all creatives for these lines
      const { data: creativesData, error: creativesError } = await supabase
        .from('media_creatives')
        .select(`
          id,
          name,
          creative_id,
          copy_text,
          notes,
          format_id,
          media_line_id,
          created_at,
          format:formats(id, name)
        `)
        .in('media_line_id', lineIds)
        .order('created_at', { ascending: false });

      if (creativesError) throw creativesError;

      // Get format details (creative types with specifications)
      const formatIds = [...new Set((creativesData || []).map(c => c.format_id).filter(Boolean))] as string[];
      
      let formatCreativeTypesMap: Record<string, FormatCreativeType[]> = {};
      
      if (formatIds.length > 0) {
        // Get creative types for these formats
        const { data: creativeTypes } = await supabase
          .from('format_creative_types')
          .select(`
            id,
            name,
            format_id
          `)
          .in('format_id', formatIds);

        if (creativeTypes && creativeTypes.length > 0) {
          const typeIds = creativeTypes.map(t => t.id);
          
          // Get specifications for these creative types
          const { data: specs } = await supabase
            .from('creative_type_specifications')
            .select(`
              id,
              name,
              creative_type_id,
              has_duration,
              duration_value,
              duration_unit,
              max_weight,
              weight_unit
            `)
            .in('creative_type_id', typeIds);

          // Get dimensions
          const specIds = specs?.map(s => s.id) || [];
          const { data: dimensions } = await supabase
            .from('specification_dimensions')
            .select('id, specification_id, width, height, unit, description')
            .in('specification_id', specIds);

          // Get extensions
          const { data: extensionsData } = await supabase
            .from('specification_extensions')
            .select('id, specification_id, extension_id, extension:file_extensions(name)')
            .in('specification_id', specIds);

          // Get copy fields
          const { data: copyFields } = await supabase
            .from('specification_copy_fields')
            .select('id, specification_id, name, max_characters, observation')
            .in('specification_id', specIds);

          // Build the map
          creativeTypes.forEach(type => {
            const formatId = type.format_id;
            if (!formatCreativeTypesMap[formatId]) {
              formatCreativeTypesMap[formatId] = [];
            }
            
            const typeSpecs = (specs || [])
              .filter(s => s.creative_type_id === type.id)
              .map(spec => ({
                id: spec.id,
                name: spec.name,
                has_duration: spec.has_duration,
                duration_value: spec.duration_value,
                duration_unit: spec.duration_unit,
                max_weight: spec.max_weight,
                weight_unit: spec.weight_unit,
                dimensions: (dimensions || [])
                  .filter(d => d.specification_id === spec.id)
                  .map(d => ({
                    width: d.width,
                    height: d.height,
                    unit: d.unit,
                    description: d.description,
                  })),
                extensions: (extensionsData || [])
                  .filter(e => e.specification_id === spec.id)
                  .map(e => ({ name: (e.extension as any)?.name || '' })),
                copy_fields: (copyFields || [])
                  .filter(cf => cf.specification_id === spec.id)
                  .map(cf => ({
                    name: cf.name,
                    max_characters: cf.max_characters,
                    observation: cf.observation,
                  })),
              }));

            formatCreativeTypesMap[formatId].push({
              id: type.id,
              name: type.name,
              specifications: typeSpecs,
            });
          });
        }
      }

      // Map creatives with line details and format details
      return (creativesData || []).map(creative => ({
        ...creative,
        media_line: lines.find(l => l.id === creative.media_line_id),
        format_details: creative.format_id ? formatCreativeTypesMap[creative.format_id] : undefined,
      })) as MediaCreativeWithDetails[];
    },
    enabled: !!id && !!user,
  });

  const isLoading = loadingPlan || loadingCreatives;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={`/media-plans/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Recursos de Mídia</h1>
            {mediaPlan && (
              <p className="text-muted-foreground text-sm">
                Plano: {mediaPlan.name}
              </p>
            )}
          </div>
          <Link to={`/media-plans/${id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver Plano
            </Button>
          </Link>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Criativos Solicitados
            </CardTitle>
            <CardDescription>
              Lista de todos os criativos vinculados às linhas de mídia deste plano.
              Compartilhe esta página com o time criativo para produção das peças.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !creatives || creatives.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum criativo cadastrado neste plano.</p>
                <p className="text-sm mt-1">
                  Adicione criativos às linhas de mídia no plano.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">ID Criativo</TableHead>
                      <TableHead className="whitespace-nowrap">Subdivisão</TableHead>
                      <TableHead className="whitespace-nowrap">Momento</TableHead>
                      <TableHead className="whitespace-nowrap">Fase</TableHead>
                      <TableHead className="whitespace-nowrap">Código</TableHead>
                      <TableHead className="whitespace-nowrap">Meio</TableHead>
                      <TableHead className="whitespace-nowrap">Veículo</TableHead>
                      <TableHead className="whitespace-nowrap">Canal</TableHead>
                      <TableHead className="whitespace-nowrap">Segmentação</TableHead>
                      <TableHead className="whitespace-nowrap">Formato</TableHead>
                      <TableHead className="whitespace-nowrap">Mensagem</TableHead>
                      <TableHead className="whitespace-nowrap">Observações</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[200px]">Especificações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatives.map((creative) => (
                      <TableRow key={creative.id}>
                        <TableCell className="font-mono text-xs">
                          <Badge variant="outline" className="font-mono">
                            {creative.creative_id || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.media_line?.subdivision?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.media_line?.moment?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.media_line?.funnel_stage_ref?.name || 
                           (creative.media_line?.funnel_stage === 'top' ? 'Topo' : 
                            creative.media_line?.funnel_stage === 'middle' ? 'Meio' : 
                            creative.media_line?.funnel_stage === 'bottom' ? 'Fundo' : '—')}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {creative.media_line?.line_code || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.media_line?.medium?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.media_line?.vehicle?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.media_line?.channel?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.media_line?.target?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.format?.name ? (
                            <Badge variant="secondary">{creative.format.name}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-sm line-clamp-2">
                            {creative.copy_text || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {creative.notes || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <SpecificationsCell formatDetails={creative.format_details} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {creatives && creatives.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{creatives.length}</div>
                <p className="text-xs text-muted-foreground">Total de Criativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {creatives.filter(c => c.format_id).length}
                </div>
                <p className="text-xs text-muted-foreground">Com Formato Definido</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {new Set(creatives.map(c => c.format?.name).filter(Boolean)).size}
                </div>
                <p className="text-xs text-muted-foreground">Formatos Diferentes</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
