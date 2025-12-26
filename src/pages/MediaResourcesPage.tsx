import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Image, FileText, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaCreativeWithDetails {
  id: string;
  name: string;
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
    funnel_stage: string | null;
    subdivision: { name: string } | null;
    moment: { name: string } | null;
    vehicle: { name: string } | null;
    channel: { name: string } | null;
  } | null;
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

  // Fetch all creatives for this plan's lines
  const { data: creatives, isLoading: loadingCreatives } = useQuery({
    queryKey: ['media-resources', id],
    queryFn: async () => {
      // First get all media lines for this plan
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select(`
          id,
          platform,
          funnel_stage,
          subdivision:plan_subdivisions(name),
          moment:moments(name),
          vehicle:vehicles(name),
          channel:channels(name)
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

      // Map creatives with line details
      return (creativesData || []).map(creative => ({
        ...creative,
        media_line: lines.find(l => l.id === creative.media_line_id),
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Criativo</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Veículo / Canal</TableHead>
                      <TableHead>Fase do Funil</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatives.map((creative) => (
                      <TableRow key={creative.id}>
                        <TableCell className="font-medium">
                          {creative.name}
                        </TableCell>
                        <TableCell>
                          {creative.format?.name ? (
                            <Badge variant="outline">{creative.format.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {creative.media_line?.platform || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {creative.media_line?.vehicle?.name && (
                              <span>{creative.media_line.vehicle.name}</span>
                            )}
                            {creative.media_line?.channel?.name && (
                              <span className="text-muted-foreground">
                                {' / '}
                                {creative.media_line.channel.name}
                              </span>
                            )}
                            {!creative.media_line?.vehicle?.name && !creative.media_line?.channel?.name && '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {creative.media_line?.funnel_stage ? (
                            <Badge variant="secondary" className="capitalize">
                              {creative.media_line.funnel_stage === 'top' && 'Topo'}
                              {creative.media_line.funnel_stage === 'middle' && 'Meio'}
                              {creative.media_line.funnel_stage === 'bottom' && 'Fundo'}
                            </Badge>
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
