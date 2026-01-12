import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, Loader2, Layers, Clock, Filter, Calendar, FileText, Sparkles, AlertTriangle, LogOut, Info, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { WizardStepper } from '@/components/media-plan/WizardStepper';
import { BudgetAllocationTable } from '@/components/media-plan/BudgetAllocationTable';
import { LibrarySelector } from '@/components/media-plan/LibrarySelector';
import { PlanSummaryCard } from '@/components/media-plan/PlanSummaryCard';
import { SubdivisionsSummaryCard } from '@/components/media-plan/SubdivisionsSummaryCard';
import { FunnelVisualization } from '@/components/media-plan/FunnelVisualization';
import { SortableFunnelList } from '@/components/media-plan/SortableFunnelList';
import { FunnelStageSelector } from '@/components/media-plan/FunnelStageSelector';
import { TemporalEqualizer, generateTemporalPeriods } from '@/components/media-plan/TemporalEqualizer';
import { SlugInputField } from '@/components/media-plan/SlugInputField';
import { HierarchyOrderSelector } from '@/components/media-plan/HierarchyOrderSelector';
import { useMediaPlanWizard, BudgetAllocation, WizardPlanData } from '@/hooks/useMediaPlanWizard';
import { KPI_OPTIONS } from '@/types/media';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';
import { CreateKpiDialog } from '@/components/media-plan/CreateKpiDialog';
import { useCustomKpis } from '@/hooks/useCustomKpis';
import { HierarchyLevel, DEFAULT_HIERARCHY_ORDER, getLevelLabel, getLevelLabelPlural, HIERARCHY_LEVEL_CONFIG } from '@/types/hierarchy';
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

// Icons for hierarchy levels
const LEVEL_ICONS: Record<HierarchyLevel, React.ElementType> = {
  subdivision: Layers,
  moment: Clock,
  funnel_stage: Filter,
};

// Max items per level
const MAX_ITEMS_PER_LEVEL: Record<HierarchyLevel, number> = {
  subdivision: 12,
  moment: 12,
  funnel_stage: 7,
};

// Descriptions per level
const LEVEL_DESCRIPTIONS: Record<HierarchyLevel, { title: string; description: string }> = {
  subdivision: {
    title: 'Subdivisão do Plano',
    description: 'Divida o orçamento por cidade, produto ou outra subdivisão.',
  },
  moment: {
    title: 'Momentos de Campanha',
    description: 'Distribua o orçamento por momentos (lançamento, sustentação, etc.).',
  },
  funnel_stage: {
    title: 'Fases do Funil',
    description: 'Distribua o orçamento por fase do funil.',
  },
};

// Legacy constants removed - now using LEVEL_ICONS, MAX_ITEMS_PER_LEVEL

interface BudgetDistribution {
  id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
}

// Helper to create a "Geral" allocation
const createGeralAllocation = (budget: number): BudgetAllocation => ({
  id: 'geral',
  name: 'Geral',
  percentage: 100,
  amount: budget,
});

// Interface for parent items with full path support
interface ParentItem {
  id: string;
  name: string;
  path: string;
  breadcrumb: string;
  percentage: number;
  amount: number;
}

