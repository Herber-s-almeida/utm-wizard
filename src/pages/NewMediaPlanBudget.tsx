import { useState, useEffect, useMemo } from 'react';
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
import { useMediaPlanWizard, BudgetAllocation } from '@/hooks/useMediaPlanWizard';
import { KPI_OPTIONS } from '@/types/media';
import { HierarchyLevel, getLevelLabel, HIERARCHY_LEVEL_CONFIG } from '@/types/hierarchy';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';
import { CreateKpiDialog } from '@/components/media-plan/CreateKpiDialog';
import { useCustomKpis } from '@/hooks/useCustomKpis';
import { useWizardDraft, DraftData } from '@/hooks/useWizardDraft';
import { DraftRecoveryDialog } from '@/components/media-plan/DraftRecoveryDialog';
import { LibrarySelector } from '@/components/media-plan/LibrarySelector';

const MAX_SUBDIVISIONS = 12;
const MAX_FUNNEL_STAGES = 7;

// Helper to create a "Geral" allocation
const createGeralAllocation = (budget: number): BudgetAllocation => ({
  id: 'geral',
  name: 'Geral',
  percentage: 100,
  amount: budget,
});


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

  // Calculate completion percentage based on filled fields
  const calculateCompletionPercentage = () => {
    let filledFields = 0;
    let totalFields = 0;
    
    // Step 1 fields (weight: 40%)
    const step1Fields = [
      !!state.planData.name.trim(),
      !!state.planData.start_date,
      !!state.planData.end_date,
      state.planData.total_budget > 0,
    ];
    filledFields += step1Fields.filter(Boolean).length;
    totalFields += step1Fields.length;
    
    // Steps completion (each additional step = progress)
    if (state.step >= 2) filledFields += 1;
    if (state.step >= 3) filledFields += 1;
    if (state.step >= 4) filledFields += 1;
    if (state.step >= 5) filledFields += 1;
    totalFields += 4;
    
    // Subdivision configuration (bonus if configured)
    if (state.subdivisions.length > 0 && wizard.validatePercentages(state.subdivisions)) {
      filledFields += 1;
    }
    totalFields += 1;
    
    // Moments configuration (bonus if configured)
    const hasValidMoments = Object.values(state.moments).some(m => m.length > 0);
    if (hasValidMoments) {
      filledFields += 1;
    }
    totalFields += 1;
    
    // Funnel stages (bonus if configured)
    const hasValidFunnel = Object.values(state.funnelStages).some(f => f.length > 0);
    if (hasValidFunnel) {
      filledFields += 1;
    }
    totalFields += 1;
    
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

  const canProceed = () => {
    switch (state.step) {
      case 0:
        // Must have at least one hierarchy level selected
        return state.hierarchyOrder.length > 0;
      case 1:
        return getPlanInfoMissingFields().length === 0;
      default: {
        // For dynamic steps (level allocation steps)
        const levelIndex = state.step - 2;
        if (levelIndex >= 0 && levelIndex < state.hierarchyOrder.length) {
          const level = state.hierarchyOrder[levelIndex];
          
          // Validate allocations for this level
          if (levelIndex === 0) {
            // First level: validate root allocations
            if (level === 'subdivision') {
              return state.subdivisions.length === 0 || wizard.validatePercentages(state.subdivisions);
            } else if (level === 'moment') {
              const items = state.moments['root'] || [];
              return items.length === 0 || wizard.validatePercentages(items);
            } else if (level === 'funnel_stage') {
              const items = state.funnelStages['root'] || [];
              return items.length === 0 || wizard.validatePercentages(items);
            }
          } else {
            // Nested levels: validate all parent paths
            // For now, allow proceeding (can be enhanced later)
            return true;
          }
        }
        return true;
      }
    }
  };

  const handleNext = () => {
    if (state.step === 1 && !canProceed()) {
      toast.error(`Preencha os campos obrigatórios: ${getPlanInfoMissingFields().join(', ')}`);
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
      // 1. Create the media plan
      const { data: plan, error: planError } = await supabase
        .from('media_plans')
        .insert({
          user_id: user?.id,
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
          status: 'draft',
        })
        .select()
        .single();

      if (planError) throw planError;

      // 2. Save budget distributions in phases to respect FK constraints
      // Map to store distribution IDs for parent references
      const subdivisionDistIds: Record<string, string> = {};
      const momentDistIds: Record<string, string> = {};

      // Get effective subdivisions (use "Geral" if none defined)
      const effectiveSubdivisions = state.subdivisions.length > 0 
        ? state.subdivisions 
        : [createGeralAllocation(state.planData.total_budget)];

      // Phase 1: Insert subdivision distributions
      for (const sub of effectiveSubdivisions) {
        const subAmount = wizard.calculateAmount(state.planData.total_budget, sub.percentage);
        const { data: subDist, error: subError } = await supabase
          .from('plan_budget_distributions')
          .insert({
            user_id: user?.id,
            media_plan_id: plan.id,
            distribution_type: 'subdivision',
            reference_id: sub.id === 'geral' ? null : sub.id,
            percentage: sub.percentage,
            amount: subAmount,
            parent_distribution_id: null,
          })
          .select('id')
          .single();

        if (subError) {
          console.error('Error saving subdivision distribution:', subError);
          continue;
        }
        subdivisionDistIds[sub.id] = subDist.id;
      }

      // Phase 2: Insert moment distributions
      for (const sub of effectiveSubdivisions) {
        const subDistId = subdivisionDistIds[sub.id];
        if (!subDistId) continue;

        const subAmount = wizard.calculateAmount(state.planData.total_budget, sub.percentage);
        const subKey = sub.id === 'geral' ? 'root' : sub.id;
        
        // Get effective moments for this subdivision
        const subMoments = state.moments[subKey] || [];
        const effectiveMoments = subMoments.length > 0 
          ? subMoments 
          : [createGeralAllocation(subAmount)];

        for (const mom of effectiveMoments) {
          const momAmount = wizard.calculateAmount(subAmount, mom.percentage);
          const { data: momDist, error: momError } = await supabase
            .from('plan_budget_distributions')
            .insert({
              user_id: user?.id,
              media_plan_id: plan.id,
              distribution_type: 'moment',
              reference_id: mom.id === 'geral' ? null : mom.id,
              percentage: mom.percentage,
              amount: momAmount,
              parent_distribution_id: subDistId,
              start_date: mom.start_date || null,
              end_date: mom.end_date || null,
            })
            .select('id')
            .single();

          if (momError) {
            console.error('Error saving moment distribution:', momError);
            continue;
          }
          // Store with composite key: subId_momId
          momentDistIds[`${sub.id}_${mom.id}`] = momDist.id;
        }
      }

      // Phase 3: Insert funnel stage distributions
      for (const sub of effectiveSubdivisions) {
        const subAmount = wizard.calculateAmount(state.planData.total_budget, sub.percentage);
        const subKey = sub.id === 'geral' ? 'root' : sub.id;
        
        const subMoments = state.moments[subKey] || [];
        const effectiveMoments = subMoments.length > 0 
          ? subMoments 
          : [createGeralAllocation(subAmount)];

        for (const mom of effectiveMoments) {
          const momDistId = momentDistIds[`${sub.id}_${mom.id}`];
          if (!momDistId) continue;

          const momAmount = wizard.calculateAmount(subAmount, mom.percentage);
          
          // Get funnel stages for this moment
          // The funnelStages are keyed by subdivision ID (or 'root'), not by moment
          // We need to check if there are funnel stages defined for this subdivision
          const funnelKey = sub.id === 'geral' ? 'root' : sub.id;
          const subFunnelStages = state.funnelStages[funnelKey] || [];
          const effectiveFunnelStages = subFunnelStages.length > 0 
            ? subFunnelStages 
            : [createGeralAllocation(momAmount)];

          for (const funnel of effectiveFunnelStages) {
            const funnelAmount = wizard.calculateAmount(momAmount, funnel.percentage);
            const { error: funnelError } = await supabase
              .from('plan_budget_distributions')
              .insert({
                user_id: user?.id,
                media_plan_id: plan.id,
                distribution_type: 'funnel_stage',
                reference_id: funnel.id === 'geral' ? null : funnel.id,
                percentage: funnel.percentage,
                amount: funnelAmount,
                parent_distribution_id: momDistId,
              });

            if (funnelError) {
              console.error('Error saving funnel distribution:', funnelError);
            }
          }
        }
      }

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

  const handleSubdivisionAdd = (item: BudgetAllocation) => {
    setSubdivisions([...state.subdivisions, item]);
  };

  const handleSubdivisionUpdate = (id: string, percentage: number) => {
    setSubdivisions(state.subdivisions.map(s => 
      s.id === id ? { ...s, percentage, amount: wizard.calculateAmount(state.planData.total_budget, percentage) } : s
    ));
  };

  const handleSubdivisionRemove = (id: string) => {
    setSubdivisions(state.subdivisions.filter(s => s.id !== id));
  };

  const handleCreateSubdivision = async (name: string) => {
    const result = await libraryMutations.createSubdivision.mutateAsync({ name });
    return result;
  };

  const handleMomentAdd = (key: string, item: BudgetAllocation) => {
    const current = state.moments[key] || [];
    // Set default dates from plan dates
    setMoments(key, [...current, { 
      ...item, 
      start_date: state.planData.start_date,
      end_date: state.planData.end_date 
    }]);
  };

  const handleMomentUpdate = (key: string, id: string, percentage: number, dates?: { start_date?: string; end_date?: string }) => {
    const current = state.moments[key] || [];
    setMoments(key, current.map(m => 
      m.id === id ? { ...m, percentage, ...(dates || {}) } : m
    ));
  };

  const handleMomentRemove = (key: string, id: string) => {
    const current = state.moments[key] || [];
    setMoments(key, current.filter(m => m.id !== id));
  };

  const handleCreateMoment = async (name: string) => {
    const result = await libraryMutations.createMoment.mutateAsync({ name });
    return result;
  };

  const handleFunnelAdd = (key: string, item: BudgetAllocation) => {
    const current = state.funnelStages[key] || [];
    if (current.length >= MAX_FUNNEL_STAGES) {
      toast.error(`Máximo de ${MAX_FUNNEL_STAGES} fases do funil`);
      return;
    }
    setFunnelStages(key, [...current, item]);
  };

  const handleFunnelUpdate = (key: string, id: string, percentage: number) => {
    const current = state.funnelStages[key] || [];
    setFunnelStages(key, current.map(f => 
      f.id === id ? { ...f, percentage } : f
    ));
  };

  const handleFunnelRemove = (key: string, id: string) => {
    const current = state.funnelStages[key] || [];
    setFunnelStages(key, current.filter(f => f.id !== id));
  };

  const handleFunnelReorder = (key: string, stages: BudgetAllocation[]) => {
    setFunnelStages(key, stages);
  };

  const handleCreateFunnelStage = async (name: string) => {
    const result = await libraryMutations.createFunnelStage.mutateAsync({ name });
    return result;
  };

  // Get subdivisions for current context
  const subdivisionsForContext = state.subdivisions.length > 0 
    ? state.subdivisions 
    : [{ id: 'root', name: 'Plano Completo', percentage: 100, amount: state.planData.total_budget }];

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
            ) : state.step > 1 && state.step < 6 && (
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

        {/* Step 2: Subdivisions */}
        {state.step >= 2 && (
          <AnimatePresence mode="wait">
            {state.step === 2 || editingSection === 'subdivisions' ? (
              <motion.div
                key="subdivisions-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Subdivisão do Plano</CardTitle>
                        <CardDescription>
                          Divida o orçamento por cidade, produto ou outra subdivisão. Esta etapa é opcional.
                          Se não adicionar subdivisões, o plano será tratado como "Geral".
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <p className="text-sm text-muted-foreground">
                        Orçamento total: <strong className="text-foreground text-lg">{formatCurrency(state.planData.total_budget)}</strong>
                      </p>
                    </div>

                    <BudgetAllocationTable
                      items={state.subdivisions}
                      existingItems={libraryData.subdivisions}
                      totalBudget={state.planData.total_budget}
                      onAdd={handleSubdivisionAdd}
                      onUpdate={handleSubdivisionUpdate}
                      onRemove={handleSubdivisionRemove}
                      onCreate={handleCreateSubdivision}
                      label="Subdivisão"
                      createLabel="Criar nova subdivisão"
                      maxItems={MAX_SUBDIVISIONS}
                    />

                    {state.subdivisions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                        Nenhuma subdivisão adicionada. O plano será tratado como "Geral".
                      </p>
                    )}

                    {editingSection === 'subdivisions' && (
                      <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => setEditingSection(null)}>
                          Salvar alterações
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : state.step > 2 && state.subdivisions.length > 0 && (
              <motion.div
                key="subdivisions-summary"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <SubdivisionsSummaryCard
                  subdivisions={state.subdivisions}
                  totalBudget={state.planData.total_budget}
                  onEdit={() => setEditingSection('subdivisions')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Step 3: Moments */}
        {state.step >= 3 && (
          <AnimatePresence mode="wait">
            {state.step === 3 || editingSection === 'moments' ? (
              <motion.div
                key="moments-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Momentos de Campanha</CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          Momentos de campanha representam as fases estratégicas de veiculação de um plano de mídia, como lançamento, sustentação ou períodos específicos de maior intensidade. Essa configuração permite priorizar investimento em determinados momentos, criar campanhas faseadas ou concentrar verba conforme a estratégia definida.
                          <br /><br />
                          Essa etapa é opcional. Caso nenhum momento seja configurado, todo o plano será considerado como Geral.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {subdivisionsForContext.map(subdivision => {
                      const budgetForSubdivision = subdivision.id === 'root' 
                        ? state.planData.total_budget 
                        : wizard.calculateAmount(state.planData.total_budget, subdivision.percentage);
                      
                      return (
                        <div key={subdivision.id} className="border rounded-xl p-4 space-y-4 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{subdivision.name}</h4>
                            <span className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
                              {formatCurrency(budgetForSubdivision)}
                            </span>
                          </div>
                          <BudgetAllocationTable
                            items={state.moments[subdivision.id] || []}
                            existingItems={libraryData.moments}
                            totalBudget={budgetForSubdivision}
                            onAdd={(item) => handleMomentAdd(subdivision.id, item)}
                            onUpdate={(id, percentage, dates) => handleMomentUpdate(subdivision.id, id, percentage, dates)}
                            onRemove={(id) => handleMomentRemove(subdivision.id, id)}
                            onCreate={handleCreateMoment}
                            label="Momento"
                            createLabel="Criar novo momento"
                            showDates={true}
                            planStartDate={state.planData.start_date}
                            planEndDate={state.planData.end_date}
                          />
                        </div>
                      );
                    })}

                    {editingSection === 'moments' && (
                      <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => setEditingSection(null)}>
                          Salvar alterações
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        )}

        {/* Step 4: Funnel Stages */}
        {state.step >= 4 && (
          <AnimatePresence mode="wait">
            {state.step === 4 || editingSection === 'funnel' ? (
              <motion.div
                key="funnel-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Filter className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Fases do Funil</CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          As fases do funil representam os estágios da jornada do público, como awareness, consideração e conversão. Essa configuração permite distribuir o orçamento de acordo com o papel de cada fase, ajustando o investimento conforme o objetivo da campanha em cada etapa.
                          <br /><br />
                          Você pode reordenar as fases livremente. É possível definir até {MAX_FUNNEL_STAGES} fases por subdivisão.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {subdivisionsForContext.map(subdivision => {
                      const budgetForSubdivision = subdivision.id === 'root' 
                        ? state.planData.total_budget 
                        : wizard.calculateAmount(state.planData.total_budget, subdivision.percentage);
                      const currentStages = state.funnelStages[subdivision.id] || [];
                      
                      return (
                        <div key={subdivision.id} className="border rounded-xl p-4 space-y-4 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{subdivision.name}</h4>
                            <span className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
                              {formatCurrency(budgetForSubdivision)}
                            </span>
                          </div>
                          
                          {/* Add funnel stage selector */}
                          {currentStages.length < MAX_FUNNEL_STAGES && (
                            <FunnelStageSelector
                              existingItems={libraryData.funnelStages}
                              selectedItems={currentStages}
                              onAdd={(item) => handleFunnelAdd(subdivision.id, item)}
                              onCreate={handleCreateFunnelStage}
                              maxItems={MAX_FUNNEL_STAGES}
                            />
                          )}
                          
                          {/* Sortable funnel list */}
                          {currentStages.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm text-muted-foreground mb-3">Arraste para reordenar as fases:</p>
                              <SortableFunnelList
                                items={currentStages}
                                totalBudget={budgetForSubdivision}
                                onUpdate={(id, percentage) => handleFunnelUpdate(subdivision.id, id, percentage)}
                                onRemove={(id) => handleFunnelRemove(subdivision.id, id)}
                                onReorder={(stages) => handleFunnelReorder(subdivision.id, stages)}
                              />
                            </div>
                          )}

                          {/* Funnel Preview */}
                          {currentStages.length > 0 && (
                            <div className="pt-4 border-t">
                              <p className="text-sm text-muted-foreground mb-4">Visualização do Funil:</p>
                              <FunnelVisualization
                                funnelStages={currentStages}
                                parentBudget={budgetForSubdivision}
                                parentName={subdivision.name}
                                onEdit={() => {}}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {editingSection === 'funnel' && (
                      <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => setEditingSection(null)}>
                          Salvar alterações
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        )}

        {/* Review Step */}
        {state.step === reviewStepNumber && (
          <motion.div
            key="lines-form"
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

            {/* 2. Subdivisions with nested Moments and Funnel */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <CardTitle className="text-lg">Subdivisões do Plano</CardTitle>
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full min-w-[100px]" />
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                      <span className="text-success font-bold text-sm">✓</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => goToStep(2)}>
                    <Edit2 className="h-3.5 w-3.5" />
                    editar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 3. Render each subdivision with its moments and funnel */}
                {(state.subdivisions.length > 0 ? state.subdivisions : [{ id: 'root', name: 'Geral', percentage: 100, amount: state.planData.total_budget }]).map((sub) => {
                  const subKey = sub.id === 'root' ? 'root' : sub.id;
                  const subBudget = wizard.calculateAmount(state.planData.total_budget, sub.percentage);
                  const subMoments = state.moments[subKey] || [];
                  const subFunnelStages = state.funnelStages[subKey] || [];

                  return (
                    <Card key={sub.id} className="bg-muted/30 border-border/50">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{sub.name}</CardTitle>
                          <span className="text-sm text-muted-foreground">
                            {sub.percentage}% - {formatCurrency(subBudget)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-4">
                        {/* Moments for this subdivision */}
                        {subMoments.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Momentos de Campanha
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {subMoments.map(mom => (
                                <span key={mom.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                  {mom.name} ({mom.percentage}%)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Funnel Visualization for this subdivision */}
                        {subFunnelStages.length > 0 && (
                          <div className="mt-4">
                            <FunnelVisualization
                              funnelStages={subFunnelStages}
                              parentBudget={subBudget}
                              parentName={sub.name}
                              onEdit={() => goToStep(4)}
                            />
                          </div>
                        )}

                        {/* If no moments and no funnel, show "Geral" */}
                        {subMoments.length === 0 && subFunnelStages.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">Configuração geral (sem momentos ou fases específicas)</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>

            {/* 4. Linhas do Plano */}
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
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </Button>
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
