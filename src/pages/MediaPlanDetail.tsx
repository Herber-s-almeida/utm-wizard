import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Plus, 
  Settings2,
  Download,
  Calendar,
  AlertTriangle,
  Users,
  History,
  BarChart3,
  ChevronDown,
  HelpCircle,
  X,
  Bell
} from 'lucide-react';
import { LoadingPage } from '@/components/ui/loading-dots';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { StatusSelector } from '@/components/media-plan/StatusSelector';
import { HierarchicalMediaTable } from '@/components/media-plan/HierarchicalMediaTable';
import { EditableHierarchyCard } from '@/components/media-plan/EditableHierarchyCard';
import { MomentsTimeline } from '@/components/media-plan/MomentsTimeline';
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
import {
  AnimatedCollapsible,
  AnimatedCollapsibleContent,
  AnimatedCollapsibleTrigger,
} from '@/components/ui/animated-collapsible';
import { motion } from 'framer-motion';
import { FunnelVisualization } from '@/components/media-plan/FunnelVisualization';
import { RoleBadge } from '@/components/media-plan/RoleBadge';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { SaveVersionDropdownItem } from '@/components/media-plan/SaveVersionDropdownItem';
import { VersionHistoryDialog } from '@/components/media-plan/VersionHistoryDialog';
import { usePlanAlerts } from '@/hooks/usePlanAlerts';
import { AlertsSummaryCard } from '@/components/media-plan/AlertsSummaryCard';
import { PlanDetailSummaryCard } from '@/components/media-plan/PlanDetailSummaryCard';
import { ElementVisibilityMenu } from '@/components/media-plan/ElementVisibilityMenu';
import { usePlanElementsVisibility } from '@/hooks/usePlanElementsVisibility';
import { LineDetailsSummaryCard } from '@/components/media-plan/LineDetailsSummaryCard';
import { HierarchyLevel, DEFAULT_HIERARCHY_ORDER, getLevelLabel, getLevelLabelPlural } from '@/types/hierarchy';
import { buildHierarchyTree, flattenHierarchyTree, HierarchyTreeNode, FlatHierarchyRow, MediaLineRef } from '@/utils/hierarchyDataBuilder';
import { generateBudgetDistributionsFromLines } from '@/utils/generateBudgetDistributions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BudgetDistribution {
  id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export default function MediaPlanDetail() {
  const { id: identifier } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plan, setPlan] = useState<MediaPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
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
  // Team dialog removed - managed at environment level now
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [filteredLines, setFilteredLines] = useState<MediaLine[]>([]);
  const [filterByAlerts, setFilterByAlerts] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(false);
  const [isGeneratingHierarchy, setIsGeneratingHierarchy] = useState(false);

  // Library data for display
  const subdivisions = useSubdivisions();
  const moments = useMoments();
  const funnelStages = useFunnelStages();
  const mediums = useMediums();
  const vehicles = useVehicles();
  const channels = useChannels();
  const targets = useTargets();
  const statuses = useStatuses();
  
  // Environment-based permissions (replaces legacy usePlanRoles)
  const { canEdit: environmentCanEdit, isEnvironmentAdmin } = useEnvironment();
  const canEdit = environmentCanEdit('media_plans');
  const canManageTeam = false; // Deprecated - managed at environment level
  
  // Element visibility
  const { elements, toggleVisibility, hideElement, isVisible } = usePlanElementsVisibility(planId);

  // Reset state and fetch data when identifier changes (navigating between plans)
  useEffect(() => {
    if (user?.id && identifier) {
      // Reset state for new plan
      setLoading(true);
      setPlan(null);
      setPlanId(null);
      setLines([]);
      setFilteredLines([]);
      setCreatives({});
      setBudgetDistributions([]);
      setMonthlyBudgets({});
      
      fetchData();
    }
  }, [user?.id, identifier]);

  // Track previous line IDs to avoid unnecessary re-renders
  const prevLineIdsRef = useRef<string>('');
  
  // Initialize filteredLines with lines when lines change
  useEffect(() => {
    const currentIds = lines.map(l => l.id).sort().join(',');
    if (lines.length > 0 && currentIds !== prevLineIdsRef.current) {
      prevLineIdsRef.current = currentIds;
      setFilteredLines(lines);
    }
  }, [lines]);

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
    if (!user?.id || !identifier) return;
    
    try {
      // Check if identifier is a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      let query = supabase.from('media_plans').select('*');
      if (isUUID) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('slug', identifier);
      }
      
      const { data: planData, error: planError } = await query.maybeSingle();

      if (planError) throw planError;
      if (!planData) {
        toast.error('Plano não encontrado');
        navigate('/media-plans');
        return;
      }
      
      // Redirect from ID to slug if accessed via ID
      if (isUUID && planData.slug && identifier !== planData.slug) {
        navigate(`/media-plans/${planData.slug}`, { replace: true });
        return;
      }
      
      // Store the actual plan ID for subsequent queries
      const resolvedPlanId = planData.id;
      setPlanId(resolvedPlanId);
      setPlan(planData as MediaPlan);

      // Fetch lines and distributions in parallel (most critical data)
      const [linesResult, distributionsResult] = await Promise.all([
        supabase
          .from('media_lines')
          .select('*')
          .eq('media_plan_id', resolvedPlanId)
          .order('created_at', { ascending: true }),
        supabase
          .from('plan_budget_distributions')
          .select('*')
          .eq('media_plan_id', resolvedPlanId)
      ]);

      if (linesResult.error) throw linesResult.error;

      const linesList = (linesResult.data || []) as MediaLine[];
      setLines(linesList);
      
      if (!distributionsResult.error && distributionsResult.data) {
        setBudgetDistributions(distributionsResult.data);
      }

      // Stop loading here - main data is ready for display
      setLoading(false);

      // Fetch creatives and monthly budgets in background (lazy loading)
      if (linesList.length > 0) {
        const lineIds = linesList.map(l => l.id);
        
        // Fetch in parallel but don't block UI
        Promise.all([
          supabase
            .from('media_creatives')
            .select('*')
            .in('media_line_id', lineIds),
          supabase
            .from('media_line_monthly_budgets')
            .select('*')
            .in('media_line_id', lineIds)
            .order('month_date', { ascending: true })
        ]).then(([creativesResult, monthlyResult]) => {
          if (!creativesResult.error && creativesResult.data) {
            const grouped: Record<string, MediaCreative[]> = {};
            creativesResult.data.forEach((c: MediaCreative) => {
              if (!grouped[c.media_line_id]) grouped[c.media_line_id] = [];
              grouped[c.media_line_id].push(c);
            });
            setCreatives(grouped);
          }

          if (!monthlyResult.error && monthlyResult.data) {
            const groupedMonthly: Record<string, MediaLineMonthlyBudget[]> = {};
            monthlyResult.data.forEach((m: MediaLineMonthlyBudget) => {
              if (!groupedMonthly[m.media_line_id]) groupedMonthly[m.media_line_id] = [];
              groupedMonthly[m.media_line_id].push(m);
            });
            setMonthlyBudgets(groupedMonthly);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar plano');
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

  const handleValidateUTM = async (lineId: string, validated: boolean) => {
    try {
      const updates = validated 
        ? { 
            utm_validated: true, 
            utm_validated_at: new Date().toISOString(),
            utm_validated_by: user?.id 
          }
        : { 
            utm_validated: false, 
            utm_validated_at: null,
            utm_validated_by: null 
          };

      const { error } = await supabase
        .from('media_lines')
        .update(updates)
        .eq('id', lineId);

      if (error) throw error;

      setLines(lines.map(l => l.id === lineId ? { ...l, ...updates } : l));
      toast.success(validated ? 'UTM validado com sucesso!' : 'Validação removida');
    } catch (error) {
      console.error('Error validating UTM:', error);
      toast.error('Erro ao validar UTM');
    }
  };

  const handleUpdateMomentDates = async (distributionId: string | null, startDate: string | null, endDate: string | null) => {
    if (!plan || !distributionId) return;
    
    try {
      // Update the specific distribution by its ID
      const { error } = await supabase
        .from('plan_budget_distributions')
        .update({ start_date: startDate, end_date: endDate })
        .eq('id', distributionId);
      
      if (error) throw error;
      
      // Update local state
      setBudgetDistributions(prev => 
        prev.map(d => 
          d.id === distributionId
            ? { ...d, start_date: startDate, end_date: endDate }
            : d
        )
      );
      
      toast.success('Datas atualizadas');
    } catch (error) {
      console.error('Error updating moment dates:', error);
      toast.error('Erro ao atualizar datas');
    }
  };

  const handleStatusChange = async (newStatus: MediaPlan['status']) => {
    if (!plan) return;
    
    try {
      const { error } = await supabase
        .from('media_plans')
        .update({ status: newStatus })
        .eq('id', plan.id);

      if (error) throw error;

      setPlan({ ...plan, status: newStatus });
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Stable callback for filtered lines - prevents unnecessary re-renders
  const handleFilteredLinesChange = useCallback((newFilteredLines: MediaLine[]) => {
    setFilteredLines(newFilteredLines);
  }, []);

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

    // Build moment options - deduplicate by reference_id
    const uniqueMomentIds = [...new Set(momentDists.map(d => d.reference_id))];
    const planMoments: { id: string | null; name: string }[] = momentDists.length === 0
      ? [{ id: null, name: 'Geral' }]
      : uniqueMomentIds.map(refId => ({
          id: refId,
          name: (moments.data || []).find(m => m.id === refId)?.name || 'Geral'
        }));

    // Build funnel stage options - deduplicate by reference_id
    const uniqueFunnelIds = [...new Set(funnelDists.map(d => d.reference_id))];
    const planFunnelStages: { id: string | null; name: string }[] = funnelDists.length === 0
      ? [{ id: null, name: 'Geral' }]
      : uniqueFunnelIds.map(refId => ({
          id: refId,
          name: (funnelStages.data || []).find(f => f.id === refId)?.name || 'Geral'
        }));

    return { planSubdivisions, planMoments, planFunnelStages };
  };

  const { planSubdivisions, planMoments, planFunnelStages } = getPlanHierarchyOptions();

  // Get hierarchy order from plan (fallback to default if not set)
  const hierarchyOrder: HierarchyLevel[] = useMemo(() => {
    if (plan?.hierarchy_order && Array.isArray(plan.hierarchy_order) && plan.hierarchy_order.length > 0) {
      return plan.hierarchy_order as HierarchyLevel[];
    }
    return DEFAULT_HIERARCHY_ORDER;
  }, [plan?.hierarchy_order]);

  // Check if there are real distributions for showing hierarchy card
  const hasRealDistributions = useMemo(() => {
    return budgetDistributions.length > 0 && 
      budgetDistributions.some(d => d.distribution_type === 'subdivision' || d.distribution_type === 'moment' || d.distribution_type === 'funnel_stage');
  }, [budgetDistributions]);

  // Check if plan needs hierarchy generation (has lines but no distributions)
  const needsHierarchyGeneration = useMemo(() => {
    return lines.length > 0 && 
           budgetDistributions.length === 0 && 
           hierarchyOrder.length > 0;
  }, [lines.length, budgetDistributions.length, hierarchyOrder.length]);

  // Handle generating budget hierarchy from existing lines
  const handleGenerateHierarchy = async () => {
    if (!plan || !user) return;
    
    setIsGeneratingHierarchy(true);
    try {
      const linesForDistribution = lines.map(line => ({
        id: line.id,
        budget: line.budget,
        subdivision_id: line.subdivision_id,
        moment_id: line.moment_id,
        funnel_stage_id: line.funnel_stage_id,
        start_date: line.start_date,
        end_date: line.end_date,
      }));
      
      const result = await generateBudgetDistributionsFromLines({
        planId: plan.id,
        userId: user.id,
        hierarchyOrder,
        lines: linesForDistribution,
        totalBudget: Number(plan.total_budget) || 0,
        clearExisting: true,
      });
      
      if (result.success) {
        toast.success(`Hierarquia do orçamento gerada com ${result.count} distribuições!`);
        await fetchData(); // Reload to show the new distributions
      } else {
        toast.error(result.error || 'Erro ao gerar hierarquia');
      }
    } catch (error) {
      console.error('Error generating hierarchy:', error);
      toast.error('Erro ao gerar hierarquia do orçamento');
    } finally {
      setIsGeneratingHierarchy(false);
    }
  };

  // Build dynamic hierarchy tree (supports any order)
  const dynamicHierarchyTree = useMemo(() => {
    const getNameForLevel = (level: HierarchyLevel, refId: string | null): string => {
      if (!refId) return 'Geral';
      switch (level) {
        case 'subdivision':
          return (subdivisions.data || []).find(s => s.id === refId)?.name || 'Geral';
        case 'moment':
          return (moments.data || []).find(m => m.id === refId)?.name || 'Geral';
        case 'funnel_stage':
          return (funnelStages.data || []).find(f => f.id === refId)?.name || 'Geral';
        default:
          return 'Geral';
      }
    };

    const lineRefs: MediaLineRef[] = lines.map(l => ({
      id: l.id,
      budget: l.budget,
      subdivision_id: l.subdivision_id,
      moment_id: l.moment_id,
      funnel_stage_id: l.funnel_stage_id,
    }));

    return buildHierarchyTree(
      budgetDistributions,
      lineRefs,
      hierarchyOrder,
      getNameForLevel
    );
  }, [lines, budgetDistributions, hierarchyOrder, subdivisions.data, moments.data, funnelStages.data]);

  // Build momentDates map for MediaLineWizard
  const momentDates = useMemo(() => {
    const momentDists = budgetDistributions.filter(d => d.distribution_type === 'moment');
    const datesMap: Record<string, { start_date?: string | null; end_date?: string | null }> = {};
    
    momentDists.forEach(dist => {
      if (dist.reference_id) {
        datesMap[dist.reference_id] = {
          start_date: dist.start_date,
          end_date: dist.end_date,
        };
      }
    });
    
    return datesMap;
  }, [budgetDistributions]);

  // Build existingLines list for duplicate detection
  const existingLinesForWizard = useMemo(() => {
    return lines.map(line => ({
      line_code: line.line_code || '',
      moment_id: line.moment_id || null,
      moment_name: moments.data?.find(m => m.id === line.moment_id)?.name || 'Geral',
    }));
  }, [lines, moments.data]);

  // Build moments timeline data - showing ALL subdivision + moment combinations from plan
  const momentsForTimeline = useMemo(() => {
    const subdivisionDists = budgetDistributions.filter(d => d.distribution_type === 'subdivision');
    const momentDists = budgetDistributions.filter(d => d.distribution_type === 'moment');
    
    if (momentDists.length === 0) return [];
    
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
    
    // Build timeline items showing ALL subdivision + moment combinations
    const timelineItems: Array<{
      id: string;
      subdivisionId: string | null;
      momentId: string | null;
      name: string;
      startDate: string | null;
      endDate: string | null;
      budget: number;
      percentage: number;
    }> = [];
    
    momentDists.forEach(momDist => {
      // Find the parent subdivision
      const parentSubDist = subdivisionDists.find(s => s.id === momDist.parent_distribution_id);
      const subdivisionRefId = parentSubDist?.reference_id || null;
      const subdivisionName = getSubdivisionName(subdivisionRefId);
      const momentName = getMomentName(momDist.reference_id);
      
      // Use the planned amount from distribution (not from lines)
      // Fallback to plan dates if moment dates are not set
      timelineItems.push({
        id: momDist.id,
        subdivisionId: subdivisionRefId,
        momentId: momDist.reference_id,
        name: subdivisionDists.length > 1 ? `${subdivisionName} - ${momentName}` : momentName,
        startDate: momDist.start_date || plan?.start_date || null,
        endDate: momDist.end_date || plan?.end_date || null,
        budget: momDist.amount,
        percentage: momDist.percentage,
      });
    });
    
    // Sort by subdivision name then by start date
    return timelineItems.sort((a, b) => {
      // First sort by subdivision
      const subCompare = a.name.localeCompare(b.name);
      if (subCompare !== 0) return subCompare;
      // Then by start date
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.localeCompare(b.startDate);
    });
  }, [budgetDistributions, subdivisions.data, moments.data]);

  // Plan alerts - now with dynamic hierarchy order
  const planAlerts = usePlanAlerts({
    totalBudget: plan?.total_budget || 0,
    lines,
    creatives,
    budgetDistributions,
    planStartDate: plan?.start_date || null,
    planEndDate: plan?.end_date || null,
    moments: moments.data || [],
    hierarchyOrder,
  });

  // Filter lines by alerts if enabled
  const displayedLines = useMemo(() => {
    if (!filterByAlerts) return lines;
    return lines.filter(line => planAlerts.linesWithAlerts.has(line.id));
  }, [lines, filterByAlerts, planAlerts.linesWithAlerts]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingPage message="Carregando plano..." />
      </DashboardLayout>
    );
  }

  if (!plan) return null;

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
                <StatusSelector
                  status={plan.status}
                  onStatusChange={handleStatusChange}
                  disabled={!canEdit}
                />
                <RoleBadge planId={planId!} />
              </div>
              <p className="text-muted-foreground">
                {plan.client || 'Sem cliente'} • {plan.campaign || 'Sem campanha'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Botão de Alertas */}
            {planAlerts.alerts.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={alertsVisible ? "default" : "outline"}
                      size="icon"
                      onClick={() => setAlertsVisible(!alertsVisible)}
                      className="relative"
                    >
                      <Bell className="w-4 h-4" />
                      <span className={`absolute -top-1 -right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center ${
                        planAlerts.errorAlerts.length > 0 
                          ? "bg-destructive text-destructive-foreground" 
                          : planAlerts.warningAlerts.length > 0 
                            ? "bg-warning text-warning-foreground"
                            : "bg-primary text-primary-foreground"
                      }`}>
                        {planAlerts.alerts.length}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{alertsVisible ? 'Ocultar alertas' : 'Ver alertas'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Botão Nova Linha - Destaque */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button onClick={() => setWizardOpen(true)} className="gap-2" disabled={!canEdit}>
                      <Plus className="w-4 h-4" />
                      Nova Linha
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canEdit && (
                  <TooltipContent>
                    <p>Apenas proprietários e editores podem criar linhas</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {/* Dropdown de Configurações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  Configurações
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <ElementVisibilityMenu elements={elements} onToggle={toggleVisibility} />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setVersionHistoryOpen(true)}>
                  <History className="w-4 h-4 mr-2" />
                  Histórico de Versões
                </DropdownMenuItem>
                <SaveVersionDropdownItem planId={planId!} disabled={!canEdit} />
                <DropdownMenuSeparator />
                <DropdownMenuItem 
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
                    hierarchyOrder,
                  })}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar XLSX
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => navigate(`/media-plans/${plan?.slug || planId}/edit`)}
                  disabled={!canEdit}
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Editar Plano
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/reports/${planId}`)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Relatórios
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Alerts Summary - Only visible when toggled */}
        {alertsVisible && planAlerts.alerts.length > 0 && (
          <AlertsSummaryCard
            alerts={planAlerts.alerts}
            errorCount={planAlerts.errorAlerts.length}
            warningCount={planAlerts.warningAlerts.length}
            infoCount={planAlerts.infoAlerts.length}
            onFilterByAlerts={setFilterByAlerts}
            filterEnabled={filterByAlerts}
            onClose={() => setAlertsVisible(false)}
            defaultExpanded={true}
          />
        )}

        {/* Plan Summary Card */}
        {isVisible('plan-summary') && (
          <PlanDetailSummaryCard
            plan={plan}
            totalLinesBudget={totalLinesBudget}
            linesCount={lines.length}
            creativesCount={Object.values(creatives).reduce((acc, c) => acc + c.length, 0)}
            onHide={() => hideElement('plan-summary')}
          />
        )}

        {/* Moments Timeline - Collapsible */}
        {isVisible('moments-timeline') && momentsForTimeline.length > 0 && plan.start_date && plan.end_date && (
          <AnimatedCollapsible defaultOpen={false} storageKey="moments-timeline" className="border rounded-lg overflow-hidden bg-card">
            <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors">
              <AnimatedCollapsibleTrigger asChild>
                <button className="flex-1 flex items-center gap-3 text-left">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Timeline de Momentos</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center">
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-sm">
                          Visualização gráfica dos períodos de cada momento de campanha. Mostra a distribuição temporal das ações ao longo do plano.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {momentsForTimeline.length} momento(s) • Clique para expandir
                  </span>
                </button>
              </AnimatedCollapsibleTrigger>
              
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hideElement('moments-timeline');
                        }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Ocultar esta seção
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <AnimatedCollapsibleTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <motion.div
                      initial={false}
                      className="[[data-state=open]_&]:rotate-180 transition-transform duration-200"
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>
                </AnimatedCollapsibleTrigger>
              </div>
            </div>
            <AnimatedCollapsibleContent>
              <div className="p-4 border-t">
                <MomentsTimeline
                  moments={momentsForTimeline}
                  planStartDate={plan.start_date}
                  planEndDate={plan.end_date}
                  canEdit={canEdit}
                  onUpdateMomentDates={handleUpdateMomentDates}
                  hierarchyOrder={hierarchyOrder}
                />
              </div>
            </AnimatedCollapsibleContent>
          </AnimatedCollapsible>
        )}

        {/* Editable Hierarchy Card */}
        {isVisible('budget-hierarchy') && hasRealDistributions && (
          <EditableHierarchyCard
            planId={plan.id}
            planName={plan.name}
            totalBudget={Number(plan.total_budget) || 0}
            budgetDistributions={budgetDistributions}
            hierarchyTree={dynamicHierarchyTree}
            hierarchyOrder={hierarchyOrder}
            onDistributionsUpdated={fetchData}
            onHide={() => hideElement('budget-hierarchy')}
          />
        )}

        {/* Funnel Visualization - Show only if there are custom funnel stages */}
        {(() => {
          // Check if there are non-default funnel stages
          const funnelDists = budgetDistributions.filter(d => d.distribution_type === 'funnel_stage');
          const hasCustomFunnel = funnelDists.length > 0 && funnelDists.some(d => d.reference_id !== null);
          
          if (!hasCustomFunnel) return null;

          // Get unique funnel stage IDs from distributions
          const uniqueFunnelStageIds = [...new Set(
            funnelDists
              .filter(d => d.reference_id !== null)
              .map(d => d.reference_id)
          )];

          // Build funnel stages with one entry per unique stage (using ALL lines, not filtered)
          const funnelStagesForViz: BudgetAllocation[] = uniqueFunnelStageIds
            .map(stageId => {
              const stage = (funnelStages.data || []).find(f => f.id === stageId);
              // Calculate allocated from ALL lines for this stage
              const allocated = lines
                .filter(l => l.funnel_stage_id === stageId)
                .reduce((acc, l) => acc + Number(l.budget || 0), 0);
              
              return {
                id: stageId || 'geral',
                name: stage?.name || 'Geral',
                percentage: Number(plan.total_budget) > 0 ? (allocated / Number(plan.total_budget)) * 100 : 0,
                amount: allocated,
              };
            })
            .filter(s => s.amount > 0);

          if (funnelStagesForViz.length === 0) return null;

          // Sort by funnel stage order_index
          const sortedFunnelStages = funnelStagesForViz.sort((a, b) => {
            const stageA = (funnelStages.data || []).find(f => f.id === a.id);
            const stageB = (funnelStages.data || []).find(f => f.id === b.id);
            return (stageA?.order_index ?? 999) - (stageB?.order_index ?? 999);
          });

          return (
            <FunnelVisualization
              funnelStages={sortedFunnelStages}
              parentBudget={Number(plan.total_budget) || 0}
              parentName="Total do Plano"
              hierarchyOrder={hierarchyOrder}
            />
          );
        })()}

        {/* Temporal Distribution Chart - Collapsible */}
        {isVisible('temporal-distribution') && plan.start_date && plan.end_date && (
          <AnimatedCollapsible defaultOpen={false} storageKey="temporal-distribution" className="border rounded-lg overflow-hidden bg-card">
            <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors">
              <AnimatedCollapsibleTrigger asChild>
                <button className="flex-1 flex items-center gap-3 text-left">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Distribuição Temporal</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center">
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-sm">
                          Gráfico de barras mostrando a soma dos orçamentos mensais das linhas de mídia filtradas. Útil para visualizar concentração de investimento ao longo do tempo.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Clique para expandir
                  </span>
                </button>
              </AnimatedCollapsibleTrigger>
              
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hideElement('temporal-distribution');
                        }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Ocultar esta seção
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <AnimatedCollapsibleTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <motion.div
                      initial={false}
                      className="[[data-state=open]_&]:rotate-180 transition-transform duration-200"
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>
                </AnimatedCollapsibleTrigger>
              </div>
            </div>
            <AnimatedCollapsibleContent>
              <div className="p-4 border-t">
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
                      const monthBudget = lineBudgets.find(b => b.month_date === monthStr);
                      if (monthBudget) {
                        total += monthBudget.amount;
                      }
                    });

                    return {
                      month: format(monthDate, 'MMM yyyy', { locale: ptBR }),
                      amount: total,
                    };
                  });

                  const maxAmount = Math.max(...monthlyTotals.map(m => m.amount), 1);
                  const totalDistributed = monthlyTotals.reduce((acc, m) => acc + m.amount, 0);

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Distribuído:</span>
                        <span className="font-semibold">{formatCurrency(totalDistributed)}</span>
                      </div>
                      <div className="flex items-end gap-2 h-40">
                        {monthlyTotals.map((month, idx) => {
                          const heightPercent = (month.amount / maxAmount) * 100;
                          const percentOfTotal = totalDistributed > 0 
                            ? ((month.amount / totalDistributed) * 100).toFixed(1) 
                            : '0';
                          
                          return (
                            <TooltipProvider key={idx}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex-1 flex flex-col items-center gap-1">
                                    <div 
                                      className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary cursor-pointer"
                                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                    />
                                    <div className="text-[10px] text-muted-foreground text-center leading-tight">
                                      {month.month}
                                    </div>
                                    <div className="text-[10px] font-medium text-center">
                                      {percentOfTotal}%
                                    </div>
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
                    </div>
                  );
                })()}
              </div>
            </AnimatedCollapsibleContent>
          </AnimatedCollapsible>
        )}

        {/* Line Details Summary Card */}
        {isVisible('line-details') && (
          <LineDetailsSummaryCard
            planId={plan.id}
            lines={lines}
            onHide={() => hideElement('line-details')}
          />
        )}

        {/* Banner to generate hierarchy when missing */}
        {needsHierarchyGeneration && canEdit && (
          <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-red-700 dark:text-red-400">Hierarquia do Orçamento não configurada</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-red-600 dark:text-red-300">
              <span>
                Este plano foi criado sem a distribuição hierárquica do orçamento. 
                Gere agora para visualizar os agrupamentos e cards de orçamento.
              </span>
              <Button 
                onClick={handleGenerateHierarchy}
                disabled={isGeneratingHierarchy}
                size="sm"
                variant="destructive"
                className="shrink-0"
              >
                {isGeneratingHierarchy ? 'Gerando...' : 'Gerar Hierarquia'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Hierarchical Media Table */}
        <HierarchicalMediaTable
          plan={plan}
          lines={filterByAlerts ? displayedLines : lines}
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
          statuses={statuses.activeItems || []}
          hierarchyOrder={hierarchyOrder}
          lineAlerts={planAlerts.getLineAlerts}
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
          onFilteredLinesChange={handleFilteredLinesChange}
          onValidateUTM={handleValidateUTM}
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
          hierarchyOrder={hierarchyOrder}
          momentDates={momentDates}
          existingLines={existingLinesForWizard}
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

      {/* Team Management moved to environment level (/settings/team) */}

      {/* Version History Dialog */}
      <VersionHistoryDialog
        planId={planId!}
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        onRestored={fetchData}
      />
    </DashboardLayout>
  );
}