export default function EditMediaPlan() {
  const { id: identifier } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const wizard = useMediaPlanWizard();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [temporalPeriods, setTemporalPeriods] = useState<any[]>([]);
  const [orphanLinesData, setOrphanLinesData] = useState<{ count: number; lines: { id: string; line_code: string; platform: string; reason: string }[] }>({ count: 0, lines: [] });
  const [showOrphanWarning, setShowOrphanWarning] = useState(false);
  const [existingDistributions, setExistingDistributions] = useState<BudgetDistribution[]>([]);
  const [existingLines, setExistingLines] = useState<any[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planSlug, setPlanSlug] = useState<string | null>(null);
  const [planHierarchyOrder, setPlanHierarchyOrder] = useState<HierarchyLevel[]>([]);
  const [originalHierarchyOrder, setOriginalHierarchyOrder] = useState<HierarchyLevel[]>([]);
  const [hierarchyChanged, setHierarchyChanged] = useState(false);
  const [showHierarchyWarning, setShowHierarchyWarning] = useState(false);
  const [pendingHierarchyChange, setPendingHierarchyChange] = useState<HierarchyLevel[] | null>(null);
  const { customKpis } = useCustomKpis();

  const { state, goToStep, updatePlanData, setSubdivisions, setMoments, setFunnelStages, setTemporalGranularity, libraryData, libraryMutations, initializeFromPlan, getLibraryForLevel, getCreateMutationForLevel, setHierarchyOrder: setWizardHierarchyOrder, reset: resetWizard } = wizard;

  // Generate wizard steps dynamically based on planHierarchyOrder (includes step 0 for structure)
  const wizardSteps = useMemo(() => {
    const steps = [
      { id: 0, title: 'Estrutura', description: 'Hierarquia' },
      { id: 1, title: 'Plano', description: 'Dados básicos' },
    ];
    
    planHierarchyOrder.forEach((level, idx) => {
      steps.push({
        id: idx + 2,
        title: getLevelLabel(level),
        description: idx === 0 ? 'Opcional' : `Nível ${idx + 1}`,
      });
    });
    
    steps.push({ id: planHierarchyOrder.length + 2, title: 'Salvar', description: 'Confirmar' });
    return steps;
  }, [planHierarchyOrder]);

  // Calculate last step number
  const lastStep = planHierarchyOrder.length + 2;

  // Load existing plan data
  useEffect(() => {
    if (user && identifier) {
      loadPlanData();
    }
  }, [user, identifier]);

  const loadPlanData = async () => {
    try {
      // Check if identifier is a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier || '');
      
      let query = supabase.from('media_plans').select('*');
      if (isUUID) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('slug', identifier);
      }
      query = query.eq('user_id', user?.id);
      
      const { data: plan, error: planError } = await query.maybeSingle();

      if (planError) throw planError;
      if (!plan) {
        toast.error('Plano não encontrado');
        navigate('/media-plans');
        return;
      }
      
      // Redirect from ID to slug if accessed via ID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier || '')) {
        if (plan.slug && identifier !== plan.slug) {
          navigate(`/media-plans/${plan.slug}/edit`, { replace: true });
          return;
        }
      }
      
      // Store actual ID and slug
      const resolvedPlanId = plan.id;
      setPlanId(resolvedPlanId);
      setPlanSlug(plan.slug);
      
      // Store hierarchy order (can now be changed)
      const loadedOrder = plan.hierarchy_order as string[] | null;
      const hierarchyOrder = (loadedOrder && loadedOrder.length >= 0 
        ? loadedOrder 
        : []) as HierarchyLevel[];
      setPlanHierarchyOrder(hierarchyOrder);
      setOriginalHierarchyOrder(hierarchyOrder); // Store original for comparison

      // Fetch existing distributions
      const { data: distributions, error: distError } = await supabase
        .from('plan_budget_distributions')
        .select('*')
        .eq('media_plan_id', resolvedPlanId);

      if (distError) throw distError;
      setExistingDistributions(distributions || []);

      // Fetch existing lines
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select('*')
        .eq('media_plan_id', resolvedPlanId);

      if (linesError) throw linesError;
      setExistingLines(lines || []);

      // Parse distributions into wizard state
      const planData: WizardPlanData = {
        name: plan.name,
        client: plan.client || '',
        client_id: plan.client_id || null,
        utm_campaign_slug: plan.utm_campaign_slug || null,
        start_date: plan.start_date || '',
        end_date: plan.end_date || '',
        total_budget: Number(plan.total_budget) || 0,
        default_url: plan.default_url || '',
        objectives: plan.objectives || [],
        kpis: (plan.kpis as Record<string, number>) || {},
      };

      // Build subdivision allocations
      const subdivisionDists = (distributions || []).filter(d => d.distribution_type === 'subdivision');
      const subdivisionAllocations: BudgetAllocation[] = [];
      
      for (const dist of subdivisionDists) {
        if (dist.reference_id) {
          // Find the subdivision name from library
          const subData = libraryData.subdivisions.find(s => s.id === dist.reference_id);
          subdivisionAllocations.push({
            id: dist.reference_id,
            name: subData?.name || 'Subdivisão',
            percentage: Number(dist.percentage),
            amount: Number(dist.amount),
          });
        }
        // Skip "Geral" entries (reference_id is null)
      }

      // Build moment allocations
      const momentDists = (distributions || []).filter(d => d.distribution_type === 'moment');
      const momentAllocations: Record<string, BudgetAllocation[]> = {};

      for (const momDist of momentDists) {
        if (!momDist.reference_id) continue; // Skip "Geral"
        
        // Find parent subdivision
        const parentDist = subdivisionDists.find(s => s.id === momDist.parent_distribution_id);
        const key = parentDist?.reference_id || 'root';
        
        const momData = libraryData.moments.find(m => m.id === momDist.reference_id);
        if (!momentAllocations[key]) momentAllocations[key] = [];
        momentAllocations[key].push({
          id: momDist.reference_id,
          name: momData?.name || 'Momento',
          percentage: Number(momDist.percentage),
          amount: Number(momDist.amount),
          start_date: momDist.start_date || undefined,
          end_date: momDist.end_date || undefined,
        });
      }

      // Build funnel allocations
      const funnelDists = (distributions || []).filter(d => d.distribution_type === 'funnel_stage');
      const funnelAllocations: Record<string, BudgetAllocation[]> = {};

      for (const funnelDist of funnelDists) {
        if (!funnelDist.reference_id) continue; // Skip "Geral"

        // Find parent moment
        const parentMomDist = momentDists.find(m => m.id === funnelDist.parent_distribution_id);
        // Find parent subdivision of that moment
        const parentSubDist = parentMomDist 
          ? subdivisionDists.find(s => s.id === parentMomDist.parent_distribution_id)
          : null;
        
        const key = parentSubDist?.reference_id || 'root';
        
        const funnelData = libraryData.funnelStages.find(f => f.id === funnelDist.reference_id);
        if (!funnelAllocations[key]) funnelAllocations[key] = [];
        
        // Avoid duplicates
        if (!funnelAllocations[key].some(f => f.id === funnelDist.reference_id)) {
          funnelAllocations[key].push({
            id: funnelDist.reference_id,
            name: funnelData?.name || 'Fase',
            percentage: Number(funnelDist.percentage),
            amount: Number(funnelDist.amount),
          });
        }
      }

      // Initialize wizard with loaded data, starting at step 0 (Structure)
      initializeFromPlan(planData, subdivisionAllocations, momentAllocations, funnelAllocations, 0, hierarchyOrder);
    } catch (error) {
      console.error('Error loading plan:', error);
      toast.error('Erro ao carregar plano');
      navigate(planSlug ? `/media-plans/${planSlug}` : '/media-plans');
    } finally {
      setLoading(false);
    }
  };

  // Generate temporal periods when dates or granularity change
  useEffect(() => {
    if (state.planData.start_date && state.planData.end_date) {
      const periods = generateTemporalPeriods(
        state.planData.start_date,
        state.planData.end_date,
        state.temporalGranularity,
        state.planData.total_budget
      );
      setTemporalPeriods(periods);
    }
  }, [state.planData.start_date, state.planData.end_date, state.temporalGranularity, state.planData.total_budget]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPlanInfoMissingFields = () => {
    const missing: string[] = [];

    if (!state.planData.name.trim()) missing.push('Nome do Plano');
    if (!state.planData.client_id) missing.push('Cliente');
    if (!state.planData.start_date) missing.push('Data de Início');
    if (!state.planData.end_date) missing.push('Data de Término');
    if (state.planData.start_date && state.planData.end_date && state.planData.end_date <= state.planData.start_date) {
      missing.push('Datas válidas (término após início)');
    }
    if (!(state.planData.total_budget > 0)) missing.push('Orçamento Total');

    return missing;
  };

  const canProceed = () => {
    switch (state.step) {
      case 0:
        // Structure step - always valid (0 levels = General budget)
        return true;
      case 1:
        return getPlanInfoMissingFields().length === 0;
      default: {
        // For hierarchy level steps (2 onwards), validate allocations
        const levelIndex = state.step - 2;
        if (levelIndex >= 0 && levelIndex < planHierarchyOrder.length) {
          const level = planHierarchyOrder[levelIndex];
          const allocations = getAllocationsForLevel(level);
          return allocations.length === 0 || wizard.validatePercentages(allocations);
        }
        return true;
      }
    }
  };

  // Handle hierarchy change with warning dialog
  const handleHierarchyChange = (newOrder: HierarchyLevel[]) => {
    // Check if there are impacts to warn about
    const removedLevels = originalHierarchyOrder.filter(level => !newOrder.includes(level));
    const hasImpact = existingLines.length > 0 && (removedLevels.length > 0 || originalHierarchyOrder.length !== newOrder.length);
    
    if (hasImpact) {
      setPendingHierarchyChange(newOrder);
      setShowHierarchyWarning(true);
    } else {
      applyHierarchyChange(newOrder);
    }
  };

  // Apply hierarchy change after confirmation
  const applyHierarchyChange = (newOrder: HierarchyLevel[]) => {
    setPlanHierarchyOrder(newOrder);
    setWizardHierarchyOrder(newOrder);
    
    // Check if hierarchy actually changed from original
    const isChanged = JSON.stringify(newOrder) !== JSON.stringify(originalHierarchyOrder);
    setHierarchyChanged(isChanged);
    
    // Clear allocations for removed levels
    const removedLevels = originalHierarchyOrder.filter(level => !newOrder.includes(level));
    if (removedLevels.includes('subdivision')) {
      setSubdivisions([]);
    }
    if (removedLevels.includes('moment')) {
      setMoments('root', []);
      // Clear all moment allocations
      Object.keys(state.moments).forEach(key => setMoments(key, []));
    }
    if (removedLevels.includes('funnel_stage')) {
      setFunnelStages('root', []);
      // Clear all funnel allocations
      Object.keys(state.funnelStages).forEach(key => setFunnelStages(key, []));
    }
    
    setPendingHierarchyChange(null);
    setShowHierarchyWarning(false);
  };

  // Confirm hierarchy change
  const handleConfirmHierarchyChange = () => {
    if (pendingHierarchyChange) {
      applyHierarchyChange(pendingHierarchyChange);
    }
  };

  // Helper to get allocations for a level at a specific path (supports full hierarchical paths)
  const getAllocationsForLevelAtPath = (level: HierarchyLevel, parentPath: string = 'root'): BudgetAllocation[] => {
    switch (level) {
      case 'subdivision':
        return state.subdivisions;
      case 'moment':
        return state.moments[parentPath] || [];
      case 'funnel_stage':
        return state.funnelStages[parentPath] || [];
      default:
        return [];
    }
  };

  // Get parent items for nested levels - recursively builds all path combinations
  const getParentItemsForLevel = (levelIndex: number): ParentItem[] => {
    if (levelIndex === 0) {
      // First level - parent is the plan itself
      return [{ 
        id: 'root', 
        name: 'Plano Completo', 
        path: 'root',
        breadcrumb: 'Plano Completo',
        percentage: 100, 
        amount: state.planData.total_budget 
      }];
    }

    // Recursively build all path combinations from previous levels
    const buildHierarchicalPaths = (
      currentLevelIndex: number,
      parentPath: string,
      parentBreadcrumb: string,
      parentAmount: number
    ): ParentItem[] => {
      if (currentLevelIndex >= levelIndex) {
        return [];
      }

      const level = planHierarchyOrder[currentLevelIndex];
      const allocations = getAllocationsForLevelAtPath(level, parentPath);

      // If no allocations at this level, treat as "Geral" and continue
      if (allocations.length === 0) {
        const geralPath = parentPath === 'root' ? 'geral' : `${parentPath}_geral`;
        const geralBreadcrumb = parentPath === 'root' ? 'Geral' : `${parentBreadcrumb} › Geral`;
        
        if (currentLevelIndex === levelIndex - 1) {
          // This is the immediate parent level - return Geral
          return [{ 
            id: 'geral', 
            name: 'Geral', 
            path: geralPath,
            breadcrumb: geralBreadcrumb,
            percentage: 100, 
            amount: parentAmount 
          }];
        }
        // Continue to next level with Geral
        return buildHierarchicalPaths(currentLevelIndex + 1, geralPath, geralBreadcrumb, parentAmount);
      }

      if (currentLevelIndex === levelIndex - 1) {
        // This is the immediate parent level - return all allocations with full paths
        return allocations.map(alloc => {
          const allocPath = parentPath === 'root' ? alloc.id : `${parentPath}_${alloc.id}`;
          const allocBreadcrumb = parentPath === 'root' ? alloc.name : `${parentBreadcrumb} › ${alloc.name}`;
          const allocAmount = wizard.calculateAmount(parentAmount, alloc.percentage);
          
          return {
            id: alloc.id,
            name: alloc.name,
            path: allocPath,
            breadcrumb: allocBreadcrumb,
            percentage: alloc.percentage,
            amount: allocAmount,
          };
        });
      }

      // Not at the parent level yet - continue recursively for each allocation
      return allocations.flatMap(alloc => {
        const allocPath = parentPath === 'root' ? alloc.id : `${parentPath}_${alloc.id}`;
        const allocBreadcrumb = parentPath === 'root' ? alloc.name : `${parentBreadcrumb} › ${alloc.name}`;
        const allocAmount = wizard.calculateAmount(parentAmount, alloc.percentage);
        return buildHierarchicalPaths(currentLevelIndex + 1, allocPath, allocBreadcrumb, allocAmount);
      });
    };

    const paths = buildHierarchicalPaths(0, 'root', '', state.planData.total_budget);
    
    // If no paths found (all previous levels empty), return Geral
    if (paths.length === 0) {
      return [{ 
        id: 'root', 
        name: 'Geral', 
        path: 'root',
        breadcrumb: 'Geral',
        percentage: 100, 
        amount: state.planData.total_budget 
      }];
    }
    
    return paths;
  };

  // Generic handler for level allocations
  const handleLevelAdd = (level: HierarchyLevel, parentPath: string, item: BudgetAllocation) => {
    switch (level) {
      case 'subdivision':
        setSubdivisions([...state.subdivisions, item]);
        break;
      case 'moment':
        const currentMoments = state.moments[parentPath] || [];
        setMoments(parentPath, [...currentMoments, {
          ...item,
          start_date: state.planData.start_date,
          end_date: state.planData.end_date,
        }]);
        break;
      case 'funnel_stage':
        const currentFunnels = state.funnelStages[parentPath] || [];
        if (currentFunnels.length >= MAX_ITEMS_PER_LEVEL.funnel_stage) {
          toast.error(`Máximo de ${MAX_ITEMS_PER_LEVEL.funnel_stage} fases do funil`);
          return;
        }
        setFunnelStages(parentPath, [...currentFunnels, item]);
        break;
    }
  };

  const handleLevelUpdate = (level: HierarchyLevel, parentPath: string, id: string, percentage: number, dates?: { start_date?: string; end_date?: string }) => {
    switch (level) {
      case 'subdivision':
        setSubdivisions(state.subdivisions.map(s => 
          s.id === id ? { ...s, percentage, amount: wizard.calculateAmount(state.planData.total_budget, percentage) } : s
        ));
        break;
      case 'moment':
        const currentMoments = state.moments[parentPath] || [];
        setMoments(parentPath, currentMoments.map(m => 
          m.id === id ? { ...m, percentage, ...(dates && { start_date: dates.start_date, end_date: dates.end_date }) } : m
        ));
        break;
      case 'funnel_stage':
        const currentFunnels = state.funnelStages[parentPath] || [];
        setFunnelStages(parentPath, currentFunnels.map(f => 
          f.id === id ? { ...f, percentage } : f
        ));
        break;
    }
  };

  const handleLevelRemove = (level: HierarchyLevel, parentPath: string, id: string) => {
    switch (level) {
      case 'subdivision':
        setSubdivisions(state.subdivisions.filter(s => s.id !== id));
        break;
      case 'moment':
        const currentMoments = state.moments[parentPath] || [];
        setMoments(parentPath, currentMoments.filter(m => m.id !== id));
        break;
      case 'funnel_stage':
        const currentFunnels = state.funnelStages[parentPath] || [];
        setFunnelStages(parentPath, currentFunnels.filter(f => f.id !== id));
        break;
    }
  };

  const handleLevelReorder = (level: HierarchyLevel, parentPath: string, items: BudgetAllocation[]) => {
    switch (level) {
      case 'funnel_stage':
        setFunnelStages(parentPath, items);
        break;
    }
  };

  const handleCreateItem = async (level: HierarchyLevel, name: string) => {
    const mutation = getCreateMutationForLevel(level);
    if (!mutation) return null;
    const result = await mutation.mutateAsync({ name });
    return result;
  };

  // Helper to get allocations for a level (for validation - all values flattened)
  const getAllocationsForLevel = (level: HierarchyLevel): BudgetAllocation[] => {
    switch (level) {
      case 'subdivision':
        return state.subdivisions;
      case 'moment':
        return Object.values(state.moments).flat();
      case 'funnel_stage':
        return Object.values(state.funnelStages).flat();
      default:
        return [];
    }
  };

  const handleNext = () => {
    if (state.step === 1 && !canProceed()) {
      toast.error(`Preencha os campos obrigatórios: ${getPlanInfoMissingFields().join(', ')}`);
      return;
    }

    if (state.step < lastStep) {
      setEditingSection(null);
      goToStep(state.step + 1);
    }
  };

  const handleBack = () => {
    if (state.step > 0) {
      setEditingSection(null);
      goToStep(state.step - 1);
    }
  };

  // Check if we can save (must satisfy required fields)
  const canSave = () => {
    return Boolean(planId) && getPlanInfoMissingFields().length === 0;
  };

  // Save and stay on current page
  const handleSaveOnly = async () => {
    await handleSave(false);
  };

  // Save and navigate back to plan details
  const handleSaveAndExit = async () => {
    await handleSave(true);
  };

  // Calculate orphan lines (lines that will be deleted) with details
  const calculateOrphanLines = (): { count: number; lines: { id: string; line_code: string; platform: string; reason: string }[] } => {
    const newSubIds = new Set(state.subdivisions.map(s => s.id));
    const newMomIds = new Set(Object.values(state.moments).flat().map(m => m.id));
    const newFunnelIds = new Set(Object.values(state.funnelStages).flat().map(f => f.id));

    const orphanLines: { id: string; line_code: string; platform: string; reason: string }[] = [];
    for (const line of existingLines) {
      const subOrphan = line.subdivision_id && !newSubIds.has(line.subdivision_id);
      const momOrphan = line.moment_id && !newMomIds.has(line.moment_id);
      const funnelOrphan = line.funnel_stage_id && !newFunnelIds.has(line.funnel_stage_id);
      
      if (subOrphan || momOrphan || funnelOrphan) {
        const reasons: string[] = [];
        if (subOrphan) reasons.push('subdivisão');
        if (momOrphan) reasons.push('momento');
        if (funnelOrphan) reasons.push('fase do funil');
        
        orphanLines.push({
          id: line.id,
          line_code: line.line_code || 'Sem código',
          platform: line.platform || 'N/A',
          reason: reasons.join(', '),
        });
      }
    }
    return { count: orphanLines.length, lines: orphanLines };
  };

  const handleSave = async (exitAfterSave: boolean = true) => {
    // Validate required fields
    const missing = getPlanInfoMissingFields();
    if (missing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missing.join(', ')}`);
      goToStep(1);
      return;
    }

    // Check for orphan lines first
    const orphans = calculateOrphanLines();
    if (orphans.count > 0 && !showOrphanWarning) {
      setOrphanLinesData(orphans);
      setShowOrphanWarning(true);
      return;
    }

    setSaving(true);
    try {
      // 1. If hierarchy changed, clean up affected data
      if (hierarchyChanged) {
        // Delete monthly budgets for all existing lines
        const lineIds = existingLines.map(l => l.id);
        if (lineIds.length > 0) {
          await supabase
            .from('media_line_monthly_budgets')
            .delete()
            .in('media_line_id', lineIds);
        }
        
        // Nullify hierarchy fields on lines for removed levels
        const removedLevels = originalHierarchyOrder.filter(level => !planHierarchyOrder.includes(level));
        
        if (removedLevels.includes('subdivision') && existingLines.length > 0) {
          await supabase
            .from('media_lines')
            .update({ subdivision_id: null })
            .eq('media_plan_id', planId);
        }
        if (removedLevels.includes('moment') && existingLines.length > 0) {
          await supabase
            .from('media_lines')
            .update({ moment_id: null })
            .eq('media_plan_id', planId);
        }
        if (removedLevels.includes('funnel_stage') && existingLines.length > 0) {
          await supabase
            .from('media_lines')
            .update({ funnel_stage_id: null })
            .eq('media_plan_id', planId);
        }
      }

      // 2. Update the media plan (now including hierarchy_order)
      const { error: planError } = await supabase
        .from('media_plans')
        .update({
          name: state.planData.name,
          client: state.planData.client || null,
          client_id: state.planData.client_id || null,
          campaign: state.planData.name, // Campaign equals plan name
          utm_campaign_slug: state.planData.utm_campaign_slug || null,
          start_date: state.planData.start_date,
          end_date: state.planData.end_date,
          total_budget: state.planData.total_budget,
          default_url: state.planData.default_url || null,
          objectives: state.planData.objectives.length > 0 ? state.planData.objectives : null,
          kpis: Object.keys(state.planData.kpis).length > 0 ? state.planData.kpis : null,
          hierarchy_order: planHierarchyOrder, // Now we save the updated hierarchy
        })
        .eq('id', planId);

      if (planError) throw planError;

      // 2. Delete orphan lines
      const newSubIds = new Set(state.subdivisions.map(s => s.id));
      const newMomIds = new Set(Object.values(state.moments).flat().map(m => m.id));
      const newFunnelIds = new Set(Object.values(state.funnelStages).flat().map(f => f.id));

      for (const line of existingLines) {
        const subOrphan = line.subdivision_id && !newSubIds.has(line.subdivision_id);
        const momOrphan = line.moment_id && !newMomIds.has(line.moment_id);
        const funnelOrphan = line.funnel_stage_id && !newFunnelIds.has(line.funnel_stage_id);
        
        if (subOrphan || momOrphan || funnelOrphan) {
          await supabase.from('media_lines').delete().eq('id', line.id);
        }
      }

      // 3. Delete all existing distributions
      await supabase
        .from('plan_budget_distributions')
        .delete()
        .eq('media_plan_id', planId);

      // 4. Save new budget distributions dynamically based on planHierarchyOrder
      const distIds: Record<string, string> = {}; // path -> distribution ID

      // Helper to insert distribution and store its ID
      const insertDistribution = async (
        level: HierarchyLevel,
        allocation: BudgetAllocation,
        parentDistId: string | null,
        path: string
      ) => {
        const { data: dist, error } = await supabase
          .from('plan_budget_distributions')
          .insert({
            user_id: user?.id,
            media_plan_id: planId,
            distribution_type: level,
            reference_id: allocation.id === 'geral' ? null : allocation.id,
            percentage: allocation.percentage,
            amount: allocation.amount,
            parent_distribution_id: parentDistId,
            start_date: allocation.start_date || null,
            end_date: allocation.end_date || null,
          })
          .select('id')
          .single();

        if (error) {
          console.error(`Error saving ${level} distribution:`, error);
          return null;
        }
        distIds[path] = dist.id;
        return dist.id;
      };

      // Process each hierarchy level in order
      const processLevel = async (
        levelIndex: number,
        parentPath: string,
        parentDistId: string | null,
        parentBudget: number
      ) => {
        if (levelIndex >= planHierarchyOrder.length) return;

        const level = planHierarchyOrder[levelIndex];
        
        // Get allocations for this level using the full parent path
        const allocKey = parentPath === '' ? 'root' : parentPath;
        let allocations = getAllocationsForLevelAtPath(level, allocKey);
        
        // If no allocations, use "Geral"
        if (allocations.length === 0) {
          allocations = [createGeralAllocation(parentBudget)];
        }

        // Insert each allocation and recursively process children
        for (const alloc of allocations) {
          const allocAmount = wizard.calculateAmount(parentBudget, alloc.percentage);
          const allocPath = parentPath === '' ? alloc.id : `${parentPath}_${alloc.id}`;
          
          const distId = await insertDistribution(level, { ...alloc, amount: allocAmount }, parentDistId, allocPath);
          
          if (distId) {
            // Process next level with the full path
            await processLevel(levelIndex + 1, allocPath, distId, allocAmount);
          }
        }
      };

      // Start processing from level 0
      await processLevel(0, '', null, state.planData.total_budget);

      toast.success(exitAfterSave ? 'Plano atualizado com sucesso!' : 'Alterações salvas!');
      if (exitAfterSave) {
        navigate(planSlug ? `/media-plans/${planSlug}` : '/media-plans');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Erro ao atualizar plano');
    } finally {
      setSaving(false);
      setShowOrphanWarning(false);
    }
  };

  const handleSubdivisionAdd = (item: BudgetAllocation) => {
    setSubdivisions([...state.subdivisions, item]);
  };

  const handleSubdivisionUpdate = (itemId: string, percentage: number) => {
    setSubdivisions(state.subdivisions.map(s => 
      s.id === itemId ? { ...s, percentage, amount: wizard.calculateAmount(state.planData.total_budget, percentage) } : s
    ));
  };

  const handleSubdivisionRemove = (itemId: string) => {
    setSubdivisions(state.subdivisions.filter(s => s.id !== itemId));
  };

  const handleCreateSubdivision = async (name: string) => {
    const result = await libraryMutations.createSubdivision.mutateAsync({ name });
    return result;
  };

  const handleMomentAdd = (key: string, item: BudgetAllocation) => {
    const current = state.moments[key] || [];
    setMoments(key, [...current, item]);
  };

  const handleMomentUpdate = (key: string, itemId: string, percentage: number, dates?: { start_date?: string; end_date?: string }) => {
    const current = state.moments[key] || [];
    setMoments(key, current.map(m => 
      m.id === itemId ? { ...m, percentage, ...(dates && { start_date: dates.start_date, end_date: dates.end_date }) } : m
    ));
  };

  const handleMomentRemove = (key: string, itemId: string) => {
    const current = state.moments[key] || [];
    setMoments(key, current.filter(m => m.id !== itemId));
  };

  const handleCreateMoment = async (name: string) => {
    const result = await libraryMutations.createMoment.mutateAsync({ name });
    return result;
  };

  const handleFunnelAdd = (key: string, item: BudgetAllocation) => {
    const current = state.funnelStages[key] || [];
    if (current.length >= MAX_ITEMS_PER_LEVEL.funnel_stage) {
      toast.error(`Máximo de ${MAX_ITEMS_PER_LEVEL.funnel_stage} fases do funil`);
      return;
    }
    setFunnelStages(key, [...current, item]);
  };

  const handleFunnelUpdate = (key: string, itemId: string, percentage: number) => {
    const current = state.funnelStages[key] || [];
    setFunnelStages(key, current.map(f => 
      f.id === itemId ? { ...f, percentage } : f
    ));
  };

  const handleFunnelRemove = (key: string, itemId: string) => {
    const current = state.funnelStages[key] || [];
    setFunnelStages(key, current.filter(f => f.id !== itemId));
  };

  const handleFunnelReorder = (key: string, stages: BudgetAllocation[]) => {
    setFunnelStages(key, stages);
  };

  const handleCreateFunnelStage = async (name: string) => {
    const result = await libraryMutations.createFunnelStage.mutateAsync({ name });
    return result;
  };

  const subdivisionsForContext = state.subdivisions.length > 0 
    ? state.subdivisions 
    : [{ id: 'root', name: 'Plano Completo', percentage: 100, amount: state.planData.total_budget }];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const renderContent = () => {
    return (
      <div className="space-y-6">
        {/* Step 0: Structure (Hierarchy) */}
        {state.step === 0 && (
          <motion.div
            key="structure-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {existingLines.length > 0 && hierarchyChanged && (
              <Alert className="border-amber-500/30 bg-amber-500/5 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-sm">
                  Alterar a estrutura afetará as {existingLines.length} linha(s) de mídia existentes. 
                  Os orçamentos mensais serão apagados e os vínculos de níveis removidos serão limpos.
                </AlertDescription>
              </Alert>
            )}
            
            <HierarchyOrderSelector
              selectedLevels={planHierarchyOrder}
              onOrderChange={handleHierarchyChange}
              disabled={false}
            />
            
            {hierarchyChanged && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">Estrutura alterada</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  A nova estrutura será aplicada ao salvar o plano.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 1: Plan basics */}
        {state.step >= 1 && (
          <AnimatePresence mode="wait">
            {state.step === 1 || editingSection === 'plan' ? (
              <motion.div
                key="plan-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Informações do Plano</CardTitle>
                        <CardDescription>
                          Edite os dados básicos, orçamento e KPIs
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Info about current hierarchy */}
                    {planHierarchyOrder.length > 0 && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Estrutura atual: <span className="font-medium text-foreground">{planHierarchyOrder.map(l => getLevelLabel(l)).join(' → ')}</span>
                          {hierarchyChanged && <Badge variant="outline" className="ml-2 text-xs">Alterada</Badge>}
                        </p>
                      </div>
                    )}
                    {planHierarchyOrder.length === 0 && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-primary font-medium">
                          Orçamento Geral (sem divisões)
                          {hierarchyChanged && <Badge variant="outline" className="ml-2 text-xs">Alterado</Badge>}
                        </p>
                      </div>
                    )}

                    {getPlanInfoMissingFields().length > 0 && (
                      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                        Campos obrigatórios pendentes: {getPlanInfoMissingFields().join(', ')}
                      </div>
                    )}

                    <SlugInputField
                      name={state.planData.name}
                      slug={state.planData.utm_campaign_slug}
                      onNameChange={(name) => updatePlanData({ name })}
                      onSlugChange={(utm_campaign_slug) => updatePlanData({ utm_campaign_slug })}
                    />

                    <LibrarySelector
                      label="Cliente"
                      placeholder="Selecione um cliente..."
                      items={libraryData.clients.map(c => ({ id: c.id, name: c.name }))}
                      value={state.planData.client_id}
                      onChange={(id) => {
                        const selectedClient = libraryData.clients.find(c => c.id === id);
                        updatePlanData({ 
                          client_id: id, 
                          client: selectedClient?.name || '' 
                        });
                      }}
                      onCreate={async (name) => {
                        const result = await libraryMutations.createClient.mutateAsync({ name });
                        return { id: result.id, name: result.name };
                      }}
                      createLabel="Novo cliente"
                      required
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Data de Início *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={state.planData.start_date}
                          onChange={(e) => updatePlanData({ start_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date">Data de Término *</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={state.planData.end_date}
                          onChange={(e) => updatePlanData({ end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="total_budget">Orçamento Total (R$) *</Label>
                      <Input
                        id="total_budget"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 100000"
                        value={state.planData.total_budget || ''}
                        onChange={(e) => updatePlanData({ total_budget: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <LabelWithTooltip 
                        htmlFor="default_url" 
                        tooltip="URL padrão de destino para as linhas de mídia. Será usada como base para os parâmetros UTM."
                      >
                        URL Padrão de Destino
                      </LabelWithTooltip>
                      <Input
                        id="default_url"
                        type="url"
                        placeholder="https://seusite.com.br/campanha"
                        value={state.planData.default_url}
                        onChange={(e) => updatePlanData({ default_url: e.target.value })}
                      />
                      {state.planData.default_url && !/^https?:\/\/.+/.test(state.planData.default_url) && (
                        <p className="text-xs text-destructive">URL inválida. Use o formato https://exemplo.com</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Objetivos Gerais da Campanha</Label>
                      <Input
                        placeholder="Ex: Aumentar brand awareness, gerar leads qualificados"
                        value={state.planData.objectives.join(', ')}
                        onChange={(e) => updatePlanData({ 
                          objectives: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                      />
                      <p className="text-xs text-muted-foreground">Separe os objetivos por vírgula</p>
                    </div>

                    <div className="space-y-3">
                      <Label>KPIs Relevantes (opcional)</Label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {KPI_OPTIONS.map(kpi => (
                          <div key={kpi.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={kpi.key}
                              checked={kpi.key in state.planData.kpis}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updatePlanData({ kpis: { ...state.planData.kpis, [kpi.key]: 0 } });
                                } else {
                                  const { [kpi.key]: _, ...rest } = state.planData.kpis;
                                  updatePlanData({ kpis: rest });
                                }
                              }}
                            />
                            <Label htmlFor={kpi.key} className="text-sm font-normal flex-1 cursor-pointer">
                              {kpi.label}
                            </Label>
                            {kpi.key in state.planData.kpis && (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24"
                                placeholder={kpi.unit}
                                value={state.planData.kpis[kpi.key] || ''}
                                onChange={(e) => updatePlanData({
                                  kpis: { ...state.planData.kpis, [kpi.key]: parseFloat(e.target.value) || 0 }
                                })}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {editingSection === 'plan' && (
                      <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => setEditingSection(null)}>
                          Salvar alterações
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : state.step > 1 && (
              <motion.div
                key="plan-summary"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <PlanSummaryCard
                  planData={state.planData}
                  onEdit={() => setEditingSection('plan')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Dynamic hierarchy level steps */}
        {planHierarchyOrder.map((level, levelIndex) => {
          const stepNumber = levelIndex + 2; // Steps 2+ are hierarchy levels
          const Icon = LEVEL_ICONS[level];
          const config = LEVEL_DESCRIPTIONS[level];
          const maxItems = MAX_ITEMS_PER_LEVEL[level];
          const libraryItems = getLibraryForLevel(level);
          const showDates = level === 'moment';
          const parentItems = getParentItemsForLevel(levelIndex);

          return (
            <React.Fragment key={level}>
              {state.step >= stepNumber && (
                <AnimatePresence mode="wait">
                  {state.step === stepNumber || editingSection === level ? (
                    <motion.div
                      key={`${level}-form`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card>
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle>{config.title}</CardTitle>
                              <CardDescription>{config.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {parentItems.map(parent => {
                            const allocations = getAllocationsForLevelAtPath(level, parent.path);
                            
                            return (
                              <div key={parent.path} className="border rounded-xl p-4 space-y-4 bg-muted/20">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    {levelIndex > 0 && parent.breadcrumb !== parent.name && (
                                      <span className="text-xs text-muted-foreground mb-1">{parent.breadcrumb}</span>
                                    )}
                                    <h4 className="font-semibold">{parent.name}</h4>
                                  </div>
                                  <span className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
                                    {formatCurrency(parent.amount)}
                                  </span>
                                </div>

                                {level === 'funnel_stage' ? (
                                  <>
                                    {allocations.length < maxItems && (
                                      <FunnelStageSelector
                                        existingItems={libraryItems}
                                        selectedItems={allocations}
                                        onAdd={(item) => handleLevelAdd(level, parent.path, item)}
                                        onCreate={(name) => handleCreateItem(level, name)}
                                        maxItems={maxItems}
                                      />
                                    )}
                                    
                                    {allocations.length > 0 && (
                                      <div className="mt-4">
                                        <p className="text-sm text-muted-foreground mb-3">Arraste para reordenar as fases:</p>
                                        <SortableFunnelList
                                          items={allocations}
                                          totalBudget={parent.amount}
                                          onUpdate={(id, percentage) => handleLevelUpdate(level, parent.path, id, percentage)}
                                          onRemove={(id) => handleLevelRemove(level, parent.path, id)}
                                          onReorder={(items) => handleLevelReorder(level, parent.path, items)}
                                        />
                                      </div>
                                    )}

                                    {allocations.length > 0 && (
                                      <div className="pt-4 border-t">
                                        <p className="text-sm text-muted-foreground mb-4">Visualização do Funil:</p>
                                        <FunnelVisualization
                                          funnelStages={allocations}
                                          parentBudget={parent.amount}
                                          parentName={parent.name}
                                          onEdit={() => {}}
                                        />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <BudgetAllocationTable
                                    items={allocations}
                                    existingItems={libraryItems}
                                    totalBudget={parent.amount}
                                    onAdd={(item) => handleLevelAdd(level, parent.path, item)}
                                    onUpdate={(id, percentage, dates) => handleLevelUpdate(level, parent.path, id, percentage, dates)}
                                    onRemove={(id) => handleLevelRemove(level, parent.path, id)}
                                    onCreate={(name) => handleCreateItem(level, name)}
                                    label={getLevelLabel(level)}
                                    createLabel={`Criar ${getLevelLabel(level).toLowerCase()}`}
                                    maxItems={maxItems}
                                    showDates={showDates}
                                    planStartDate={state.planData.start_date}
                                    planEndDate={state.planData.end_date}
                                  />
                                )}
                              </div>
                            );
                          })}

                          {levelIndex === 0 && getAllocationsForLevelAtPath(level, 'root').length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                              Nenhuma {getLevelLabel(level).toLowerCase()} adicionada. O plano será tratado como "Geral".
                            </p>
                          )}

                          {editingSection === level && (
                            <div className="flex justify-end pt-4 border-t">
                              <Button onClick={() => setEditingSection(null)}>
                                Salvar alterações
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : state.step > stepNumber && levelIndex === 0 && getAllocationsForLevelAtPath(level, 'root').length > 0 ? (
                    <motion.div
                      key={`${level}-summary`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SubdivisionsSummaryCard
                        subdivisions={getAllocationsForLevelAtPath(level, 'root')}
                        totalBudget={state.planData.total_budget}
                        onEdit={() => setEditingSection(level)}
                        title={getLevelLabelPlural(level)}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              )}
            </React.Fragment>
          );
        })}

        {/* Confirm Step (last step) */}
        {state.step === lastStep && (
          <motion.div
            key="confirm-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Confirmar Alterações</CardTitle>
                    <CardDescription>
                      Revise as configurações e salve as alterações do plano.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    As alterações serão salvas e substituirão as distribuições atuais do plano.
                  </p>
                  {existingLines.length > 0 && (
                    <p className="text-sm text-amber-600 mt-2">
                      Se você remover subdivisões, momentos ou fases que têm linhas de mídia, essas linhas serão excluídas.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(planSlug ? `/media-plans/${planSlug}` : '/media-plans')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Editar Plano de Mídia</h1>
            <p className="text-muted-foreground">Modifique as configurações do plano</p>
          </div>
        </div>

        {/* Wizard Steps */}
        <WizardStepper
          steps={wizardSteps}
          currentStep={state.step}
          onStepClick={goToStep}
          allowAllStepsClickable={true}
        />

        {/* Content */}
        {renderContent()}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={state.step === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex gap-2">
            {/* Save buttons - always visible */}
            <Button
              variant="outline"
              onClick={handleSaveOnly}
              disabled={saving || !canSave()}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveAndExit}
              disabled={saving || !canSave()}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Salvar e Sair
            </Button>

            {/* Next button - only on steps before last */}
            {state.step < lastStep && (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2"
              >
                Próximo
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Orphan Lines Warning Dialog */}
      <AlertDialog open={showOrphanWarning} onOpenChange={setShowOrphanWarning}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Linhas de mídia serão excluídas
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong>{orphanLinesData.count} linha(s)</strong> de mídia estão vinculadas a subdivisões, momentos ou fases que serão removidas.
                  Essas linhas serão <strong className="text-destructive">excluídas permanentemente</strong>.
                </p>
                {orphanLinesData.lines.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1 font-medium">Código</th>
                          <th className="text-left px-2 py-1 font-medium">Plataforma</th>
                          <th className="text-left px-2 py-1 font-medium">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orphanLinesData.lines.slice(0, 10).map((line) => (
                          <tr key={line.id} className="border-t">
                            <td className="px-2 py-1 font-mono text-xs">{line.line_code}</td>
                            <td className="px-2 py-1">{line.platform}</td>
                            <td className="px-2 py-1 text-muted-foreground">{line.reason}</td>
                          </tr>
                        ))}
                        {orphanLinesData.lines.length > 10 && (
                          <tr className="border-t">
                            <td colSpan={3} className="px-2 py-1 text-muted-foreground text-center">
                              ...e mais {orphanLinesData.lines.length - 10} linha(s)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSave(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir e Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hierarchy Change Warning Dialog */}
      <AlertDialog open={showHierarchyWarning} onOpenChange={setShowHierarchyWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alterar Estrutura do Plano?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Alterar a estrutura hierárquica terá os seguintes impactos:</p>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li>Distribuições de orçamento serão recalculadas</li>
                  <li>Orçamentos mensais por linha serão apagados</li>
                  {existingLines.length > 0 && (
                    <li>As {existingLines.length} linha(s) de mídia serão mantidas, mas os vínculos com níveis removidos serão limpos</li>
                  )}
                </ul>
                <p className="font-medium mt-3">Deseja continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingHierarchyChange(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmHierarchyChange}>
              Confirmar Alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}