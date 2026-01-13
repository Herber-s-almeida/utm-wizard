import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, Loader2, Layers, Clock, Filter, Calendar, FileText, Sparkles, Edit2, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { WizardStepper } from '@/components/media-plan/WizardStepper';
import { BudgetAllocationTable } from '@/components/media-plan/BudgetAllocationTable';
import { PlanSummaryCard } from '@/components/media-plan/PlanSummaryCard';
import { SubdivisionsSummaryCard } from '@/components/media-plan/SubdivisionsSummaryCard';
import { FunnelVisualization } from '@/components/media-plan/FunnelVisualization';
import { SortableFunnelList } from '@/components/media-plan/SortableFunnelList';
import { FunnelStageSelector } from '@/components/media-plan/FunnelStageSelector';
import { TemporalEqualizer, generateTemporalPeriods } from '@/components/media-plan/TemporalEqualizer';
import { SlugInputField } from '@/components/media-plan/SlugInputField';
import { HierarchyOrderSelector } from '@/components/media-plan/HierarchyOrderSelector';
import { NestedHierarchyLevel } from '@/components/media-plan/NestedHierarchyLevel';
import { useMediaPlanWizard, BudgetAllocation } from '@/hooks/useMediaPlanWizard';
import { KPI_OPTIONS } from '@/types/media';
import { HierarchyLevel, getLevelLabel, getLevelLabelPlural, HIERARCHY_LEVEL_CONFIG } from '@/types/hierarchy';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';
import { CreateKpiDialog } from '@/components/media-plan/CreateKpiDialog';
import { useCustomKpis } from '@/hooks/useCustomKpis';
import { useWizardDraft, DraftData } from '@/hooks/useWizardDraft';
import { DraftRecoveryDialog } from '@/components/media-plan/DraftRecoveryDialog';
import { LibrarySelector } from '@/components/media-plan/LibrarySelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const MAX_SUBDIVISIONS = 12;
const MAX_FUNNEL_STAGES = 7;
const MAX_MOMENTS = 12;

// Helper to create a "Geral" allocation
const createGeralAllocation = (budget: number): BudgetAllocation => ({
  id: 'geral',
  name: 'Geral',
  percentage: 100,
  amount: budget,
});

// Icons for hierarchy levels
const LEVEL_ICONS: Record<HierarchyLevel, React.ElementType> = {
  subdivision: Layers,
  moment: Clock,
  funnel_stage: Filter,
};

// Max items per level
const MAX_ITEMS_PER_LEVEL: Record<HierarchyLevel, number> = {
  subdivision: MAX_SUBDIVISIONS,
  moment: MAX_MOMENTS,
  funnel_stage: MAX_FUNNEL_STAGES,
};

// Descriptions per level
const LEVEL_DESCRIPTIONS: Record<HierarchyLevel, { title: string; description: string }> = {
  subdivision: {
    title: 'Subdivisão do Plano',
    description: 'Divida o orçamento por cidade, produto ou outra subdivisão. Esta etapa é opcional. Se não adicionar subdivisões, o plano será tratado como "Geral".',
  },
  moment: {
    title: 'Momentos de Campanha',
    description: 'Momentos de campanha representam as fases estratégicas de veiculação de um plano de mídia, como lançamento, sustentação ou períodos específicos de maior intensidade. Essa configuração permite priorizar investimento em determinados momentos, criar campanhas faseadas ou concentrar verba conforme a estratégia definida. Essa etapa é opcional.',
  },
  funnel_stage: {
    title: 'Fases do Funil',
    description: 'As fases do funil representam os estágios da jornada do público, como awareness, consideração e conversão. Essa configuração permite distribuir o orçamento de acordo com o papel de cada fase, ajustando o investimento conforme o objetivo da campanha em cada etapa.',
  },
};


