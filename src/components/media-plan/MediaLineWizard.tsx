import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
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
import { HierarchyBlockSelector, HierarchyItem } from './HierarchyBlockSelector';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets } from '@/hooks/useConfigData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MediaPlan } from '@/types/media';
import { cn } from '@/lib/utils';

interface PlanHierarchyOption {
  id: string | null;
  name: string;
}

interface MediaLineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MediaPlan;
  onComplete: () => void;
  planSubdivisions: PlanHierarchyOption[];
  planMoments: PlanHierarchyOption[];
  planFunnelStages: PlanHierarchyOption[];
  editingLine?: any; // MediaLine to edit
  initialStep?: WizardStep | 'creatives';
  prefillData?: {
    subdivisionId?: string;
    momentId?: string;
    funnelStageId?: string;
  };
}

type WizardStep = 'subdivision' | 'moment' | 'funnel' | 'medium' | 'vehicle' | 'channel' | 'target' | 'details' | 'creatives';

const STEP_ORDER: WizardStep[] = ['subdivision', 'moment', 'funnel', 'medium', 'vehicle', 'channel', 'target', 'details', 'creatives'];

const STEP_LABELS: Record<WizardStep, string> = {
  subdivision: 'Subdivisão do Plano',
  moment: 'Momento de Campanha',
  funnel: 'Fase do Funil',
  medium: 'Meio',
  vehicle: 'Veículo',
  channel: 'Canal',
  target: 'Segmentação',
  details: 'Detalhes da Linha',
  creatives: 'Criativos',
};

