import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { HierarchyBlockSelector, HierarchyItem } from './HierarchyBlockSelector';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets } from '@/hooks/useConfigData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MediaPlan } from '@/types/media';
import { cn } from '@/lib/utils';

interface MediaLineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MediaPlan;
  onComplete: () => void;
  existingSubdivisions?: string[];
  existingMoments?: string[];
  existingFunnelStages?: string[];
}

type WizardStep = 'subdivision' | 'moment' | 'funnel' | 'medium' | 'vehicle' | 'channel' | 'target' | 'details';

const STEP_ORDER: WizardStep[] = ['subdivision', 'moment', 'funnel', 'medium', 'vehicle', 'channel', 'target', 'details'];

const STEP_LABELS: Record<WizardStep, string> = {
  subdivision: 'Subdivisão do Plano',
  moment: 'Momento de Campanha',
  funnel: 'Fase do Funil',
  medium: 'Meio',
  vehicle: 'Veículo',
  channel: 'Canal',
  target: 'Segmentação',
  details: 'Detalhes da Linha',
};

export function MediaLineWizard({
  open,
  onOpenChange,
  plan,
  onComplete,
  existingSubdivisions = [],
  existingMoments = [],
  existingFunnelStages = [],
}: MediaLineWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('subdivision');
  const [saving, setSaving] = useState(false);
  const [showRedistributeWarning, setShowRedistributeWarning] = useState(false);
  const [pendingSubdivisionChange, setPendingSubdivisionChange] = useState<string | null>(null);
  
  // Selection state
  const [selectedSubdivision, setSelectedSubdivision] = useState<string | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  
  // Details form
  const [lineDetails, setLineDetails] = useState({
    budget: '',
    start_date: plan.start_date || '',
    end_date: plan.end_date || '',
    destination_url: '',
    notes: '',
  });

  // Hooks for library data
  const subdivisions = useSubdivisions();
  const moments = useMoments();
  const funnelStages = useFunnelStages();
  const mediums = useMediums();
  const vehicles = useVehicles();
  const channels = useChannels();
  const targets = useTargets();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep('subdivision');
      setSelectedSubdivision(null);
      setSelectedMoment(null);
      setSelectedFunnelStage(null);
      setSelectedMedium(null);
      setSelectedVehicle(null);
      setSelectedChannel(null);
      setSelectedTarget(null);
      setLineDetails({
        budget: '',
        start_date: plan.start_date || '',
        end_date: plan.end_date || '',
        destination_url: '',
        notes: '',
      });
    }
  }, [open, plan]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'subdivision':
        return !!selectedSubdivision;
      case 'moment':
        return !!selectedMoment;
      case 'funnel':
        return !!selectedFunnelStage;
      case 'medium':
        return !!selectedMedium;
      case 'vehicle':
        return !!selectedVehicle;
      case 'channel':
        return !!selectedChannel;
      case 'target':
        return !!selectedTarget;
      case 'details':
        return !!lineDetails.budget && !!lineDetails.start_date && !!lineDetails.end_date;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStepIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEP_ORDER[currentStepIndex - 1]);
    }
  };

  const handleSubdivisionSelect = (id: string) => {
    // Check if there are existing budget distributions that would be affected
    const hasExistingDistributions = existingSubdivisions.length > 0 && !existingSubdivisions.includes(id);
    
    if (hasExistingDistributions) {
      setPendingSubdivisionChange(id);
      setShowRedistributeWarning(true);
    } else {
      setSelectedSubdivision(id);
    }
  };

  const handleConfirmRedistribute = async () => {
    if (pendingSubdivisionChange) {
      // Redistribute budget equally across funnel stages
      await redistributeBudgetEqually();
      setSelectedSubdivision(pendingSubdivisionChange);
    }
    setPendingSubdivisionChange(null);
    setShowRedistributeWarning(false);
  };

  const redistributeBudgetEqually = async () => {
    // Get existing funnel stage distributions
    const { data: distributions } = await supabase
      .from('plan_budget_distributions')
      .select('*')
      .eq('media_plan_id', plan.id)
      .eq('distribution_type', 'funnel_stage');
    
    if (distributions && distributions.length > 0) {
      const equalPercentage = Math.floor(100 / distributions.length * 100) / 100;
      const remainder = 100 - (equalPercentage * distributions.length);
      
      for (let i = 0; i < distributions.length; i++) {
        const percentage = i === 0 ? equalPercentage + remainder : equalPercentage;
        await supabase
          .from('plan_budget_distributions')
          .update({ 
            percentage,
            amount: (plan.total_budget * percentage) / 100
          })
          .eq('id', distributions[i].id);
      }
      
      toast.info('Orçamento redistribuído igualmente entre as fases do funil');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Create the media line
      const { error } = await supabase
        .from('media_lines')
        .insert({
          media_plan_id: plan.id,
          user_id: user.id,
          subdivision_id: selectedSubdivision,
          moment_id: selectedMoment,
          funnel_stage_id: selectedFunnelStage,
          medium_id: selectedMedium,
          vehicle_id: selectedVehicle,
          channel_id: selectedChannel,
          target_id: selectedTarget,
          budget: parseFloat(lineDetails.budget) || 0,
          start_date: lineDetails.start_date,
          end_date: lineDetails.end_date,
          destination_url: lineDetails.destination_url || null,
          notes: lineDetails.notes || null,
          platform: vehicles.data?.find(v => v.id === selectedVehicle)?.name || 'Outro',
          funnel_stage: 'top', // Legacy field
        });

      if (error) throw error;

      toast.success('Linha de mídia criada!');
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving line:', error);
      toast.error('Erro ao criar linha de mídia');
    } finally {
      setSaving(false);
    }
  };

  const getItemsForStep = (): HierarchyItem[] => {
    switch (currentStep) {
      case 'subdivision':
        return (subdivisions.data || []).map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
        }));
      case 'moment':
        return (moments.data || []).map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
        }));
      case 'funnel':
        return (funnelStages.data || []).map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
        }));
      case 'medium':
        return (mediums.data || []).map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
        }));
      case 'vehicle':
        // Filter vehicles by selected medium
        return (vehicles.data || [])
          .filter(v => !selectedMedium || v.medium_id === selectedMedium || !v.medium_id)
          .map(v => ({
            id: v.id,
            name: v.name,
            description: v.description,
          }));
      case 'channel':
        // Filter channels by selected vehicle
        return (channels.data || [])
          .filter(c => !selectedVehicle || c.vehicle_id === selectedVehicle)
          .map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
          }));
      case 'target':
        return (targets.data || []).map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
        }));
      default:
        return [];
    }
  };

  const getSelectedId = (): string | null => {
    switch (currentStep) {
      case 'subdivision': return selectedSubdivision;
      case 'moment': return selectedMoment;
      case 'funnel': return selectedFunnelStage;
      case 'medium': return selectedMedium;
      case 'vehicle': return selectedVehicle;
      case 'channel': return selectedChannel;
      case 'target': return selectedTarget;
      default: return null;
    }
  };

  const handleSelect = (id: string) => {
    switch (currentStep) {
      case 'subdivision':
        handleSubdivisionSelect(id);
        break;
      case 'moment':
        setSelectedMoment(id);
        break;
      case 'funnel':
        setSelectedFunnelStage(id);
        break;
      case 'medium':
        setSelectedMedium(id);
        setSelectedVehicle(null);
        setSelectedChannel(null);
        break;
      case 'vehicle':
        setSelectedVehicle(id);
        setSelectedChannel(null);
        break;
      case 'channel':
        setSelectedChannel(id);
        break;
      case 'target':
        setSelectedTarget(id);
        break;
    }
  };

  const handleDeselect = (id: string) => {
    switch (currentStep) {
      case 'subdivision':
        setSelectedSubdivision(null);
        break;
      case 'moment':
        setSelectedMoment(null);
        break;
      case 'funnel':
        setSelectedFunnelStage(null);
        break;
      case 'medium':
        setSelectedMedium(null);
        break;
      case 'vehicle':
        setSelectedVehicle(null);
        break;
      case 'channel':
        setSelectedChannel(null);
        break;
      case 'target':
        setSelectedTarget(null);
        break;
    }
  };

  const handleCreate = async (name: string): Promise<HierarchyItem> => {
    switch (currentStep) {
      case 'subdivision':
        const newSub = await subdivisions.create.mutateAsync({ name });
        return { id: newSub.id, name: newSub.name };
      case 'moment':
        const newMoment = await moments.create.mutateAsync({ name });
        return { id: newMoment.id, name: newMoment.name };
      case 'funnel':
        const newFunnel = await funnelStages.create.mutateAsync({ name });
        return { id: newFunnel.id, name: newFunnel.name };
      case 'medium':
        const newMedium = await mediums.create.mutateAsync({ name });
        return { id: newMedium.id, name: newMedium.name };
      case 'vehicle':
        const newVehicle = await vehicles.create.mutateAsync({ name, medium_id: selectedMedium || undefined });
        return { id: newVehicle.id, name: newVehicle.name };
      case 'channel':
        if (!selectedVehicle) throw new Error('Veículo não selecionado');
        const newChannel = await channels.create.mutateAsync({ name, vehicle_id: selectedVehicle });
        return { id: newChannel.id, name: newChannel.name };
      case 'target':
        const newTarget = await targets.create.mutateAsync({ name });
        return { id: newTarget.id, name: newTarget.name };
      default:
        throw new Error('Invalid step');
    }
  };

  const getCreatePlaceholder = (): string => {
    switch (currentStep) {
      case 'subdivision': return 'Nova subdivisão';
      case 'moment': return 'Novo momento';
      case 'funnel': return 'Nova fase do funil';
      case 'medium': return 'Novo meio';
      case 'vehicle': return 'Novo veículo';
      case 'channel': return 'Novo canal';
      case 'target': return 'Nova segmentação';
      default: return 'Novo item';
    }
  };

  const selectedId = getSelectedId();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Linha de Mídia</DialogTitle>
            <DialogDescription>
              Configure a linha seguindo a hierarquia do plano
            </DialogDescription>
          </DialogHeader>

          {/* Progress indicators */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEP_ORDER.map((step, index) => {
              const isActive = currentStep === step;
              const isPast = index < currentStepIndex;
              
              return (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    isActive && "bg-primary text-primary-foreground",
                    isPast && "bg-success/20 text-success",
                    !isActive && !isPast && "bg-muted text-muted-foreground"
                  )}
                >
                  {isPast && <Check className="w-3 h-3" />}
                  {STEP_LABELS[step]}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="min-h-[300px] py-4"
            >
              {currentStep !== 'details' ? (
                <HierarchyBlockSelector
                  title={STEP_LABELS[currentStep]}
                  items={getItemsForStep()}
                  selectedIds={selectedId ? [selectedId] : []}
                  onSelect={handleSelect}
                  onDeselect={handleDeselect}
                  onCreate={handleCreate}
                  createPlaceholder={getCreatePlaceholder()}
                  multiSelect={false}
                  allowCreate={currentStep !== 'channel' || !!selectedVehicle}
                  emptyMessage={
                    currentStep === 'channel' && !selectedVehicle 
                      ? 'Selecione um veículo primeiro' 
                      : currentStep === 'vehicle' && !selectedMedium
                      ? 'Selecione um meio primeiro (ou continue sem filtrar)'
                      : 'Nenhum item disponível. Crie um novo abaixo.'
                  }
                />
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-primary">Detalhes da Linha:</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Investimento (R$) *</Label>
                      <Input
                        id="budget"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={lineDetails.budget}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, budget: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="destination_url">URL de Destino</Label>
                      <Input
                        id="destination_url"
                        type="url"
                        placeholder="https://seusite.com/landing-page"
                        value={lineDetails.destination_url}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, destination_url: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Data de Início *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={lineDetails.start_date}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Data de Fim *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={lineDetails.end_date}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Notas adicionais sobre esta linha..."
                      value={lineDetails.notes}
                      onChange={(e) => setLineDetails(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  
                  {/* Summary */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-medium mb-3">Resumo da Seleção:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Subdivisão:</span> {subdivisions.data?.find(s => s.id === selectedSubdivision)?.name || '-'}</div>
                      <div><span className="text-muted-foreground">Momento:</span> {moments.data?.find(m => m.id === selectedMoment)?.name || '-'}</div>
                      <div><span className="text-muted-foreground">Funil:</span> {funnelStages.data?.find(f => f.id === selectedFunnelStage)?.name || '-'}</div>
                      <div><span className="text-muted-foreground">Meio:</span> {mediums.data?.find(m => m.id === selectedMedium)?.name || '-'}</div>
                      <div><span className="text-muted-foreground">Veículo:</span> {vehicles.data?.find(v => v.id === selectedVehicle)?.name || '-'}</div>
                      <div><span className="text-muted-foreground">Canal:</span> {channels.data?.find(c => c.id === selectedChannel)?.name || '-'}</div>
                      <div className="col-span-2"><span className="text-muted-foreground">Target:</span> {targets.data?.find(t => t.id === selectedTarget)?.name || '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={currentStepIndex === 0 ? () => onOpenChange(false) : handleBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStepIndex === 0 ? 'Cancelar' : 'Voltar'}
            </Button>
            
            {currentStep === 'details' ? (
              <Button
                onClick={handleSave}
                disabled={!canProceed() || saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Criar Linha
                  </>
                )}
              </Button>
            ) : (
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
        </DialogContent>
      </Dialog>

      {/* Redistribute warning dialog */}
      <AlertDialog open={showRedistributeWarning} onOpenChange={setShowRedistributeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Redistribuir Orçamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Alterar a subdivisão do plano irá redistribuir automaticamente o orçamento de forma igual entre as fases do funil existentes. 
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubdivisionChange(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRedistribute}>
              Redistribuir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