export default function NewMediaPlanBudget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wizard = useMediaPlanWizard();
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [temporalPeriods, setTemporalPeriods] = useState<any[]>([]);
  const { customKpis } = useCustomKpis();
  
  // Draft recovery state
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);

  const { 
    state, 
    totalSteps,
    wizardSteps,
    goToStep, 
    updatePlanData, 
    setHierarchyOrder,
    setSubdivisions, 
    setMoments, 
    setFunnelStages, 
    setTemporalGranularity, 
    libraryData, 
    libraryMutations, 
    setFullState,
    getLibraryForLevel,
    getCreateMutationForLevel,
  } = wizard;
  
  // Calculate review step number dynamically
  const reviewStepNumber = totalSteps - 1;
  
  // Auto-save draft hook
  const { checkForDraft, clearDraft, loadDraft } = useWizardDraft(state, setFullState, false);
  
  // Check for existing draft on mount
  useEffect(() => {
    const draft = checkForDraft();
    if (draft) {
      setPendingDraft(draft);
      setShowDraftDialog(true);
    }
  }, []);
  
  const handleContinueDraft = () => {
    if (pendingDraft) {
      loadDraft(pendingDraft);
      toast.success('Rascunho restaurado');
    }
    setShowDraftDialog(false);
    setPendingDraft(null);
  };
  
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftDialog(false);
    setPendingDraft(null);
    toast.info('Rascunho descartado');
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

  // Get allocations for a level at a specific path (supports full hierarchical paths)
  const getAllocationsForLevel = useCallback((level: HierarchyLevel, parentPath: string = 'root'): BudgetAllocation[] => {
    switch (level) {
      case 'subdivision':
        return state.subdivisions[parentPath] || [];
      case 'moment':
        return state.moments[parentPath] || [];
      case 'funnel_stage':
        return state.funnelStages[parentPath] || [];
      default:
        return [];
    }
  }, [state.subdivisions, state.moments, state.funnelStages]);

  // Set allocations for a level at a specific path
  const setAllocationsForLevel = useCallback((level: HierarchyLevel, parentKey: string, allocations: BudgetAllocation[]) => {
    switch (level) {
      case 'subdivision':
        setSubdivisions(parentKey, allocations);
        break;
      case 'moment':
        setMoments(parentKey, allocations);
        break;
      case 'funnel_stage':
        setFunnelStages(parentKey, allocations);
        break;
    }
  }, [setSubdivisions, setMoments, setFunnelStages]);

  // Calculate completion percentage based on filled fields
  const calculateCompletionPercentage = () => {
    let filledFields = 0;
    let totalFields = 0;
    
    // Step 0: Hierarchy config - always counts as filled (0 levels = General budget is valid)
    filledFields += 1;
    totalFields += 1;
    
    // Step 1 fields
    const step1Fields = [
      !!state.planData.name.trim(),
      !!state.planData.start_date,
      !!state.planData.end_date,
      state.planData.total_budget > 0,
    ];
    filledFields += step1Fields.filter(Boolean).length;
    totalFields += step1Fields.length;
    
    // Dynamic steps completion
    for (let i = 0; i < state.hierarchyOrder.length; i++) {
      if (state.step > i + 2) filledFields += 1;
      totalFields += 1;
    }
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

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

  // Get validation errors for current step - validates each group separately
  const getValidationErrorsForStep = (): string[] => {
    const errors: string[] = [];
    
    switch (state.step) {
      case 0:
        // Hierarchy configuration - always valid
        break;
      case 1:
        return getPlanInfoMissingFields();
      default: {
        const levelIndex = state.step - 2;
        if (levelIndex >= 0 && levelIndex < state.hierarchyOrder.length) {
          const level = state.hierarchyOrder[levelIndex];
          const levelLabel = getLevelLabelPlural(level);
          
          if (levelIndex === 0) {
            // First level: validate root only
            const allocations = getAllocationsForLevel(level, 'root');
            if (allocations.length > 0) {
              const total = allocations.reduce((sum, a) => sum + a.percentage, 0);
              if (Math.abs(total - 100) > 0.01) {
                errors.push(`${levelLabel}: soma é ${total.toFixed(1)}% (deve ser 100%)`);
              }
            }
          } else {
            // Nested levels: validate each group separately
            const parentItems = getParentItemsForLevel(levelIndex);
            for (const parent of parentItems) {
              const allocations = getAllocationsForLevel(level, parent.path);
              if (allocations.length > 0) {
                const total = allocations.reduce((sum, a) => sum + a.percentage, 0);
                if (Math.abs(total - 100) > 0.01) {
                  errors.push(`${parent.breadcrumb}: soma é ${total.toFixed(1)}% (deve ser 100%)`);
                }
              }
            }
          }
        }
      }
    }
    
    return errors;
  };

  const canProceed = () => getValidationErrorsForStep().length === 0;

  const handleNext = () => {
    const errors = getValidationErrorsForStep();
    
    if (errors.length > 0) {
      if (state.step === 1) {
        toast.error(`Preencha os campos obrigatórios: ${errors.join(', ')}`);
      } else if (errors.length === 1) {
        toast.error(errors[0]);
      } else {
        toast.error(`${errors.length} problemas encontrados. Verifique as alocações.`);
      }
      return;
    }

    if (state.step < reviewStepNumber) {
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


  const handleSave = async () => {
    const missing = getPlanInfoMissingFields();
    if (missing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missing.join(', ')}`);
      goToStep(1);
      return;
    }

    setSaving(true);
    try {
      // 1. Create the media plan with hierarchy_order
      const { data: plan, error: planError } = await supabase
        .from('media_plans')
        .insert({
          user_id: user?.id,
          name: state.planData.name,
          client: state.planData.client || null,
          client_id: state.planData.client_id || null,
          campaign: state.planData.name,
          utm_campaign_slug: state.planData.utm_campaign_slug || null,
          start_date: state.planData.start_date,
          end_date: state.planData.end_date,
          total_budget: state.planData.total_budget,
          default_url: state.planData.default_url || null,
          objectives: state.planData.objectives.length > 0 ? state.planData.objectives : null,
          kpis: Object.keys(state.planData.kpis).length > 0 ? state.planData.kpis : null,
          status: 'draft',
          hierarchy_order: state.hierarchyOrder, // Save the hierarchy order
        })
        .select()
        .single();

      if (planError) throw planError;

      // 2. Save budget distributions dynamically based on hierarchy order
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
            media_plan_id: plan.id,
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
        if (levelIndex >= state.hierarchyOrder.length) return;

        const level = state.hierarchyOrder[levelIndex];
        
        // Get allocations for this level using the full parent path
        // For first level, use 'root', otherwise use the full hierarchical path
        const allocKey = parentPath === '' ? 'root' : parentPath;
        let allocations = getAllocationsForLevel(level, allocKey);
        
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

      // Clear draft on successful save
      clearDraft();
      toast.success('Plano salvo com sucesso!');
      navigate(`/media-plans/${plan.slug || plan.id}`);
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Erro ao salvar plano');
    } finally {
      setSaving(false);
    }
  };

  // Generic handlers for level allocations
  const handleLevelAdd = (level: HierarchyLevel, parentKey: string, item: BudgetAllocation) => {
    const current = getAllocationsForLevel(level, parentKey);
    const maxItems = MAX_ITEMS_PER_LEVEL[level];
    
    if (current.length >= maxItems) {
      toast.error(`Máximo de ${maxItems} ${getLevelLabelPlural(level).toLowerCase()}`);
      return;
    }
    
    // For moments, add default dates
    if (level === 'moment') {
      item = {
        ...item,
        start_date: state.planData.start_date,
        end_date: state.planData.end_date,
      };
    }
    
    setAllocationsForLevel(level, parentKey, [...current, item]);
  };

  const handleLevelUpdate = (level: HierarchyLevel, parentKey: string, id: string, percentage: number, dates?: { start_date?: string; end_date?: string }) => {
    const current = getAllocationsForLevel(level, parentKey);
    setAllocationsForLevel(level, parentKey, current.map(item => 
      item.id === id ? { ...item, percentage, ...(dates || {}) } : item
    ));
  };

  const handleLevelRemove = (level: HierarchyLevel, parentKey: string, id: string) => {
    const current = getAllocationsForLevel(level, parentKey);
    setAllocationsForLevel(level, parentKey, current.filter(item => item.id !== id));
  };

  const handleLevelReorder = (level: HierarchyLevel, parentKey: string, items: BudgetAllocation[]) => {
    setAllocationsForLevel(level, parentKey, items);
  };

  const handleCreateItem = async (level: HierarchyLevel, name: string) => {
    const mutation = getCreateMutationForLevel(level);
    if (!mutation) return null;
    const result = await mutation.mutateAsync({ name });
    return result;
  };

  // Interface for parent items with full path support
  interface ParentItem {
    id: string;
    name: string;
    path: string;
    breadcrumb: string;
    percentage: number;
    amount: number;
  }

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

      const level = state.hierarchyOrder[currentLevelIndex];
      const allocations = getAllocationsForLevel(level, parentPath);

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

  // Render a dynamic level step
  const renderLevelStep = (levelIndex: number) => {
    const level = state.hierarchyOrder[levelIndex];
    const stepNumber = levelIndex + 2; // Steps 0=config, 1=plan, 2+=levels
    const Icon = LEVEL_ICONS[level];
    const config = LEVEL_DESCRIPTIONS[level];

    return (
      <AnimatePresence mode="wait" key={`level-${levelIndex}`}>
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
                    <CardDescription className="text-sm leading-relaxed">
                      {config.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <NestedHierarchyLevel
                  hierarchyOrder={state.hierarchyOrder}
                  targetLevelIndex={levelIndex}
                  parentPath="root"
                  parentBreadcrumb=""
                  parentAmount={state.planData.total_budget}
                  depth={0}
                  getAllocations={getAllocationsForLevel}
                  onAdd={handleLevelAdd}
                  onUpdate={handleLevelUpdate}
                  onRemove={handleLevelRemove}
                  onReorder={handleLevelReorder}
                  onCreate={handleCreateItem}
                  getLibraryItems={getLibraryForLevel}
                  calculateAmount={wizard.calculateAmount}
                  maxItemsPerLevel={MAX_ITEMS_PER_LEVEL}
                  planStartDate={state.planData.start_date}
                  planEndDate={state.planData.end_date}
                />

                {/* Empty state for first level */}
                {levelIndex === 0 && getAllocationsForLevel(level, 'root').length === 0 && (
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
        ) : state.step > stepNumber && levelIndex === 0 && getAllocationsForLevel(level, 'root').length > 0 ? (
          <motion.div
            key={`${level}-summary`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <SubdivisionsSummaryCard
              subdivisions={getAllocationsForLevel(level, 'root')}
              totalBudget={state.planData.total_budget}
              onEdit={() => setEditingSection(level)}
              title={getLevelLabelPlural(level)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
  };

  // Render sections based on current step
  const renderContent = () => {
    return (
      <div className="space-y-6">
        {/* Step 0: Hierarchy Configuration */}
        {state.step === 0 && (
          <motion.div
            key="hierarchy-config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HierarchyOrderSelector
              selectedLevels={state.hierarchyOrder}
              onOrderChange={setHierarchyOrder}
            />
          </motion.div>
        )}

        {/* Step 1: Plan basics - always show summary if completed, or form if editing */}
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
                          Defina os dados básicos, orçamento e KPIs
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                          max={state.planData.end_date || "2099-12-31"}
                          min="2000-01-01"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 10) {
                              updatePlanData({ start_date: value });
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date">Data de Término *</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={state.planData.end_date}
                          min={state.planData.start_date || "2000-01-01"}
                          max="2099-12-31"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 10) {
                              updatePlanData({ end_date: value });
                            }
                          }}
                        />
                        {state.planData.start_date && state.planData.end_date && state.planData.end_date <= state.planData.start_date && (
                          <p className="text-xs text-destructive">A data de término deve ser posterior à data de início</p>
                        )}
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
                      <textarea
                        placeholder="Descreva os objetivos gerais da campanha..."
                        value={state.planData.objectives.join('\n')}
                        onChange={(e) => {
                          const text = e.target.value.slice(0, 500);
                          updatePlanData({ 
                            objectives: text ? [text] : [] 
                          });
                        }}
                        maxLength={500}
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        {(state.planData.objectives.join('\n') || '').length}/500 caracteres
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>KPIs Relevantes (opcional)</Label>
                        <CreateKpiDialog 
                          onKpiCreated={(kpi) => {
                            updatePlanData({ kpis: { ...state.planData.kpis, [kpi.key]: 0 } });
                          }}
                        />
                      </div>
                      
                      {/* Standard KPIs */}
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

                      {/* Custom KPIs */}
                      {customKpis.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">KPIs Personalizados</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {customKpis.map(kpi => (
                              <div key={kpi.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-dashed border-border/50">
                                <Checkbox
                                  id={`custom-${kpi.key}`}
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
                                <Label htmlFor={`custom-${kpi.key}`} className="text-sm font-normal flex-1 cursor-pointer">
                                  {kpi.name}
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
                      )}
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
            ) : state.step > 1 && state.step < reviewStepNumber && (
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

        {/* Dynamic level steps */}
        {state.hierarchyOrder.map((level, index) => {
          const stepNumber = index + 2;
          if (state.step >= stepNumber) {
            return renderLevelStep(index);
          }
          return null;
        })}

        {/* Review Step */}
        {state.step === reviewStepNumber && (
          <motion.div
            key="review-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* 1. Plan Summary Card */}
            <PlanSummaryCard
              planData={state.planData}
              onEdit={() => goToStep(1)}
              showEditButton={true}
            />

            {/* 2. Hierarchy Summary */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <CardTitle className="text-lg">Estrutura do Plano</CardTitle>
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full min-w-[100px]" />
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                      <span className="text-success font-bold text-sm">✓</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => goToStep(0)}>
                    <Edit2 className="h-3.5 w-3.5" />
                    editar
                  </Button>
                </div>
                <CardDescription className="text-sm mt-2">
                  {state.hierarchyOrder.length > 0 
                    ? `Ordem: ${state.hierarchyOrder.map(l => getLevelLabel(l)).join(' → ')}`
                    : 'Orçamento Geral (sem divisões)'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* General budget - no hierarchy */}
                {state.hierarchyOrder.length === 0 && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="py-4 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">Orçamento Geral</CardTitle>
                        </div>
                        <span className="text-sm font-medium text-primary">
                          100% - {formatCurrency(state.planData.total_budget)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground">
                        Plano simples sem divisões de orçamento. Todo o investimento será gerenciado como um único bloco.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Render first level allocations with nested children */}
                {state.hierarchyOrder.length > 0 && (
                  <>
                    {(() => {
                      const firstLevel = state.hierarchyOrder[0];
                      const firstAllocations = getAllocationsForLevel(firstLevel, 'root');
                      const effectiveFirst = firstAllocations.length > 0 
                        ? firstAllocations 
                        : [{ id: 'root', name: 'Geral', percentage: 100, amount: state.planData.total_budget }];

                      return effectiveFirst.map((item) => {
                        const itemBudget = wizard.calculateAmount(state.planData.total_budget, item.percentage);
                        
                        // Get second level allocations
                        const secondLevel = state.hierarchyOrder[1];
                        const secondAllocations = secondLevel ? getAllocationsForLevel(secondLevel, item.id) : [];
                        
                        // Get third level allocations
                        const thirdLevel = state.hierarchyOrder[2];
                        const thirdAllocations = thirdLevel ? getAllocationsForLevel(thirdLevel, item.id) : [];

                        return (
                          <Card key={item.id} className="bg-muted/30 border-border/50">
                            <CardHeader className="py-3 px-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const Icon = LEVEL_ICONS[firstLevel];
                                    return <Icon className="h-4 w-4 text-muted-foreground" />;
                                  })()}
                                  <CardTitle className="text-base">{item.name}</CardTitle>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {item.percentage}% - {formatCurrency(itemBudget)}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-4">
                              {/* Second level */}
                              {secondLevel && secondAllocations.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                    {(() => {
                                      const Icon = LEVEL_ICONS[secondLevel];
                                      return <Icon className="h-3 w-3" />;
                                    })()}
                                    {getLevelLabelPlural(secondLevel)}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {secondAllocations.map(alloc => (
                                      <span key={alloc.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                        {alloc.name} ({alloc.percentage}%)
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Third level - Funnel visualization */}
                              {thirdLevel === 'funnel_stage' && thirdAllocations.length > 0 && (
                                <div className="mt-4">
                                  <FunnelVisualization
                                    funnelStages={thirdAllocations}
                                    parentBudget={itemBudget}
                                    parentName={item.name}
                                    onEdit={() => goToStep(4)}
                                  />
                                </div>
                              )}

                              {/* Third level - Non-funnel */}
                              {thirdLevel && thirdLevel !== 'funnel_stage' && thirdAllocations.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                    {(() => {
                                      const Icon = LEVEL_ICONS[thirdLevel];
                                      return <Icon className="h-3 w-3" />;
                                    })()}
                                    {getLevelLabelPlural(thirdLevel)}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {thirdAllocations.map(alloc => (
                                      <span key={alloc.id} className="px-3 py-1 bg-secondary/50 text-secondary-foreground rounded-full text-xs font-medium">
                                        {alloc.name} ({alloc.percentage}%)
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* If no second/third level allocations */}
                              {(!secondLevel || secondAllocations.length === 0) && (!thirdLevel || thirdAllocations.length === 0) && (
                                <p className="text-sm text-muted-foreground italic">Configuração geral (sem níveis adicionais configurados)</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      });
                    })()}
                  </>
                )}
              </CardContent>
            </Card>

            {/* 3. Linhas do Plano */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Linhas do Plano</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      Revise as configurações e finalize a criação do plano.
                      <br />
                      Na próxima etapa, você poderá detalhar cada linha, definindo veículos, canais, segmentações e criativos, consolidando as escolhas táticas do plano.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Novo Plano de Mídia</h1>
            <p className="text-muted-foreground">Construa seu plano passo a passo</p>
          </div>
        </div>

        {/* Wizard Steps */}
        <WizardStepper
          steps={wizardSteps}
          currentStep={state.step}
          onStepClick={goToStep}
          completionPercentage={completionPercentage}
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

          {state.step < reviewStepNumber ? (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span className={!canProceed() ? "cursor-not-allowed" : ""}>
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="gap-2"
                    >
                      Próximo
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canProceed() && getValidationErrorsForStep().length > 0 && (
                  <TooltipContent side="top" className="max-w-md">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Para avançar, corrija:</p>
                      <ul className="text-xs list-disc list-inside space-y-0.5">
                        {getValidationErrorsForStep().map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Plano
            </Button>
          )}
        </div>
      </div>
      
      {/* Draft Recovery Dialog */}
      <DraftRecoveryDialog
        open={showDraftDialog}
        onOpenChange={setShowDraftDialog}
        draft={pendingDraft}
        onContinue={handleContinueDraft}
        onDiscard={handleDiscardDraft}
      />
    </DashboardLayout>
  );
}
