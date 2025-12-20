import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Plus, 
  Loader2, 
  Trash2, 
  Copy,
  Check,
  Settings,
  Calendar,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  MediaPlan, 
  MediaLine, 
  MediaCreative,
  FunnelStage,
  FUNNEL_STAGES,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/types/media';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CreativesManager } from '@/components/media/CreativesManager';
import { MediaLineWizard } from '@/components/media-plan/MediaLineWizard';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets } from '@/hooks/useConfigData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MediaPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<MediaPlan | null>(null);
  const [lines, setLines] = useState<MediaLine[]>([]);
  const [creatives, setCreatives] = useState<Record<string, MediaCreative[]>>({});
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<MediaLine | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  // Library data for display
  const subdivisions = useSubdivisions();
  const moments = useMoments();
  const funnelStages = useFunnelStages();
  const mediums = useMediums();
  const vehicles = useVehicles();
  const channels = useChannels();
  const targets = useTargets();

  useEffect(() => {
    if (user && id) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    try {
      const { data: planData, error: planError } = await supabase
        .from('media_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (planError) throw planError;
      if (!planData) {
        toast.error('Plano não encontrado');
        navigate('/media-plans');
        return;
      }

      const { data: linesData, error: linesError } = await supabase
        .from('media_lines')
        .select('*')
        .eq('media_plan_id', id)
        .order('created_at', { ascending: true });

      if (linesError) throw linesError;

      const linesList = (linesData || []) as MediaLine[];
      setPlan(planData as MediaPlan);
      setLines(linesList);

      // Fetch creatives for all lines
      if (linesList.length > 0) {
        const { data: creativesData, error: creativesError } = await supabase
          .from('media_creatives')
          .select('*')
          .in('media_line_id', linesList.map(l => l.id));

        if (!creativesError && creativesData) {
          const grouped: Record<string, MediaCreative[]> = {};
          creativesData.forEach((c: MediaCreative) => {
            if (!grouped[c.media_line_id]) grouped[c.media_line_id] = [];
            grouped[c.media_line_id].push(c);
          });
          setCreatives(grouped);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar plano');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLine = async () => {
    if (!lineToDelete) return;

    try {
      const { error } = await supabase
        .from('media_lines')
        .delete()
        .eq('id', lineToDelete.id);

      if (error) throw error;

      setLines(lines.filter(l => l.id !== lineToDelete.id));
      toast.success('Linha excluída');
    } catch (error) {
      console.error('Error deleting line:', error);
      toast.error('Erro ao excluir linha');
    } finally {
      setDeleteDialogOpen(false);
      setLineToDelete(null);
    }
  };

  const buildUtmUrl = (line: MediaLine) => {
    if (!line.destination_url) return null;

    const params = new URLSearchParams();
    if (line.utm_source) params.append('utm_source', line.utm_source);
    if (line.utm_medium) params.append('utm_medium', line.utm_medium);
    if (line.utm_campaign) params.append('utm_campaign', line.utm_campaign);
    if (line.utm_content) params.append('utm_content', line.utm_content);
    if (line.utm_term) params.append('utm_term', line.utm_term);

    const separator = line.destination_url.includes('?') ? '&' : '?';
    return `${line.destination_url}${separator}${params.toString()}`;
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('URL copiada!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const toggleLineExpand = (lineId: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(lineId)) {
      newExpanded.delete(lineId);
    } else {
      newExpanded.add(lineId);
    }
    setExpandedLines(newExpanded);
  };

  const getLineDisplayInfo = (line: MediaLine) => {
    const subdivision = subdivisions.data?.find(s => s.id === line.subdivision_id);
    const moment = moments.data?.find(m => m.id === line.moment_id);
    const funnelStage = funnelStages.data?.find(f => f.id === line.funnel_stage_id);
    const medium = mediums.data?.find(m => m.id === line.medium_id);
    const vehicle = vehicles.data?.find(v => v.id === line.vehicle_id);
    const channel = channels.data?.find(c => c.id === line.channel_id);
    const target = targets.data?.find(t => t.id === line.target_id);

    // Fallback to old funnel_stage field
    const funnelInfo = funnelStage 
      ? { label: funnelStage.name, color: 'bg-primary/10 text-primary border-primary/30' }
      : FUNNEL_STAGES.find(s => s.value === line.funnel_stage) || FUNNEL_STAGES[0];

    return {
      subdivision,
      moment,
      funnelStage,
      funnelInfo,
      medium,
      vehicle,
      channel,
      target,
      displayName: vehicle?.name || line.platform || 'Sem veículo',
    };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!plan) return null;

  const totalLinesBudget = lines.reduce((acc, line) => acc + Number(line.budget || 0), 0);

  // Get existing selections for wizard context
  const existingSubdivisions = [...new Set(lines.map(l => l.subdivision_id).filter(Boolean))] as string[];
  const existingMoments = [...new Set(lines.map(l => l.moment_id).filter(Boolean))] as string[];
  const existingFunnelStages = [...new Set(lines.map(l => l.funnel_stage_id).filter(Boolean))] as string[];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/media-plans')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold">{plan.name}</h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status]}`}>
                  {STATUS_LABELS[plan.status]}
                </span>
              </div>
              <p className="text-muted-foreground">
                {plan.client || 'Sem cliente'} • {plan.campaign || 'Sem campanha'}
              </p>
            </div>
          </div>
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Linha
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Orçamento do Plano</div>
              <div className="text-2xl font-bold font-display">
                {formatCurrency(Number(plan.total_budget))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Distribuído nas Linhas</div>
              <div className="text-2xl font-bold font-display">
                {formatCurrency(totalLinesBudget)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Linhas de Mídia</div>
              <div className="text-2xl font-bold font-display">{lines.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total de Criativos</div>
              <div className="text-2xl font-bold font-display">
                {Object.values(creatives).reduce((acc, c) => acc + c.length, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Media Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Linhas de Mídia</CardTitle>
            <CardDescription>
              Gerencie as linhas de mídia, criativos e parâmetros UTM
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">Nenhuma linha de mídia</h3>
                <p className="text-muted-foreground mb-4">
                  Adicione linhas de mídia para detalhar seu plano
                </p>
                <Button onClick={() => setWizardOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Linha
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line, index) => {
                  const utmUrl = buildUtmUrl(line);
                  const lineInfo = getLineDisplayInfo(line);
                  const lineCreatives = creatives[line.id] || [];
                  const isExpanded = expandedLines.has(line.id);

                  return (
                    <motion.div
                      key={line.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Collapsible open={isExpanded} onOpenChange={() => toggleLineExpand(line.id)}>
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className={`px-2 py-1 rounded text-xs font-medium border ${lineInfo.funnelInfo.color}`}>
                                {lineInfo.funnelInfo.label}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{lineInfo.displayName}</div>
                                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                                  {lineInfo.subdivision && (
                                    <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                                      {lineInfo.subdivision.name}
                                    </span>
                                  )}
                                  {lineInfo.moment && (
                                    <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                                      {lineInfo.moment.name}
                                    </span>
                                  )}
                                  {lineInfo.channel && (
                                    <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                                      {lineInfo.channel.name}
                                    </span>
                                  )}
                                  {line.start_date && line.end_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(line.start_date), 'dd/MM', { locale: ptBR })} - {format(new Date(line.end_date), 'dd/MM', { locale: ptBR })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{formatCurrency(Number(line.budget))}</div>
                                <div className="text-xs text-muted-foreground">
                                  {lineCreatives.length} criativo{lineCreatives.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {utmUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(utmUrl);
                                    }}
                                  >
                                    {copiedUrl === utmUrl ? (
                                      <Check className="w-4 h-4 text-success" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLineToDelete(line);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-4 bg-muted/30 space-y-4">
                              {/* Line details summary */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                {lineInfo.subdivision && (
                                  <div>
                                    <span className="text-muted-foreground">Subdivisão:</span>{' '}
                                    <span className="font-medium">{lineInfo.subdivision.name}</span>
                                  </div>
                                )}
                                {lineInfo.moment && (
                                  <div>
                                    <span className="text-muted-foreground">Momento:</span>{' '}
                                    <span className="font-medium">{lineInfo.moment.name}</span>
                                  </div>
                                )}
                                {lineInfo.medium && (
                                  <div>
                                    <span className="text-muted-foreground">Meio:</span>{' '}
                                    <span className="font-medium">{lineInfo.medium.name}</span>
                                  </div>
                                )}
                                {lineInfo.target && (
                                  <div>
                                    <span className="text-muted-foreground">Target:</span>{' '}
                                    <span className="font-medium">{lineInfo.target.name}</span>
                                  </div>
                                )}
                              </div>

                              {/* UTM Preview */}
                              {utmUrl && (
                                <div className="p-3 bg-background rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                      <LinkIcon className="w-3 h-3" />
                                      URL com UTMs (gerada automaticamente)
                                    </Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs gap-1"
                                      onClick={() => copyToClipboard(utmUrl)}
                                    >
                                      <Copy className="w-3 h-3" />
                                      Copiar
                                    </Button>
                                  </div>
                                  <p className="text-xs break-all font-mono bg-muted p-2 rounded">
                                    {utmUrl}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {line.utm_source && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        source: {line.utm_source}
                                      </span>
                                    )}
                                    {line.utm_medium && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        medium: {line.utm_medium}
                                      </span>
                                    )}
                                    {line.utm_campaign && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        campaign: {line.utm_campaign}
                                      </span>
                                    )}
                                    {line.utm_content && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        content: {line.utm_content}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Creatives */}
                              <CreativesManager
                                mediaLineId={line.id}
                                userId={user?.id || ''}
                                creatives={lineCreatives}
                                onUpdate={fetchData}
                              />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Media Line Wizard */}
      {plan && (
        <MediaLineWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          plan={plan}
          onComplete={fetchData}
          existingSubdivisions={existingSubdivisions}
          existingMoments={existingMoments}
          existingFunnelStages={existingFunnelStages}
        />
      )}

      {/* Delete Line Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir linha de mídia</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta linha? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLine}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
