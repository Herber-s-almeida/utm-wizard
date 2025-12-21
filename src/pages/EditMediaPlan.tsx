import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, Loader2, Layers, Clock, Filter, Calendar, FileText, Sparkles, AlertTriangle } from 'lucide-react';
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
import { TemporalEqualizer, generateTemporalPeriods } from '@/components/media-plan/TemporalEqualizer';
import { useMediaPlanWizard, BudgetAllocation, WizardPlanData } from '@/hooks/useMediaPlanWizard';
import { KPI_OPTIONS } from '@/types/media';
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

const WIZARD_STEPS = [
  { id: 1, title: 'Plano', description: 'Dados básicos' },
  { id: 2, title: 'Subdivisão', description: 'Opcional' },
  { id: 3, title: 'Momentos', description: 'Opcional' },
  { id: 4, title: 'Funil', description: 'Fases' },
  { id: 5, title: 'Temporal', description: 'Distribuição' },
  { id: 6, title: 'Salvar', description: 'Confirmar' },
];

const MAX_SUBDIVISIONS = 12;
const MAX_FUNNEL_STAGES = 7;

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

export default function EditMediaPlan() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const wizard = useMediaPlanWizard();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [temporalPeriods, setTemporalPeriods] = useState<any[]>([]);
  const [orphanLinesCount, setOrphanLinesCount] = useState(0);
  const [showOrphanWarning, setShowOrphanWarning] = useState(false);
  const [existingDistributions, setExistingDistributions] = useState<BudgetDistribution[]>([]);
  const [existingLines, setExistingLines] = useState<any[]>([]);

  const { state, goToStep, updatePlanData, setSubdivisions, setMoments, setFunnelStages, setTemporalGranularity, libraryData, libraryMutations, initializeFromPlan } = wizard;

  // Load existing plan data
  useEffect(() => {
    if (user && id) {
      loadPlanData();
    }
  }, [user, id]);

  const loadPlanData = async () => {
    try {
      // Fetch plan
      const { data: plan, error: planError } = await supabase
        .from('media_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (planError) throw planError;
      if (!plan) {
        toast.error('Plano não encontrado');
        navigate('/media-plans');
        return;
      }

      // Fetch existing distributions
      const { data: distributions, error: distError } = await supabase
        .from('plan_budget_distributions')
        .select('*')
        .eq('media_plan_id', id);

      if (distError) throw distError;
      setExistingDistributions(distributions || []);

      // Fetch existing lines
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select('*')
        .eq('media_plan_id', id);

      if (linesError) throw linesError;
      setExistingLines(lines || []);

      // Parse distributions into wizard state
      const planData: WizardPlanData = {
        name: plan.name,
        client: plan.client || '',
        campaign: plan.campaign || '',
        start_date: plan.start_date || '',
        end_date: plan.end_date || '',
        total_budget: Number(plan.total_budget) || 0,
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

      // Initialize wizard with loaded data, starting at step 2
      initializeFromPlan(planData, subdivisionAllocations, momentAllocations, funnelAllocations, 2);
    } catch (error) {
      console.error('Error loading plan:', error);
      toast.error('Erro ao carregar plano');
      navigate(`/media-plans/${id}`);
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

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.planData.name.trim() && state.planData.start_date && state.planData.end_date && state.planData.total_budget > 0;
      case 2:
        return state.subdivisions.length === 0 || wizard.validatePercentages(state.subdivisions);
      case 3: {
        const keys = state.subdivisions.length > 0 
          ? state.subdivisions.map(s => s.id) 
          : ['root'];
        return keys.every(key => {
          const items = state.moments[key] || [];
          return items.length === 0 || wizard.validatePercentages(items);
        });
      }
      case 4:
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (state.step < 6) {
      setEditingSection(null);
      goToStep(state.step + 1);
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setEditingSection(null);
      goToStep(state.step - 1);
    }
  };

  // Calculate orphan lines (lines that will be deleted)
  const calculateOrphanLines = () => {
    const newSubIds = new Set(state.subdivisions.map(s => s.id));
    const newMomIds = new Set(Object.values(state.moments).flat().map(m => m.id));
    const newFunnelIds = new Set(Object.values(state.funnelStages).flat().map(f => f.id));

    let orphanCount = 0;
    for (const line of existingLines) {
      const subOrphan = line.subdivision_id && !newSubIds.has(line.subdivision_id);
      const momOrphan = line.moment_id && !newMomIds.has(line.moment_id);
      const funnelOrphan = line.funnel_stage_id && !newFunnelIds.has(line.funnel_stage_id);
      
      if (subOrphan || momOrphan || funnelOrphan) {
        orphanCount++;
      }
    }
    return orphanCount;
  };

  const handleSave = async () => {
    // Check for orphan lines first
    const orphans = calculateOrphanLines();
    if (orphans > 0 && !showOrphanWarning) {
      setOrphanLinesCount(orphans);
      setShowOrphanWarning(true);
      return;
    }

    setSaving(true);
    try {
      // 1. Update the media plan
      const { error: planError } = await supabase
        .from('media_plans')
        .update({
          name: state.planData.name,
          client: state.planData.client || null,
          campaign: state.planData.campaign || null,
          start_date: state.planData.start_date,
          end_date: state.planData.end_date,
          total_budget: state.planData.total_budget,
          objectives: state.planData.objectives.length > 0 ? state.planData.objectives : null,
          kpis: Object.keys(state.planData.kpis).length > 0 ? state.planData.kpis : null,
        })
        .eq('id', id);

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
        .eq('media_plan_id', id);

      // 4. Save new budget distributions (same logic as create)
      const subdivisionDistIds: Record<string, string> = {};
      const momentDistIds: Record<string, string> = {};

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
            media_plan_id: id,
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
              media_plan_id: id,
              distribution_type: 'moment',
              reference_id: mom.id === 'geral' ? null : mom.id,
              percentage: mom.percentage,
              amount: momAmount,
              parent_distribution_id: subDistId,
            })
            .select('id')
            .single();

          if (momError) {
            console.error('Error saving moment distribution:', momError);
            continue;
          }
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
                media_plan_id: id,
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

      toast.success('Plano atualizado com sucesso!');
      navigate(`/media-plans/${id}`);
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

  const handleMomentUpdate = (key: string, itemId: string, percentage: number) => {
    const current = state.moments[key] || [];
    setMoments(key, current.map(m => 
      m.id === itemId ? { ...m, percentage } : m
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
    if (current.length >= MAX_FUNNEL_STAGES) {
      toast.error(`Máximo de ${MAX_FUNNEL_STAGES} fases do funil`);
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
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Plano *</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Campanha de Verão 2025"
                        value={state.planData.name}
                        onChange={(e) => updatePlanData({ name: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="client">Cliente</Label>
                        <Input
                          id="client"
                          placeholder="Nome do cliente"
                          value={state.planData.client}
                          onChange={(e) => updatePlanData({ client: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="campaign">Campanha</Label>
                        <Input
                          id="campaign"
                          placeholder="Nome da campanha"
                          value={state.planData.campaign}
                          onChange={(e) => updatePlanData({ campaign: e.target.value })}
                        />
                      </div>
                    </div>

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
                        <CardDescription>
                          Distribua o orçamento por momentos (lançamento, sustentação, etc.).
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
                            onUpdate={(itemId, percentage) => handleMomentUpdate(subdivision.id, itemId, percentage)}
                            onRemove={(itemId) => handleMomentRemove(subdivision.id, itemId)}
                            onCreate={handleCreateMoment}
                            label="Momento"
                            createLabel="Criar novo momento"
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
                        <CardDescription>
                          Distribua o orçamento por fase do funil.
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
                          
                          <BudgetAllocationTable
                            items={currentStages}
                            existingItems={libraryData.funnelStages}
                            totalBudget={budgetForSubdivision}
                            onAdd={(item) => handleFunnelAdd(subdivision.id, item)}
                            onUpdate={(itemId, percentage) => handleFunnelUpdate(subdivision.id, itemId, percentage)}
                            onRemove={(itemId) => handleFunnelRemove(subdivision.id, itemId)}
                            onCreate={handleCreateFunnelStage}
                            label="Fase do Funil"
                            createLabel="Criar nova fase"
                            maxItems={MAX_FUNNEL_STAGES}
                          />

                          {currentStages.length > 0 && (
                            <div className="pt-4 border-t">
                              <p className="text-sm text-muted-foreground mb-4">Prévia do Funil:</p>
                              <FunnelVisualization
                                funnelStages={currentStages}
                                parentBudget={budgetForSubdivision}
                                parentName={subdivision.name}
                                onEdit={() => {}}
                                onReorder={(stages) => handleFunnelReorder(subdivision.id, stages)}
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

        {/* Step 5: Temporal Distribution */}
        {state.step >= 5 && (
          <AnimatePresence mode="wait">
            {state.step === 5 || editingSection === 'temporal' ? (
              <motion.div
                key="temporal-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TemporalEqualizer
                  startDate={state.planData.start_date}
                  endDate={state.planData.end_date}
                  totalBudget={state.planData.total_budget}
                  granularity={state.temporalGranularity}
                  periods={temporalPeriods}
                  onGranularityChange={(g) => setTemporalGranularity(g)}
                  onPeriodsChange={setTemporalPeriods}
                />

                {editingSection === 'temporal' && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setEditingSection(null)}>
                      Salvar alterações
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        )}

        {/* Step 6: Confirm */}
        {state.step === 6 && (
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
          <Button variant="ghost" size="icon" onClick={() => navigate(`/media-plans/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Editar Plano de Mídia</h1>
            <p className="text-muted-foreground">Modifique as configurações do plano</p>
          </div>
        </div>

        {/* Wizard Steps */}
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={state.step}
          onStepClick={goToStep}
        />

        {/* Content */}
        {renderContent()}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={state.step === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          {state.step < 6 ? (
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
              Salvar Alterações
            </Button>
          )}
        </div>
      </div>

      {/* Orphan Lines Warning Dialog */}
      <AlertDialog open={showOrphanWarning} onOpenChange={setShowOrphanWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Linhas de mídia serão excluídas
            </AlertDialogTitle>
            <AlertDialogDescription>
              {orphanLinesCount} linha(s) de mídia estão vinculadas a subdivisões, momentos ou fases que serão removidas.
              Essas linhas serão <strong>excluídas permanentemente</strong>. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir e Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}