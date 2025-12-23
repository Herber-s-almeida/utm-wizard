import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Plus, 
  Loader2,
  Settings2,
  Download,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  MediaPlan, 
  MediaLine, 
  MediaCreative,
  MediaLineMonthlyBudget,
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
import { EditableHierarchyCard } from '@/components/media-plan/EditableHierarchyCard';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, Subdivision, Moment, FunnelStage } from '@/hooks/useConfigData';
import { exportMediaPlanToXlsx } from '@/utils/exportToXlsx';
import { useStatuses } from '@/hooks/useStatuses';
import { format, eachMonthOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BudgetAllocation } from '@/hooks/useMediaPlanWizard';
import { FunnelVisualization } from '@/components/media-plan/FunnelVisualization';

interface BudgetDistribution {
  id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
}

export default function MediaPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plan, setPlan] = useState<MediaPlan | null>(null);
  const [lines, setLines] = useState<MediaLine[]>([]);
  const [creatives, setCreatives] = useState<Record<string, MediaCreative[]>>({});
  const [budgetDistributions, setBudgetDistributions] = useState<BudgetDistribution[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, MediaLineMonthlyBudget[]>>({});
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<MediaLine | null>(null);
  const [editInitialStep, setEditInitialStep] = useState<string | undefined>(undefined);
  const [wizardPrefill, setWizardPrefill] = useState<{
    subdivisionId?: string;
    momentId?: string;
    funnelStageId?: string;
  } | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<MediaLine | null>(null);
  const [filteredLines, setFilteredLines] = useState<MediaLine[]>([]);

  // Library data for display
  const subdivisions = useSubdivisions();
  const moments = useMoments();
  const funnelStages = useFunnelStages();
  const mediums = useMediums();
  const vehicles = useVehicles();
  const channels = useChannels();
  const targets = useTargets();
  const statuses = useStatuses();

  useEffect(() => {
    if (user?.id && id) {
      fetchData();
    }
  }, [user?.id, id]);

  // Open wizard if query param is set
  useEffect(() => {
    if (searchParams.get('openWizard') === 'true') {
      setWizardOpen(true);
      // Remove the query param to avoid re-opening on refresh
      searchParams.delete('openWizard');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchData = async () => {
    if (!user?.id || !id) return;
    
    try {
      const { data: planData, error: planError } = await supabase
        .from('media_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
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

      // Fetch budget distributions
      const { data: distributionsData, error: distError } = await supabase
        .from('plan_budget_distributions')
        .select('*')
        .eq('media_plan_id', id);
      
      if (!distError && distributionsData) {
        setBudgetDistributions(distributionsData);
      }

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

        // Fetch monthly budgets for all lines
        const { data: monthlyData, error: monthlyError } = await supabase
          .from('media_line_monthly_budgets')
          .select('*')
          .in('media_line_id', linesList.map(l => l.id))
          .order('month_date', { ascending: true });

        if (!monthlyError && monthlyData) {
          const groupedMonthly: Record<string, MediaLineMonthlyBudget[]> = {};
          monthlyData.forEach((m: MediaLineMonthlyBudget) => {
            if (!groupedMonthly[m.media_line_id]) groupedMonthly[m.media_line_id] = [];
            groupedMonthly[m.media_line_id].push(m);
          });
          setMonthlyBudgets(groupedMonthly);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
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

  // Get plan hierarchy options from budget distributions
  const getPlanHierarchyOptions = () => {
    const subdivisionDists = budgetDistributions.filter(d => d.distribution_type === 'subdivision');
    const momentDists = budgetDistributions.filter(d => d.distribution_type === 'moment');
    const funnelDists = budgetDistributions.filter(d => d.distribution_type === 'funnel_stage');

    // Build subdivision options
    const planSubdivisions: { id: string | null; name: string }[] = subdivisionDists.length === 0
      ? [{ id: null, name: 'Geral' }]
      : subdivisionDists.map(d => ({
          id: d.reference_id,
          name: (subdivisions.data || []).find(s => s.id === d.reference_id)?.name || 'Geral'
        }));

    // Build moment options
    const planMoments: { id: string | null; name: string }[] = momentDists.length === 0
      ? [{ id: null, name: 'Geral' }]
      : momentDists.map(d => ({
          id: d.reference_id,
          name: (moments.data || []).find(m => m.id === d.reference_id)?.name || 'Geral'
        }));

    // Build funnel stage options
    const planFunnelStages: { id: string | null; name: string }[] = funnelDists.length === 0
      ? [{ id: null, name: 'Geral' }]
      : funnelDists.map(d => ({
          id: d.reference_id,
          name: (funnelStages.data || []).find(f => f.id === d.reference_id)?.name || 'Geral'
        }));

    return { planSubdivisions, planMoments, planFunnelStages };
  };

  const { planSubdivisions, planMoments, planFunnelStages } = getPlanHierarchyOptions();

  // Build hierarchy data for EditableHierarchyCard
  const hierarchyData = useMemo(() => {
    const getSubdivisionName = (refId: string | null): string => {
      if (!refId) return 'Geral';
      const found = (subdivisions.data || []).find(s => s.id === refId);
      return found?.name || 'Geral';
    };

    const getMomentName = (refId: string | null): string => {
      if (!refId) return 'Geral';
      const found = (moments.data || []).find(m => m.id === refId);
      return found?.name || 'Geral';
    };

    const getFunnelStageName = (refId: string | null): string => {
      if (!refId) return 'Geral';
      const found = (funnelStages.data || []).find(f => f.id === refId);
      return found?.name || 'Geral';
    };

    const subdivisionDists = budgetDistributions.filter(d => d.distribution_type === 'subdivision');
    const momentDists = budgetDistributions.filter(d => d.distribution_type === 'moment');
    const funnelDists = budgetDistributions.filter(d => d.distribution_type === 'funnel_stage');

    if (subdivisionDists.length === 0) {
      return [];
    }

    return subdivisionDists.map(subDist => {
      const subRefId = subDist.reference_id;
      const subName = getSubdivisionName(subRefId);
      
      // Get lines for this subdivision
      const subLines = lines.filter(l => 
        (subRefId === null && !l.subdivision_id) || l.subdivision_id === subRefId
      );
      const subAllocated = subLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);

      // Get moments for this subdivision
      const subMomentDists = momentDists.filter(m => m.parent_distribution_id === subDist.id);

      const momentNodes = subMomentDists.length === 0
        ? [{
            moment: { 
              id: null as string | null, 
              distId: 'none', 
              name: 'Geral', 
              planned: subDist.amount, 
              percentage: 100,
              parentDistId: subDist.id
            },
            momentAllocated: subAllocated,
            funnelStages: [{
              funnelStage: { 
                id: null as string | null, 
                distId: 'none', 
                name: 'Geral', 
                planned: subDist.amount, 
                percentage: 100,
                parentDistId: 'none'
              },
              funnelStageAllocated: subAllocated,
            }],
          }]
        : subMomentDists.map(momDist => {
            const momRefId = momDist.reference_id;
            const momName = getMomentName(momRefId);
            
            const momLines = subLines.filter(l => 
              (momRefId === null && !l.moment_id) || l.moment_id === momRefId
            );
            const momAllocated = momLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);

            const momFunnelDists = funnelDists.filter(f => f.parent_distribution_id === momDist.id);

            const funnelNodes = momFunnelDists.length === 0
              ? [{
                  funnelStage: { 
                    id: null as string | null, 
                    distId: 'none', 
                    name: 'Geral', 
                    planned: momDist.amount, 
                    percentage: 100,
                    parentDistId: momDist.id
                  },
                  funnelStageAllocated: momAllocated,
                }]
              : momFunnelDists.map(funDist => {
                  const funRefId = funDist.reference_id;
                  const funName = getFunnelStageName(funRefId);
                  const funLines = momLines.filter(l => 
                    (funRefId === null && !l.funnel_stage_id) || l.funnel_stage_id === funRefId
                  );
                  const funAllocated = funLines.reduce((acc, l) => acc + (Number(l.budget) || 0), 0);
                  
                  return {
                    funnelStage: { 
                      id: funRefId, 
                      distId: funDist.id, 
                      name: funName, 
                      planned: funDist.amount, 
                      percentage: funDist.percentage,
                      parentDistId: momDist.id
                    },
                    funnelStageAllocated: funAllocated,
                  };
                });

            return {
              moment: { 
                id: momRefId, 
                distId: momDist.id, 
                name: momName, 
                planned: momDist.amount, 
                percentage: momDist.percentage,
                parentDistId: subDist.id
              },
              momentAllocated: momAllocated,
              funnelStages: funnelNodes,
            };
          });

      return {
        subdivision: { 
          id: subRefId, 
          distId: subDist.id, 
          name: subName, 
          planned: subDist.amount, 
          percentage: subDist.percentage 
        },
        subdivisionAllocated: subAllocated,
        moments: momentNodes,
      };
    });
  }, [lines, budgetDistributions, subdivisions.data, moments.data, funnelStages.data]);

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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => exportMediaPlanToXlsx({
                plan,
                lines,
                creatives,
                subdivisions: subdivisions.data || [],
                moments: moments.data || [],
                funnelStages: funnelStages.data || [],
                mediums: mediums.data || [],
                vehicles: vehicles.data || [],
                channels: channels.data || [],
                targets: targets.data || [],
                statuses: statuses.data || [],
              })} 
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar XLSX
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/media-plans/${id}/edit`)} 
              className="gap-2"
            >
              <Settings2 className="w-4 h-4" />
              Editar Plano
            </Button>
            <Button onClick={() => setWizardOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Linha
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Orçamento do Plano</div>
              <div className="text-2xl font-bold font-display">
                {formatCurrency(Number(plan.total_budget))}
              </div>
            </CardContent>
          </Card>
          <TooltipProvider>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  Orçamento Alocado
                  {totalLinesBudget > Number(plan.total_budget) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="w-4 h-4 text-destructive animate-pulse cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Orçamento alocado excede o planejado!</p>
                        <p className="font-bold">Excedente: {formatCurrency(totalLinesBudget - Number(plan.total_budget))}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="text-2xl font-bold font-display">
                  {formatCurrency(totalLinesBudget)}
                </div>
              </CardContent>
            </Card>
          </TooltipProvider>
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Data de Início
              </div>
              <div className="text-xl font-bold font-display">
                {formatDate(plan.start_date)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Data de Término
              </div>
              <div className="text-xl font-bold font-display">
                {formatDate(plan.end_date)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editable Hierarchy Card */}
        {hierarchyData.length > 0 && (
          <EditableHierarchyCard
            planId={plan.id}
            planName={plan.name}
            totalBudget={Number(plan.total_budget) || 0}
            budgetDistributions={budgetDistributions}
            hierarchyData={hierarchyData}
            onDistributionsUpdated={fetchData}
          />
        )}

        {/* Funnel Visualization - Show only if there are custom funnel stages */}
        {(() => {
          // Check if there are non-default funnel stages
          const funnelDists = budgetDistributions.filter(d => d.distribution_type === 'funnel_stage');
          const hasCustomFunnel = funnelDists.length > 0 && funnelDists.some(d => d.reference_id !== null);
          
          if (!hasCustomFunnel) return null;

          // Build funnel stages from budget distributions for filtered lines
          const funnelStagesForViz: BudgetAllocation[] = funnelDists
            .filter(d => d.reference_id !== null)
            .map(d => {
              const stage = (funnelStages.data || []).find(f => f.id === d.reference_id);
              // Calculate allocated from filtered lines
              const allocated = filteredLines
                .filter(l => l.funnel_stage_id === d.reference_id)
                .reduce((acc, l) => acc + Number(l.budget || 0), 0);
              
              return {
                id: d.reference_id || 'geral',
                name: stage?.name || 'Geral',
                percentage: Number(plan.total_budget) > 0 ? (allocated / Number(plan.total_budget)) * 100 : 0,
                amount: allocated,
              };
            })
            .filter(s => s.amount > 0);

          if (funnelStagesForViz.length === 0) return null;

          const totalAllocated = funnelStagesForViz.reduce((acc, s) => acc + s.amount, 0);

          return (
            <FunnelVisualization
              funnelStages={funnelStagesForViz}
              parentBudget={totalAllocated}
              parentName="Linhas Filtradas"
              onEdit={() => {}}
            />
          );
        })()}

        {/* Temporal Distribution Chart */}
        {plan.start_date && plan.end_date && (
          <Card className="border border-border/50 bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold">Distribuição Temporal</h3>
              </div>
              {(() => {
                // Calculate monthly sums from filtered lines monthly budgets
                const planMonths = eachMonthOfInterval({
                  start: parseISO(plan.start_date!),
                  end: parseISO(plan.end_date!),
                });

                const monthlyTotals = planMonths.map(monthDate => {
                  const monthStr = format(monthDate, 'yyyy-MM-01');
                  let total = 0;
                  
                  filteredLines.forEach(line => {
                    const lineBudgets = monthlyBudgets[line.id] || [];
                    const found = lineBudgets.find(b => b.month_date === monthStr);
                    if (found) {
                      total += Number(found.amount) || 0;
                    }
                  });

                  return {
                    month: format(monthDate, 'MMM/yy', { locale: ptBR }),
                    amount: total,
                  };
                });

                const maxAmount = Math.max(...monthlyTotals.map(m => m.amount), 1);

                return (
                  <div className="flex items-end gap-1 h-40 bg-muted/20 rounded-lg p-2">
                    {monthlyTotals.map((month, index) => {
                      const height = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                      return (
                        <TooltipProvider key={index}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1 flex flex-col items-center justify-end h-full cursor-help">
                                <div className="text-center mb-1">
                                  <span className="text-[8px] text-muted-foreground font-medium block">
                                    {month.amount > 0 ? `${((month.amount / monthlyTotals.reduce((a, b) => a + b.amount, 0)) * 100).toFixed(0)}%` : '0%'}
                                  </span>
                                </div>
                                <div 
                                  className="w-full bg-primary rounded-t transition-all duration-300 min-h-[4px]"
                                  style={{ height: `${Math.max(height, 2)}%` }}
                                />
                                <span className="text-[9px] text-muted-foreground text-center mt-1 whitespace-nowrap overflow-hidden max-w-full truncate">
                                  {month.month}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">{month.month}</p>
                              <p>{formatCurrency(month.amount)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Hierarchical Media Table */}
        <HierarchicalMediaTable
          plan={plan}
          lines={lines}
          creatives={creatives}
          budgetDistributions={budgetDistributions}
          monthlyBudgets={monthlyBudgets}
          mediums={mediums.data || []}
          vehicles={vehicles.data || []}
          channels={channels.data || []}
          targets={targets.data || []}
          subdivisions={subdivisions.data || []}
          moments={moments.data || []}
          funnelStages={funnelStages.data || []}
          statuses={statuses.data || []}
          onEditLine={(line, initialStep) => {
            setEditingLine(line);
            setEditInitialStep(initialStep);
            setWizardOpen(true);
          }}
          onDeleteLine={(line) => {
            setLineToDelete(line);
            setDeleteDialogOpen(true);
          }}
          onAddLine={(prefill) => {
            setEditingLine(null);
            setEditInitialStep(undefined);
            setWizardPrefill(prefill);
            setWizardOpen(true);
          }}
          onUpdateLine={handleUpdateLine}
          onUpdateMonthlyBudgets={fetchData}
          onFilteredLinesChange={setFilteredLines}
        />
      </div>

      {/* Media Line Wizard */}
      {plan && (
        <MediaLineWizard
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open) {
              setEditingLine(null);
              setEditInitialStep(undefined);
              setWizardPrefill(undefined);
            }
          }}
          plan={plan}
          onComplete={fetchData}
          planSubdivisions={planSubdivisions}
          planMoments={planMoments}
          planFunnelStages={planFunnelStages}
          editingLine={editingLine}
          initialStep={editInitialStep as any}
          prefillData={wizardPrefill}
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
