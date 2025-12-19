import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
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
  PLATFORMS, 
  FORMATS, 
  FUNNEL_STAGES,
  OBJECTIVES_BY_FUNNEL,
  STATUS_LABELS,
  STATUS_COLORS,
  generateUtmParams
} from '@/types/media';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { FunnelStageSelector } from '@/components/media/FunnelStageSelector';
import { CreativesManager } from '@/components/media/CreativesManager';
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
  const [saving, setSaving] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<MediaLine | null>(null);
  const [editingLine, setEditingLine] = useState<MediaLine | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  const [lineForm, setLineForm] = useState({
    funnel_stage: 'top' as FunnelStage,
    platform: '',
    format: '',
    objective: '',
    placement: '',
    start_date: '',
    end_date: '',
    budget: '',
    destination_url: '',
    notes: '',
  });

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

  const resetLineForm = () => {
    setLineForm({
      funnel_stage: 'top',
      platform: '',
      format: '',
      objective: '',
      placement: '',
      start_date: plan?.start_date || '',
      end_date: plan?.end_date || '',
      budget: '',
      destination_url: '',
      notes: '',
    });
    setEditingLine(null);
  };

  const openLineDialog = (line?: MediaLine) => {
    if (line) {
      setEditingLine(line);
      setLineForm({
        funnel_stage: line.funnel_stage || 'top',
        platform: line.platform || '',
        format: line.format || '',
        objective: line.objective || '',
        placement: line.placement || '',
        start_date: line.start_date || '',
        end_date: line.end_date || '',
        budget: line.budget?.toString() || '',
        destination_url: line.destination_url || '',
        notes: line.notes || '',
      });
    } else {
      resetLineForm();
    }
    setLineDialogOpen(true);
  };

  const handleSaveLine = async () => {
    if (!lineForm.platform) {
      toast.error('Plataforma é obrigatória');
      return;
    }

    if (!lineForm.start_date || !lineForm.end_date) {
      toast.error('Datas de início e fim são obrigatórias');
      return;
    }

    setSaving(true);

    try {
      // Generate UTM params automatically
      const utmParams = plan ? generateUtmParams(plan, {
        platform: lineForm.platform,
        funnel_stage: lineForm.funnel_stage,
        format: lineForm.format,
      }) : {};

      const lineData = {
        media_plan_id: id,
        user_id: user?.id,
        funnel_stage: lineForm.funnel_stage,
        platform: lineForm.platform,
        format: lineForm.format || null,
        objective: lineForm.objective || null,
        placement: lineForm.placement || null,
        start_date: lineForm.start_date || null,
        end_date: lineForm.end_date || null,
        budget: lineForm.budget ? parseFloat(lineForm.budget) : 0,
        destination_url: lineForm.destination_url || null,
        notes: lineForm.notes || null,
        ...utmParams,
      };

      if (editingLine) {
        const { error } = await supabase
          .from('media_lines')
          .update(lineData)
          .eq('id', editingLine.id);

        if (error) throw error;
        toast.success('Linha atualizada!');
      } else {
        const { error } = await supabase
          .from('media_lines')
          .insert(lineData);

        if (error) throw error;
        toast.success('Linha adicionada!');
      }

      setLineDialogOpen(false);
      resetLineForm();
      fetchData();
    } catch (error) {
      console.error('Error saving line:', error);
      toast.error('Erro ao salvar linha');
    } finally {
      setSaving(false);
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

  const getFunnelStageInfo = (stage: FunnelStage) => {
    return FUNNEL_STAGES.find(s => s.value === stage) || FUNNEL_STAGES[0];
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
          <Button onClick={() => openLineDialog()} className="gap-2">
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
                <Button onClick={() => openLineDialog()} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Linha
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line, index) => {
                  const utmUrl = buildUtmUrl(line);
                  const stageInfo = getFunnelStageInfo(line.funnel_stage);
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
                              <div className={`px-2 py-1 rounded text-xs font-medium border ${stageInfo.color}`}>
                                {stageInfo.label}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{line.platform}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>{line.format || '-'}</span>
                                  {line.start_date && line.end_date && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(line.start_date), 'dd/MM', { locale: ptBR })} - {format(new Date(line.end_date), 'dd/MM', { locale: ptBR })}
                                      </span>
                                    </>
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
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLineDialog(line);
                                  }}
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
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

      {/* Add/Edit Line Dialog */}
      <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLine ? 'Editar Linha de Mídia' : 'Nova Linha de Mídia'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da linha. Os parâmetros UTM serão gerados automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Funnel Stage - First Step */}
            <FunnelStageSelector
              value={lineForm.funnel_stage}
              onChange={(stage) => {
                setLineForm({ 
                  ...lineForm, 
                  funnel_stage: stage,
                  objective: '' // Reset objective when funnel changes
                });
              }}
            />

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={lineForm.start_date}
                  onChange={(e) => setLineForm({ ...lineForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Fim *</Label>
                <Input
                  type="date"
                  value={lineForm.end_date}
                  onChange={(e) => setLineForm({ ...lineForm, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Platform & Format */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plataforma *</Label>
                <Select
                  value={lineForm.platform}
                  onValueChange={(value) => setLineForm({ ...lineForm, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={lineForm.format}
                  onValueChange={(value) => setLineForm({ ...lineForm, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Objective based on funnel stage */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Objetivo da Plataforma</Label>
                <Select
                  value={lineForm.objective}
                  onValueChange={(value) => setLineForm({ ...lineForm, objective: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES_BY_FUNNEL[lineForm.funnel_stage].map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Investimento (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={lineForm.budget}
                  onChange={(e) => setLineForm({ ...lineForm, budget: e.target.value })}
                />
              </div>
            </div>

            {/* Destination URL */}
            <div className="space-y-2">
              <Label>URL de Destino</Label>
              <Input
                placeholder="https://seusite.com/landing-page"
                value={lineForm.destination_url}
                onChange={(e) => setLineForm({ ...lineForm, destination_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Os parâmetros UTM serão adicionados automaticamente com base no plano e plataforma.
              </p>
            </div>

            {/* UTM Preview */}
            {lineForm.destination_url && lineForm.platform && plan && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <Label className="text-xs text-muted-foreground">Prévia da URL Final</Label>
                {(() => {
                  const utmPreview = generateUtmParams(plan, {
                    platform: lineForm.platform,
                    funnel_stage: lineForm.funnel_stage,
                    format: lineForm.format,
                  });
                  const params = new URLSearchParams();
                  Object.entries(utmPreview).forEach(([key, value]) => {
                    if (value) params.append(key, value);
                  });
                  const separator = lineForm.destination_url.includes('?') ? '&' : '?';
                  return (
                    <p className="text-sm break-all font-mono">
                      {`${lineForm.destination_url}${separator}${params.toString()}`}
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Notas adicionais sobre esta linha..."
                value={lineForm.notes}
                onChange={(e) => setLineForm({ ...lineForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setLineDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLine} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingLine ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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