import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Link as LinkIcon,
  Copy,
  Check,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  MediaPlan, 
  MediaLine, 
  PLATFORMS, 
  FORMATS, 
  OBJECTIVES,
  STATUS_LABELS,
  STATUS_COLORS
} from '@/types/media';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export default function MediaPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<MediaPlan | null>(null);
  const [lines, setLines] = useState<MediaLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<MediaLine | null>(null);
  const [editingLine, setEditingLine] = useState<MediaLine | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const [lineForm, setLineForm] = useState({
    platform: '',
    format: '',
    objective: '',
    placement: '',
    start_date: '',
    end_date: '',
    budget: '',
    impressions: '',
    clicks: '',
    conversions: '',
    destination_url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
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

      setPlan(planData as MediaPlan);
      setLines((linesData || []) as MediaLine[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar plano');
    } finally {
      setLoading(false);
    }
  };

  const resetLineForm = () => {
    setLineForm({
      platform: '',
      format: '',
      objective: '',
      placement: '',
      start_date: plan?.start_date || '',
      end_date: plan?.end_date || '',
      budget: '',
      impressions: '',
      clicks: '',
      conversions: '',
      destination_url: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: plan?.campaign || '',
      utm_content: '',
      utm_term: '',
      notes: '',
    });
    setEditingLine(null);
  };

  const openLineDialog = (line?: MediaLine) => {
    if (line) {
      setEditingLine(line);
      setLineForm({
        platform: line.platform || '',
        format: line.format || '',
        objective: line.objective || '',
        placement: line.placement || '',
        start_date: line.start_date || '',
        end_date: line.end_date || '',
        budget: line.budget?.toString() || '',
        impressions: line.impressions?.toString() || '',
        clicks: line.clicks?.toString() || '',
        conversions: line.conversions?.toString() || '',
        destination_url: line.destination_url || '',
        utm_source: line.utm_source || '',
        utm_medium: line.utm_medium || '',
        utm_campaign: line.utm_campaign || '',
        utm_content: line.utm_content || '',
        utm_term: line.utm_term || '',
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

    setSaving(true);

    try {
      const lineData = {
        media_plan_id: id,
        user_id: user?.id,
        platform: lineForm.platform,
        format: lineForm.format || null,
        objective: lineForm.objective || null,
        placement: lineForm.placement || null,
        start_date: lineForm.start_date || null,
        end_date: lineForm.end_date || null,
        budget: lineForm.budget ? parseFloat(lineForm.budget) : 0,
        impressions: lineForm.impressions ? parseInt(lineForm.impressions) : 0,
        clicks: lineForm.clicks ? parseInt(lineForm.clicks) : 0,
        conversions: lineForm.conversions ? parseInt(lineForm.conversions) : 0,
        destination_url: lineForm.destination_url || null,
        utm_source: lineForm.utm_source || null,
        utm_medium: lineForm.utm_medium || null,
        utm_campaign: lineForm.utm_campaign || null,
        utm_content: lineForm.utm_content || null,
        utm_term: lineForm.utm_term || null,
        notes: lineForm.notes || null,
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

  const suggestUtmValues = () => {
    const platformMap: Record<string, { source: string; medium: string }> = {
      'Google Ads': { source: 'google', medium: 'cpc' },
      'Meta Ads': { source: 'facebook', medium: 'paid_social' },
      'LinkedIn Ads': { source: 'linkedin', medium: 'paid_social' },
      'TikTok Ads': { source: 'tiktok', medium: 'paid_social' },
      'Twitter/X Ads': { source: 'twitter', medium: 'paid_social' },
      'Pinterest Ads': { source: 'pinterest', medium: 'paid_social' },
      'Spotify Ads': { source: 'spotify', medium: 'audio' },
      'YouTube Ads': { source: 'youtube', medium: 'video' },
    };

    const suggestion = platformMap[lineForm.platform];
    if (suggestion) {
      setLineForm(prev => ({
        ...prev,
        utm_source: prev.utm_source || suggestion.source,
        utm_medium: prev.utm_medium || suggestion.medium,
        utm_campaign: prev.utm_campaign || plan?.campaign?.toLowerCase().replace(/\s+/g, '_') || '',
      }));
    }
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
        <div className="grid gap-4 md:grid-cols-3">
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
        </div>

        {/* Media Lines Table */}
        <Card>
          <CardHeader>
            <CardTitle>Linhas de Mídia</CardTitle>
            <CardDescription>
              Gerencie as linhas de mídia e seus parâmetros UTM
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead>Objetivo</TableHead>
                      <TableHead className="text-right">Investimento</TableHead>
                      <TableHead>UTM</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => {
                      const utmUrl = buildUtmUrl(line);
                      return (
                        <motion.tr
                          key={line.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <TableCell className="font-medium">{line.platform}</TableCell>
                          <TableCell>{line.format || '-'}</TableCell>
                          <TableCell>{line.objective || '-'}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(line.budget))}
                          </TableCell>
                          <TableCell>
                            {utmUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 h-8"
                                onClick={() => copyToClipboard(utmUrl)}
                              >
                                {copiedUrl === utmUrl ? (
                                  <Check className="w-3 h-3 text-success" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span className="max-w-[120px] truncate text-xs">
                                  {line.utm_source}/{line.utm_medium}
                                </span>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openLineDialog(line)}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setLineToDelete(line);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
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
              Configure os detalhes da linha e os parâmetros UTM
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium">Informações Básicas</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Plataforma *</Label>
                  <Select
                    value={lineForm.platform}
                    onValueChange={(value) => {
                      setLineForm({ ...lineForm, platform: value });
                    }}
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

                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Select
                    value={lineForm.objective}
                    onValueChange={(value) => setLineForm({ ...lineForm, objective: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map((o) => (
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
            </div>

            {/* UTM Parameters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Parâmetros UTM</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={suggestUtmValues}
                  className="gap-2"
                >
                  <LinkIcon className="w-3 h-3" />
                  Sugerir valores
                </Button>
              </div>

              <div className="space-y-2">
                <Label>URL de Destino</Label>
                <Input
                  placeholder="https://seusite.com/landing-page"
                  value={lineForm.destination_url}
                  onChange={(e) => setLineForm({ ...lineForm, destination_url: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>utm_source</Label>
                  <Input
                    placeholder="google, facebook, linkedin..."
                    value={lineForm.utm_source}
                    onChange={(e) => setLineForm({ ...lineForm, utm_source: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>utm_medium</Label>
                  <Input
                    placeholder="cpc, paid_social, display..."
                    value={lineForm.utm_medium}
                    onChange={(e) => setLineForm({ ...lineForm, utm_medium: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>utm_campaign</Label>
                  <Input
                    placeholder="nome_da_campanha"
                    value={lineForm.utm_campaign}
                    onChange={(e) => setLineForm({ ...lineForm, utm_campaign: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>utm_content</Label>
                  <Input
                    placeholder="banner_v1, video_30s..."
                    value={lineForm.utm_content}
                    onChange={(e) => setLineForm({ ...lineForm, utm_content: e.target.value })}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>utm_term</Label>
                  <Input
                    placeholder="palavra_chave (para Search)"
                    value={lineForm.utm_term}
                    onChange={(e) => setLineForm({ ...lineForm, utm_term: e.target.value })}
                  />
                </div>
              </div>

              {lineForm.destination_url && lineForm.utm_source && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">URL Final</Label>
                  <p className="text-sm break-all mt-1">
                    {`${lineForm.destination_url}${lineForm.destination_url.includes('?') ? '&' : '?'}utm_source=${lineForm.utm_source}&utm_medium=${lineForm.utm_medium}&utm_campaign=${lineForm.utm_campaign}${lineForm.utm_content ? `&utm_content=${lineForm.utm_content}` : ''}${lineForm.utm_term ? `&utm_term=${lineForm.utm_term}` : ''}`}
                  </p>
                </div>
              )}
            </div>

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