export function MediaLineWizard({
  open,
  onOpenChange,
  plan,
  onComplete,
  planSubdivisions,
  planMoments,
  planFunnelStages,
  editingLine,
  initialStep,
  prefillData,
}: MediaLineWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('subdivision');
  const [saving, setSaving] = useState(false);
  
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

  // Reset state when dialog opens or load editing line
  // Helper to get the appropriate value for a hierarchy selection
  const getHierarchyValue = (prefillId: string | undefined, planOptions: PlanHierarchyOption[]): string | null => {
    // If prefilled, use that value (undefined means use null)
    if (prefillId !== undefined) {
      return prefillId || null;
    }
    // If only one option, auto-select it
    if (planOptions.length === 1) {
      return planOptions[0].id;
    }
    // Otherwise, no selection
    return null;
  };

  useEffect(() => {
    if (open) {
      if (editingLine) {
        // Editing mode - prefill with existing values
        setCurrentStep(initialStep as WizardStep || 'subdivision');
        setSelectedSubdivision(editingLine.subdivision_id || null);
        setSelectedMoment(editingLine.moment_id || null);
        setSelectedFunnelStage(editingLine.funnel_stage_id || null);
        setSelectedMedium(editingLine.medium_id || null);
        setSelectedVehicle(editingLine.vehicle_id || null);
        setSelectedChannel(editingLine.channel_id || null);
        setSelectedTarget(editingLine.target_id || null);
        setLineDetails({
          budget: String(editingLine.budget || ''),
          start_date: editingLine.start_date || plan.start_date || '',
          end_date: editingLine.end_date || plan.end_date || '',
          destination_url: editingLine.destination_url || '',
          notes: editingLine.notes || '',
        });
      } else {
        // Create mode - prefill with hierarchy from where user clicked
        const subValue = getHierarchyValue(prefillData?.subdivisionId, planSubdivisions);
        const momValue = getHierarchyValue(prefillData?.momentId, planMoments);
        const funValue = getHierarchyValue(prefillData?.funnelStageId, planFunnelStages);
        
        setSelectedSubdivision(subValue);
        setSelectedMoment(momValue);
        setSelectedFunnelStage(funValue);
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
        
        // Determine starting step - skip hierarchy steps if only one option
        let startStep: WizardStep = 'subdivision';
        if (planSubdivisions.length <= 1) {
          startStep = 'moment';
          if (planMoments.length <= 1) {
            startStep = 'funnel';
            if (planFunnelStages.length <= 1) {
              startStep = 'medium';
            }
          }
        }
        setCurrentStep(startStep);
      }
    }
  }, [open, plan, editingLine, initialStep, prefillData, planSubdivisions, planMoments, planFunnelStages]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  // Check if hierarchy step should be skipped (only one option)
  const shouldSkipStep = (step: WizardStep): boolean => {
    if (step === 'subdivision') return planSubdivisions.length <= 1;
    if (step === 'moment') return planMoments.length <= 1;
    if (step === 'funnel') return planFunnelStages.length <= 1;
    return false;
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'subdivision':
        // Always can proceed - either prefilled or selected
        return selectedSubdivision !== undefined;
      case 'moment':
        return selectedMoment !== undefined;
      case 'funnel':
        return selectedFunnelStage !== undefined;
      case 'medium':
        return !!selectedMedium;
      case 'vehicle':
        return !!selectedVehicle;
      case 'channel':
        return !!selectedChannel;
      case 'target':
        return !!selectedTarget;
      case 'details':
        const validDates = lineDetails.start_date && lineDetails.end_date && lineDetails.end_date > lineDetails.start_date;
        return !!lineDetails.budget && validDates;
      case 'creatives':
        return true; // Always can proceed from creatives (optional step)
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


  // Generate automatic line code based on subdivision, moment, funnel stage
  const generateLineCode = async (): Promise<string> => {
    const subdivision = subdivisions.data?.find(s => s.id === selectedSubdivision);
    const moment = moments.data?.find(m => m.id === selectedMoment);
    const funnelStage = funnelStages.data?.find(f => f.id === selectedFunnelStage);
    
    const getFirstLetter = (name?: string) => {
      if (!name) return '';
      return name.charAt(0).toUpperCase();
    };
    
    const generateRandomLetters = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return Array.from({ length: 3 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };
    
    let prefix = '';
    prefix += subdivision?.name ? getFirstLetter(subdivision.name) : '';
    prefix += moment?.name ? getFirstLetter(moment.name) : '';
    prefix += funnelStage?.name ? getFirstLetter(funnelStage.name) : '';
    
    // If no letters, use random
    if (!prefix) {
      prefix = generateRandomLetters();
    }
    
    // Get existing codes in this plan
    const { data: existingLines } = await supabase
      .from('media_lines')
      .select('line_code')
      .eq('media_plan_id', plan.id);
    
    const existingCodes = (existingLines || []).map(l => l.line_code).filter(Boolean) as string[];
    
    // Find next available number
    let counter = 1;
    let code = `${prefix}${counter}`;
    while (existingCodes.includes(code)) {
      counter++;
      code = `${prefix}${counter}`;
    }
    
    return code;
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Generate line code for new lines
      let lineCode = editingLine?.line_code || null;
      if (!editingLine) {
        lineCode = await generateLineCode();
      }

      const lineData = {
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
        line_code: lineCode,
      };

      if (editingLine) {
        // Update existing line
        const { error } = await supabase
          .from('media_lines')
          .update(lineData)
          .eq('id', editingLine.id);

        if (error) throw error;
        toast.success('Linha de mídia atualizada!');
      } else {
        // Create new line
        const { error } = await supabase
          .from('media_lines')
          .insert({
            ...lineData,
            media_plan_id: plan.id,
            user_id: user.id,
          });

        if (error) throw error;
        toast.success('Linha de mídia criada!');
      }

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving line:', error);
      toast.error(editingLine ? 'Erro ao atualizar linha de mídia' : 'Erro ao criar linha de mídia');
    } finally {
      setSaving(false);
    }
  };

  const getItemsForStep = (): HierarchyItem[] => {
    switch (currentStep) {
      case 'subdivision':
        // Only show subdivisions that exist in the plan
        return planSubdivisions.map(s => ({
          id: s.id || 'null',
          name: s.name,
        }));
      case 'moment':
        // Only show moments that exist in the plan
        return planMoments.map(m => ({
          id: m.id || 'null',
          name: m.name,
        }));
      case 'funnel':
        // Only show funnel stages that exist in the plan
        return planFunnelStages.map(f => ({
          id: f.id || 'null',
          name: f.name,
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
      case 'subdivision': return selectedSubdivision === null ? 'null' : selectedSubdivision;
      case 'moment': return selectedMoment === null ? 'null' : selectedMoment;
      case 'funnel': return selectedFunnelStage === null ? 'null' : selectedFunnelStage;
      case 'medium': return selectedMedium;
      case 'vehicle': return selectedVehicle;
      case 'channel': return selectedChannel;
      case 'target': return selectedTarget;
      default: return null;
    }
  };

  // Check if current step is a hierarchy step (subdivision, moment, funnel)
  const isHierarchyStep = currentStep === 'subdivision' || currentStep === 'moment' || currentStep === 'funnel';

  const handleSelect = (id: string) => {
    const actualId = id === 'null' ? null : id;
    switch (currentStep) {
      case 'subdivision':
        setSelectedSubdivision(actualId);
        break;
      case 'moment':
        setSelectedMoment(actualId);
        break;
      case 'funnel':
        setSelectedFunnelStage(actualId);
        break;
      case 'medium':
        setSelectedMedium(actualId);
        setSelectedVehicle(null);
        setSelectedChannel(null);
        break;
      case 'vehicle':
        setSelectedVehicle(actualId);
        setSelectedChannel(null);
        break;
      case 'channel':
        setSelectedChannel(actualId);
        break;
      case 'target':
        setSelectedTarget(actualId);
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
            <DialogTitle>{editingLine ? 'Editar Linha de Mídia' : 'Nova Linha de Mídia'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Edite os campos da linha de mídia' : 'Configure a linha seguindo a hierarquia do plano'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress indicators - clickable in edit mode */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEP_ORDER.map((step, index) => {
              const isActive = currentStep === step;
              const isPast = index < currentStepIndex;
              const canClick = editingLine; // Can click to jump in edit mode
              
              return (
                <button
                  key={step}
                  type="button"
                  disabled={!canClick}
                  onClick={() => canClick && setCurrentStep(step)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    isActive && "bg-primary text-primary-foreground",
                    isPast && "bg-success/20 text-success",
                    !isActive && !isPast && "bg-muted text-muted-foreground",
                    canClick && !isActive && "hover:bg-muted/80 cursor-pointer"
                  )}
                >
                  {isPast && <Check className="w-3 h-3" />}
                  {STEP_LABELS[step]}
                </button>
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
              {currentStep !== 'details' && currentStep !== 'creatives' ? (
                <HierarchyBlockSelector
                  title={STEP_LABELS[currentStep]}
                  items={getItemsForStep()}
                  selectedIds={selectedId ? [selectedId] : []}
                  onSelect={handleSelect}
                  onDeselect={handleDeselect}
                  onCreate={isHierarchyStep ? undefined : handleCreate}
                  createPlaceholder={getCreatePlaceholder()}
                  multiSelect={false}
                  allowCreate={!isHierarchyStep && (currentStep !== 'channel' || !!selectedVehicle)}
                  emptyMessage={
                    currentStep === 'channel' && !selectedVehicle 
                      ? 'Selecione um veículo primeiro' 
                      : currentStep === 'vehicle' && !selectedMedium
                      ? 'Selecione um meio primeiro (ou continue sem filtrar)'
                      : 'Nenhum item disponível. Crie um novo abaixo.'
                  }
                />
              ) : currentStep === 'creatives' ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-primary">Criativos da Linha:</h3>
                  
                  {editingLine ? (
                    <CreativesSection lineId={editingLine.id} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Os criativos podem ser adicionados após salvar a linha.</p>
                    </div>
                  )}
                </div>
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
                        max={lineDetails.end_date || undefined}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Data de Fim *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={lineDetails.end_date}
                        min={lineDetails.start_date || undefined}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                      {lineDetails.start_date && lineDetails.end_date && lineDetails.end_date <= lineDetails.start_date && (
                        <p className="text-xs text-destructive">A data de fim deve ser posterior à data de início</p>
                      )}
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
            
            {(currentStep === 'details' && !editingLine) || currentStep === 'creatives' ? (
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
                    {editingLine ? 'Salvar Alterações' : 'Criar Linha'}
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

    </>
  );
}

// Creatives Section Component
function CreativesSection({ lineId }: { lineId: string }) {
  const { user } = useAuth();
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCreativeName, setNewCreativeName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadCreatives();
  }, [lineId]);

  const loadCreatives = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('media_creatives')
      .select('*')
      .eq('media_line_id', lineId)
      .order('created_at', { ascending: false });
    setCreatives(data || []);
    setLoading(false);
  };

  const addCreative = async () => {
    if (!newCreativeName.trim() || !user) return;
    
    setAdding(true);
    const { error } = await supabase
      .from('media_creatives')
      .insert({
        media_line_id: lineId,
        user_id: user.id,
        name: newCreativeName.trim(),
      });
    
    if (!error) {
      setNewCreativeName('');
      await loadCreatives();
      toast.success('Criativo adicionado!');
    }
    setAdding(false);
  };

  const deleteCreative = async (id: string) => {
    await supabase.from('media_creatives').delete().eq('id', id);
    await loadCreatives();
    toast.success('Criativo removido');
  };

  if (loading) {
    return <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Add new creative */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome do criativo..."
          value={newCreativeName}
          onChange={(e) => setNewCreativeName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCreative()}
        />
        <Button onClick={addCreative} disabled={adding || !newCreativeName.trim()}>
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
        </Button>
      </div>

      {/* List of creatives */}
      {creatives.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border rounded-lg">
          Nenhum criativo adicionado ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {creatives.map((creative) => (
            <div
              key={creative.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-background"
            >
              <div>
                <div className="font-medium">{creative.name}</div>
                {creative.creative_type && (
                  <div className="text-xs text-muted-foreground">{creative.creative_type}</div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteCreative(creative.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
