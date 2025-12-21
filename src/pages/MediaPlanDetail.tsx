import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Plus, 
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  MediaPlan, 
  MediaLine, 
  MediaCreative,
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
import { MediaLineWizard } from '@/components/media-plan/MediaLineWizard';
import { HierarchicalMediaTable } from '@/components/media-plan/HierarchicalMediaTable';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets } from '@/hooks/useConfigData';

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

  const handleUpdateLine = async (lineId: string, updates: Partial<MediaLine>) => {
    try {
      const { error } = await supabase
        .from('media_lines')
        .update(updates)
        .eq('id', lineId);

      if (error) throw error;

      setLines(lines.map(l => l.id === lineId ? { ...l, ...updates } : l));
      toast.success('Linha atualizada');
    } catch (error) {
      console.error('Error updating line:', error);
      toast.error('Erro ao atualizar linha');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

        {/* Hierarchical Media Table */}
        <HierarchicalMediaTable
          plan={plan}
          lines={lines}
          creatives={creatives}
          subdivisions={subdivisions.data || []}
          moments={moments.data || []}
          funnelStages={funnelStages.data || []}
          mediums={mediums.data || []}
          vehicles={vehicles.data || []}
          channels={channels.data || []}
          targets={targets.data || []}
          onEditLine={(line) => {
            // TODO: Open edit wizard
            console.log('Edit line', line);
          }}
          onDeleteLine={(line) => {
            setLineToDelete(line);
            setDeleteDialogOpen(true);
          }}
          onAddLine={() => setWizardOpen(true)}
          onUpdateLine={handleUpdateLine}
        />
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
