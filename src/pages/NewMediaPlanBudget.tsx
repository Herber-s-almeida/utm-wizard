import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, Loader2, Layers, Clock, Filter, Calendar, FileText, Sparkles } from 'lucide-react';
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
import { useMediaPlanWizard, BudgetAllocation } from '@/hooks/useMediaPlanWizard';
import { KPI_OPTIONS } from '@/types/media';

const WIZARD_STEPS = [
  { id: 1, title: 'Plano', description: 'Dados básicos' },
  { id: 2, title: 'Subdivisão', description: 'Opcional' },
  { id: 3, title: 'Momentos', description: 'Opcional' },
  { id: 4, title: 'Funil', description: 'Fases' },
  { id: 5, title: 'Temporal', description: 'Distribuição' },
  { id: 6, title: 'Linhas', description: 'Detalhes' },
];

const MAX_SUBDIVISIONS = 12;
const MAX_FUNNEL_STAGES = 7;

export default function NewMediaPlanBudget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wizard = useMediaPlanWizard();
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [temporalPeriods, setTemporalPeriods] = useState<any[]>([]);

  const { state, goToStep, updatePlanData, setSubdivisions, setMoments, setFunnelStages, setTemporalGranularity, libraryData, libraryMutations } = wizard;

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: plan, error: planError } = await supabase
        .from('media_plans')
        .insert({
          user_id: user?.id,
          name: state.planData.name,
          client: state.planData.client || null,
          campaign: state.planData.campaign || null,
          start_date: state.planData.start_date,
          end_date: state.planData.end_date,
          total_budget: state.planData.total_budget,
          objectives: state.planData.objectives.length > 0 ? state.planData.objectives : null,
          kpis: Object.keys(state.planData.kpis).length > 0 ? state.planData.kpis : null,
          status: 'draft',
        })
        .select()
        .single();

      if (planError) throw planError;

      toast.success('Plano salvo com sucesso!');
      navigate(`/media-plans/${plan.id}`);
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
    setMoments(key, [...current, item]);
  };

  const handleMomentUpdate = (key: string, id: string, percentage: number) => {
    const current = state.moments[key] || [];
    setMoments(key, current.map(m => 
      m.id === id ? { ...m, percentage } : m
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
                          Se não adicionar subdivisões, o plano será tratado como um todo único.
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
                        Nenhuma subdivisão adicionada. O plano será tratado como um todo único.
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
                          Esta etapa é opcional. Se não adicionar momentos, será considerado um período geral.
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
                            onUpdate={(id, percentage) => handleMomentUpdate(subdivision.id, id, percentage)}
                            onRemove={(id) => handleMomentRemove(subdivision.id, id)}
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
                          Distribua o orçamento por fase do funil. Você pode arrastar para reordenar as fases.
                          Máximo de {MAX_FUNNEL_STAGES} fases por subdivisão.
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
                            onUpdate={(id, percentage) => handleFunnelUpdate(subdivision.id, id, percentage)}
                            onRemove={(id) => handleFunnelRemove(subdivision.id, id)}
                            onCreate={handleCreateFunnelStage}
                            label="Fase do Funil"
                            createLabel="Criar nova fase"
                            maxItems={MAX_FUNNEL_STAGES}
                          />

                          {/* Funnel Preview */}
                          {currentStages.length > 0 && (
                            <div className="pt-4 border-t">
                              <p className="text-sm text-muted-foreground mb-4">Prévia do Funil (arraste para reordenar):</p>
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

        {/* Step 6: Lines */}
        {state.step === 6 && (
          <motion.div
            key="lines-form"
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
                    <CardTitle>Linhas do Plano</CardTitle>
                    <CardDescription>
                      Revise as configurações e salve o plano. As linhas detalhadas podem ser adicionadas depois.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Todas as configurações foram definidas. Clique em "Salvar Plano" para criar o plano e adicionar as linhas detalhadas.
                  </p>
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Novo Plano de Mídia</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Planejamento baseado em orçamento
            </p>
          </div>
        </div>

        {/* Stepper */}
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={state.step}
          onStepClick={(step) => {
            if (step <= state.step) {
              setEditingSection(null);
              goToStep(step);
            }
          }}
        />

        {/* Content */}
        {renderContent()}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
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
              className="gap-2 bg-success hover:bg-success/90"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Plano
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
