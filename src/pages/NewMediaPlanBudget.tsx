import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
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
import { useMediaPlanWizard, BudgetAllocation } from '@/hooks/useMediaPlanWizard';
import { KPI_OPTIONS, TEMPORAL_GRANULARITY } from '@/types/media';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WIZARD_STEPS = [
  { id: 1, title: 'Plano', description: 'Dados básicos' },
  { id: 2, title: 'Subdivisão', description: 'Opcional' },
  { id: 3, title: 'Momentos', description: 'Campanha' },
  { id: 4, title: 'Funil', description: 'Fases' },
  { id: 5, title: 'Temporal', description: 'Distribuição' },
  { id: 6, title: 'Linhas', description: 'Detalhes' },
];

export default function NewMediaPlanBudget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wizard = useMediaPlanWizard();
  const [saving, setSaving] = useState(false);

  const { state, goToStep, updatePlanData, setSubdivisions, setMoments, setFunnelStages, setTemporalGranularity, libraryData, libraryMutations } = wizard;

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
      case 4: {
        // Check funnel stages for each moment
        return true; // Simplified for now
      }
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (state.step < 6) {
      goToStep(state.step + 1);
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      goToStep(state.step - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Create the plan
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

      toast.success('Plano criado com sucesso!');
      navigate(`/media-plans/${plan.id}`);
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Erro ao criar plano');
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

  const handleCreateFunnelStage = async (name: string) => {
    const result = await libraryMutations.createFunnelStage.mutateAsync({ name });
    return result;
  };

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Informações do Plano</CardTitle>
              <CardDescription>
                Defina os dados básicos, orçamento e KPIs
              </CardDescription>
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
                  placeholder="0,00"
                  value={state.planData.total_budget || ''}
                  onChange={(e) => updatePlanData({ total_budget: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {/* Objectives */}
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

              {/* KPIs */}
              <div className="space-y-3">
                <Label>KPIs Relevantes (opcional)</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {KPI_OPTIONS.map(kpi => (
                    <div key={kpi.key} className="flex items-center gap-3">
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
                      <Label htmlFor={kpi.key} className="text-sm font-normal flex-1">
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
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Subdivisão do Plano (Opcional)</CardTitle>
              <CardDescription>
                Divida o orçamento por cidade, produto ou outra subdivisão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Orçamento total: <strong className="text-foreground">{formatCurrency(state.planData.total_budget)}</strong>
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
              />

              {state.subdivisions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Se não adicionar subdivisões, o plano será tratado como um todo único.
                </p>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        const subdivisionsForMoments = state.subdivisions.length > 0 
          ? state.subdivisions 
          : [{ id: 'root', name: 'Plano Completo', percentage: 100, amount: state.planData.total_budget }];

        return (
          <Card>
            <CardHeader>
              <CardTitle>Momentos de Campanha</CardTitle>
              <CardDescription>
                Distribua o orçamento por momentos (lançamento, sustentação, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subdivisionsForMoments.map(subdivision => {
                const budgetForSubdivision = subdivision.id === 'root' 
                  ? state.planData.total_budget 
                  : wizard.calculateAmount(state.planData.total_budget, subdivision.percentage);
                
                return (
                  <div key={subdivision.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{subdivision.name}</h4>
                      <span className="text-sm text-muted-foreground">
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
            </CardContent>
          </Card>
        );

      case 4:
        const getMomentKeys = () => {
          if (state.subdivisions.length === 0) {
            return (state.moments['root'] || []).map(m => ({ 
              key: `root_${m.id}`, 
              name: m.name, 
              budget: wizard.calculateAmount(state.planData.total_budget, m.percentage) 
            }));
          }
          
          const keys: { key: string; name: string; budget: number }[] = [];
          state.subdivisions.forEach(sub => {
            const subBudget = wizard.calculateAmount(state.planData.total_budget, sub.percentage);
            (state.moments[sub.id] || []).forEach(m => {
              keys.push({
                key: `${sub.id}_${m.id}`,
                name: `${sub.name} > ${m.name}`,
                budget: wizard.calculateAmount(subBudget, m.percentage),
              });
            });
          });
          return keys;
        };

        const momentKeys = getMomentKeys();

        return (
          <Card>
            <CardHeader>
              <CardTitle>Fases do Funil</CardTitle>
              <CardDescription>
                Distribua o orçamento por fase do funil (Topo, Meio, Fundo)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {momentKeys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Adicione momentos de campanha no passo anterior para distribuir por funil.
                  </p>
                </div>
              ) : (
                momentKeys.map(({ key, name, budget }) => (
                  <div key={key} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{name}</h4>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(budget)}
                      </span>
                    </div>
                    <BudgetAllocationTable
                      items={state.funnelStages[key] || []}
                      existingItems={libraryData.funnelStages}
                      totalBudget={budget}
                      onAdd={(item) => handleFunnelAdd(key, item)}
                      onUpdate={(id, percentage) => handleFunnelUpdate(key, id, percentage)}
                      onRemove={(id) => handleFunnelRemove(key, id)}
                      onCreate={handleCreateFunnelStage}
                      label="Fase do Funil"
                      createLabel="Criar nova fase"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição Temporal</CardTitle>
              <CardDescription>
                Defina como o orçamento será distribuído ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Granularidade</Label>
                <Select
                  value={state.temporalGranularity}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setTemporalGranularity(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPORAL_GRANULARITY.map(g => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  A distribuição temporal será calculada automaticamente com base na granularidade selecionada.
                  Você poderá ajustar os valores na próxima etapa.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Resumo e Linhas do Plano</CardTitle>
              <CardDescription>
                Revise o plano e adicione os detalhes das linhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{state.planData.name}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Orçamento Total</p>
                  <p className="font-medium">{formatCurrency(state.planData.total_budget)}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {state.planData.start_date} até {state.planData.end_date}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Subdivisões</p>
                  <p className="font-medium">
                    {state.subdivisions.length > 0 
                      ? state.subdivisions.map(s => s.name).join(', ')
                      : 'Nenhuma'}
                  </p>
                </div>
              </div>

              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  O plano será criado e você poderá adicionar as linhas detalhadas na página do plano.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/media-plans')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Novo Plano - Por Budget</h1>
            <p className="text-muted-foreground">
              Planeje do orçamento ao resultado
            </p>
          </div>
        </div>

        {/* Stepper */}
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={state.step}
          onStepClick={goToStep}
        />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={state.step === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
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
              Criar Plano
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}