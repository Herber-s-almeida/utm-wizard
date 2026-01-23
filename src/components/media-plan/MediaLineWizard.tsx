import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, X, Save, Link2, AlertCircle, Plus } from 'lucide-react';
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
import { HierarchyPositionSelector } from './HierarchyPositionSelector';
import { useSubdivisions, useMoments, useFunnelStages, useMediums, useVehicles, useChannels, useTargets, useMediaObjectives } from '@/hooks/useConfigData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MediaPlan, MediaCreative } from '@/types/media';
import { cn } from '@/lib/utils';
import { CreativesManager } from '@/components/media/CreativesManager';
import { generateUTM, toSlug } from '@/utils/utmGenerator';
import { UTMPreview } from './UTMPreview';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';
import { DuplicateLineDialog } from './DuplicateLineDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HierarchyLevel, DEFAULT_HIERARCHY_ORDER, getLevelLabel } from '@/types/hierarchy';

const STEP_TOOLTIPS: Record<string, string> = {
  subdivision: 'Agrupa linhas por região, produto ou objetivo. Define a primeira parte da estrutura do plano.',
  moment: 'Fase temporal da campanha: lançamento, sustentação, promoção, etc.',
  funnel: 'Etapa da jornada do cliente: conhecimento, consideração ou conversão.',
  medium: 'Categoria principal do canal: Digital, TV, OOH, Rádio, etc.',
  vehicle: 'Plataforma específica de veiculação. Ex: Google Ads, Meta, Globo.',
  channel: 'Formato ou tipo de anúncio dentro do veículo. Ex: Search, Display, Stories.',
  target: 'Público-alvo para esta linha. Ex: Mulheres 25-45, Interessados em Tecnologia.',
};

interface PlanHierarchyOption {
  id: string | null;
  name: string;
}

interface MomentDates {
  start_date?: string | null;
  end_date?: string | null;
}

interface MediaLineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MediaPlan;
  onComplete: () => void;
  planSubdivisions: PlanHierarchyOption[];
  planMoments: PlanHierarchyOption[];
  planFunnelStages: PlanHierarchyOption[];
  hierarchyOrder?: HierarchyLevel[];
  momentDates?: Record<string, MomentDates>; // moment_id -> dates
  existingLines?: { line_code: string; moment_id: string | null; moment_name: string }[];
  editingLine?: any; // MediaLine to edit
  initialStep?: WizardStep | 'creatives';
  prefillData?: {
    subdivisionId?: string;
    momentId?: string;
    funnelStageId?: string;
  };
}

type WizardStep = 'position' | 'medium' | 'vehicle' | 'channel' | 'target' | 'details' | 'creatives';

const STEP_ORDER: WizardStep[] = ['position', 'medium', 'vehicle', 'channel', 'target', 'details', 'creatives'];

const STEP_LABELS: Record<WizardStep, string> = {
  position: 'Posição no Plano',
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
  hierarchyOrder = DEFAULT_HIERARCHY_ORDER,
  momentDates = {},
  existingLines = [],
  editingLine,
  initialStep,
  prefillData,
}: MediaLineWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('position');
  const [saving, setSaving] = useState(false);
  
  // Ref to track if wizard has been initialized to prevent resets on refocus
  const hasInitialized = useRef(false);
  const editingLineIdRef = useRef<string | undefined>(undefined);
  const [savedLineId, setSavedLineId] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<MediaCreative[]>([]);
  
  // Duplicate line dialog state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ lineCode: string; existingMomentName: string } | null>(null);
  const [pendingLineData, setPendingLineData] = useState<any>(null);
  
  // Selection state
  const [selectedSubdivision, setSelectedSubdivision] = useState<string | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  
  // Inline objective creation state
  const [newObjectiveName, setNewObjectiveName] = useState('');
  const [creatingObjective, setCreatingObjective] = useState(false);
  
  // Details form
  const [lineDetails, setLineDetails] = useState({
    budget: '',
    start_date: plan.start_date || '',
    end_date: plan.end_date || '',
    destination_url: '',
    notes: '',
  });

  // Get moment dates for selected moment
  const selectedMomentDates = useMemo(() => {
    if (!selectedMoment) return null;
    return momentDates[selectedMoment] || null;
  }, [selectedMoment, momentDates]);

  // Get effective date boundaries (moment dates take priority over plan dates)
  const effectiveDateBoundaries = useMemo(() => {
    const momentStart = selectedMomentDates?.start_date;
    const momentEnd = selectedMomentDates?.end_date;
    
    return {
      minDate: momentStart || plan.start_date || undefined,
      maxDate: momentEnd || plan.end_date || undefined,
      hasMomentDates: !!(momentStart || momentEnd),
    };
  }, [selectedMomentDates, plan.start_date, plan.end_date]);

  // Hooks for library data
  const subdivisions = useSubdivisions();
  const moments = useMoments();
  const funnelStages = useFunnelStages();
  const mediums = useMediums();
  const vehicles = useVehicles();
  const channels = useChannels();
  const targets = useTargets();
  const mediaObjectives = useMediaObjectives();

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
      // Only initialize if:
      // 1. We haven't initialized yet, OR
      // 2. We're editing a different line than before
      const isNewEditingLine = editingLine?.id !== editingLineIdRef.current;
      
      if (!hasInitialized.current || isNewEditingLine) {
        editingLineIdRef.current = editingLine?.id;
        
        if (editingLine) {
          // Editing mode - prefill with existing values
          // Map old step names to new ones
          let mappedStep: WizardStep = 'position';
          const oldHierarchySteps = ['subdivision', 'moment', 'funnel'];
          if (initialStep && oldHierarchySteps.includes(initialStep)) {
            mappedStep = 'position';
          } else if (initialStep && STEP_ORDER.includes(initialStep as WizardStep)) {
            mappedStep = initialStep as WizardStep;
          }
          setCurrentStep(mappedStep);
          setSelectedSubdivision(editingLine.subdivision_id || null);
          setSelectedMoment(editingLine.moment_id || null);
          setSelectedFunnelStage(editingLine.funnel_stage_id || null);
          setSelectedMedium(editingLine.medium_id || null);
          setSelectedVehicle(editingLine.vehicle_id || null);
          setSelectedChannel(editingLine.channel_id || null);
          setSelectedTarget(editingLine.target_id || null);
          setSelectedObjective(editingLine.objective_id || null);
          setLineDetails({
            budget: String(editingLine.budget || ''),
            start_date: editingLine.start_date || plan.start_date || '',
            end_date: editingLine.end_date || plan.end_date || '',
            destination_url: editingLine.destination_url || '',
            notes: editingLine.notes || '',
          });
          setSavedLineId(editingLine.id);
          loadCreatives(editingLine.id);
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
          setSelectedObjective(null);
          setLineDetails({
            budget: '',
            start_date: plan.start_date || '',
            end_date: plan.end_date || '',
            destination_url: '',
            notes: '',
          });
          setSavedLineId(null);
          setCreatives([]);
          
          // Always start at position step now (it handles skipping internally)
          setCurrentStep('position');
        }
        
        hasInitialized.current = true;
      }
    } else {
      // Reset the flag when dialog closes
      hasInitialized.current = false;
      editingLineIdRef.current = undefined;
    }
  }, [open, plan, editingLine, initialStep, prefillData, planSubdivisions, planMoments, planFunnelStages]);

  // Auto-fill dates when moment is selected (only in create mode)
  useEffect(() => {
    if (!open || editingLine) return;
    
    if (selectedMoment && selectedMomentDates) {
      const newStartDate = selectedMomentDates.start_date || plan.start_date || '';
      const newEndDate = selectedMomentDates.end_date || plan.end_date || '';
      
      setLineDetails(prev => ({
        ...prev,
        start_date: newStartDate,
        end_date: newEndDate,
      }));
    }
  }, [selectedMoment, selectedMomentDates, open, editingLine, plan.start_date, plan.end_date]);

  const loadCreatives = async (lineId: string) => {
    const { data } = await supabase
      .from('media_creatives')
      .select('*')
      .eq('media_line_id', lineId)
      .order('created_at', { ascending: false });
    setCreatives((data as MediaCreative[]) || []);
  };

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  // Check if all position hierarchy is selected
  const isPositionComplete = (): boolean => {
    // All hierarchy items must be defined (can be null, just not undefined)
    return selectedSubdivision !== undefined && selectedMoment !== undefined && selectedFunnelStage !== undefined;
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'position':
        return isPositionComplete();
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
        // Validate that dates are within moment dates (or plan dates if no moment dates)
        const minDate = effectiveDateBoundaries.minDate;
        const maxDate = effectiveDateBoundaries.maxDate;
        const startWithinBoundary = !minDate || lineDetails.start_date >= minDate;
        const endWithinBoundary = !maxDate || lineDetails.end_date <= maxDate;
        return !!lineDetails.budget && validDates && startWithinBoundary && endWithinBoundary;
      case 'creatives':
        return true; // Always can proceed from creatives (optional step)
      default:
        return false;
    }
  };

  // Check if line_code already exists in another moment
  const checkForDuplicateLineCode = (lineCode: string): { isDuplicate: boolean; existingMomentName: string } => {
    const duplicateLine = existingLines.find(
      line => line.line_code === lineCode && line.moment_id !== selectedMoment
    );
    return {
      isDuplicate: !!duplicateLine,
      existingMomentName: duplicateLine?.moment_name || 'Geral',
    };
  };

  // Create objective inline
  const handleCreateObjective = async () => {
    if (!newObjectiveName.trim() || !user) return;
    
    setCreatingObjective(true);
    try {
      const created = await mediaObjectives.create.mutateAsync({ 
        name: newObjectiveName.trim() 
      });
      setSelectedObjective(created.id);
      setNewObjectiveName('');
      toast.success(`Objetivo "${created.name}" criado!`);
    } catch (error) {
      // Toast de erro já é exibido pelo hook
    } finally {
      setCreatingObjective(false);
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

  // Get moment name for the target moment
  const getSelectedMomentName = (): string => {
    if (!selectedMoment) return 'Geral';
    return planMoments.find(m => m.id === selectedMoment)?.name || 'Geral';
  };

  // Duplicate an existing line to the current moment
  const handleDuplicateLine = async () => {
    if (!pendingLineData) return;
    
    setSaving(true);
    try {
      // Find the existing line with same line_code
      const existingLine = existingLines.find(l => l.line_code === pendingLineData.lineCode);
      if (existingLine) {
        // Fetch the full line data
        const { data: sourceLineData } = await supabase
          .from('media_lines')
          .select('*')
          .eq('media_plan_id', plan.id)
          .eq('line_code', pendingLineData.lineCode)
          .single();
        
        if (sourceLineData) {
          // Create a copy for the new moment
          const { error } = await supabase
            .from('media_lines')
            .insert({
              ...sourceLineData,
              id: undefined, // Let DB generate new ID
              moment_id: selectedMoment,
              start_date: lineDetails.start_date || sourceLineData.start_date,
              end_date: lineDetails.end_date || sourceLineData.end_date,
              created_at: undefined,
              updated_at: undefined,
            });
          
          if (error) throw error;
          toast.success('Linha duplicada para este momento!');
          onComplete();
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Error duplicating line:', error);
      toast.error('Erro ao duplicar linha');
    } finally {
      setSaving(false);
      setPendingLineData(null);
    }
  };

  // Create new line with different code
  const handleCreateNewLineCode = async () => {
    setPendingLineData(null);
    // Force generate a new unique code and save
    await handleSave(false, true);
  };

  const handleSave = async (goToCreatives: boolean = false, forceNewCode: boolean = false) => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Generate line code for new lines
      let lineCode = editingLine?.line_code || (savedLineId ? undefined : null);
      if (!editingLine && !savedLineId) {
        lineCode = await generateLineCode();
        
        // Check for duplicate if not forcing new code
        if (!forceNewCode) {
          const { isDuplicate, existingMomentName } = checkForDuplicateLineCode(lineCode);
          if (isDuplicate) {
            // Show duplicate dialog
            setDuplicateInfo({ lineCode, existingMomentName });
            setPendingLineData({ lineCode });
            setShowDuplicateDialog(true);
            setSaving(false);
            return;
          }
        }
      }

      // Get slugs for UTM generation
      const subdivision = subdivisions.data?.find(s => s.id === selectedSubdivision);
      const moment = moments.data?.find(m => m.id === selectedMoment);
      const funnelStage = funnelStages.data?.find(f => f.id === selectedFunnelStage);
      const vehicle = vehicles.data?.find(v => v.id === selectedVehicle);
      const channel = channels.data?.find(c => c.id === selectedChannel);
      const target = targets.data?.find(t => t.id === selectedTarget);

      // Generate UTM parameters with dynamic hierarchy order
      const utmParams = generateUTM({
        lineCode: lineCode || '',
        campaignName: plan.campaign,
        subdivisionSlug: (subdivision as any)?.slug || toSlug(subdivision?.name),
        momentSlug: (moment as any)?.slug || toSlug(moment?.name),
        funnelStageSlug: (funnelStage as any)?.slug || toSlug(funnelStage?.name),
        vehicleSlug: (vehicle as any)?.slug || toSlug(vehicle?.name),
        channelSlug: (channel as any)?.slug || toSlug(channel?.name),
        targetSlug: (target as any)?.slug || toSlug(target?.name),
        hierarchyOrder,
      });

      const lineData = {
        subdivision_id: selectedSubdivision,
        moment_id: selectedMoment,
        funnel_stage_id: selectedFunnelStage,
        medium_id: selectedMedium,
        vehicle_id: selectedVehicle,
        channel_id: selectedChannel,
        target_id: selectedTarget,
        objective_id: selectedObjective,
        budget: parseFloat(lineDetails.budget) || 0,
        start_date: lineDetails.start_date,
        end_date: lineDetails.end_date,
        destination_url: lineDetails.destination_url || null,
        notes: lineDetails.notes || null,
        platform: vehicles.data?.find(v => v.id === selectedVehicle)?.name || 'Outro',
        funnel_stage: 'top', // Legacy field
        line_code: lineCode,
        // UTM fields
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_term: utmParams.utm_term || null,
        utm_validated: false,
      };

      if (editingLine || savedLineId) {
        // Update existing line
        const { error } = await supabase
          .from('media_lines')
          .update({
            ...lineData,
            environment_id: plan.environment_id,
          })
          .eq('id', editingLine?.id || savedLineId);

        if (error) throw error;
        toast.success('Linha de mídia salva!');
        
        if (goToCreatives) {
          setCurrentStep('creatives');
        } else if (currentStep === 'creatives') {
          onComplete();
          onOpenChange(false);
        }
      } else {
        // Create new line
        const { data, error } = await supabase
          .from('media_lines')
          .insert({
            ...lineData,
            media_plan_id: plan.id,
            user_id: user.id,
            environment_id: plan.environment_id,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Linha de mídia criada!');
        
        if (goToCreatives && data) {
          setSavedLineId(data.id);
          setCurrentStep('creatives');
        } else {
          onComplete();
          onOpenChange(false);
        }
      }
    } catch (error: any) {
      console.error('Error saving line:', error);
      
      // Mensagens específicas por código de erro
      if (error?.code === '42501') {
        toast.error('Sem permissão para salvar. Verifique suas permissões no ambiente.');
      } else if (error?.code === '23503') {
        toast.error('Referência inválida. Verifique se todos os campos selecionados são válidos.');
      } else if (error?.code === '23505') {
        toast.error('Registro duplicado. Já existe uma linha com esses dados.');
      } else {
        toast.error(error?.message || 'Erro ao salvar linha de mídia');
      }
    } finally {
      setSaving(false);
    }
  };

  const getItemsForStep = (): HierarchyItem[] => {
    switch (currentStep) {
      case 'medium':
        return (mediums.activeItems || []).map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
        }));
      case 'vehicle':
        // Filter vehicles by selected medium
        return (vehicles.activeItems || [])
          .filter(v => !selectedMedium || v.medium_id === selectedMedium || !v.medium_id)
          .map(v => ({
            id: v.id,
            name: v.name,
            description: v.description,
          }));
      case 'channel':
        // Filter channels by selected vehicle
        return (channels.activeItems || [])
          .filter(c => !selectedVehicle || c.vehicle_id === selectedVehicle)
          .map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
          }));
      case 'target':
        return (targets.activeItems || []).map(t => ({
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
      case 'medium': return selectedMedium;
      case 'vehicle': return selectedVehicle;
      case 'channel': return selectedChannel;
      case 'target': return selectedTarget;
      default: return null;
    }
  };


  const handleSelect = (id: string) => {
    const actualId = id === 'null' ? null : id;
    switch (currentStep) {
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
              {currentStep === 'position' ? (
                <HierarchyPositionSelector
                  hierarchyOrder={hierarchyOrder}
                  planSubdivisions={planSubdivisions}
                  planMoments={planMoments}
                  planFunnelStages={planFunnelStages}
                  selectedSubdivision={selectedSubdivision}
                  selectedMoment={selectedMoment}
                  selectedFunnelStage={selectedFunnelStage}
                  onSubdivisionChange={setSelectedSubdivision}
                  onMomentChange={setSelectedMoment}
                  onFunnelStageChange={setSelectedFunnelStage}
                />
              ) : currentStep !== 'details' && currentStep !== 'creatives' ? (
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
              ) : currentStep === 'creatives' ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-primary">Criativos da Linha:</h3>
                  
                  {(editingLine || savedLineId) && user ? (
                    <CreativesManager
                      mediaLineId={editingLine?.id || savedLineId!}
                      userId={user.id}
                      creatives={creatives}
                      onUpdate={() => loadCreatives(editingLine?.id || savedLineId!)}
                    />
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
                      <LabelWithTooltip 
                        htmlFor="budget" 
                        tooltip="Valor a ser investido nesta linha. Será somado ao total distribuído do plano."
                        required
                      >
                        Investimento (R$)
                      </LabelWithTooltip>
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
                      <LabelWithTooltip 
                        htmlFor="destination_url" 
                        tooltip="Deixe vazio para usar a URL padrão do plano, ou insira uma URL específica para esta linha."
                      >
                        URL de Destino
                      </LabelWithTooltip>
                      <Input
                        id="destination_url"
                        type="url"
                        placeholder="https://seusite.com/landing-page"
                        value={lineDetails.destination_url}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, destination_url: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  {/* Objective */}
                  <div className="space-y-2">
                    <LabelWithTooltip 
                      htmlFor="objective" 
                      tooltip="Objetivo de performance desta linha. Ex: Cliques, Impressões, Conversões."
                    >
                      Objetivo de Mídia
                    </LabelWithTooltip>
                    <select
                      id="objective"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedObjective || ''}
                      onChange={(e) => setSelectedObjective(e.target.value || null)}
                    >
                      <option value="">Selecione um objetivo...</option>
                      {mediaObjectives.activeItems?.map(obj => (
                        <option key={obj.id} value={obj.id}>{obj.name}</option>
                      ))}
                    </select>
                    
                    {/* Inline creation - matching wizard pattern */}
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Novo objetivo (ex: Cliques, Conversões)"
                        value={newObjectiveName}
                        onChange={(e) => setNewObjectiveName(e.target.value.slice(0, 25))}
                        maxLength={25}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateObjective();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCreateObjective}
                        disabled={!newObjectiveName.trim() || creatingObjective}
                        title="Criar objetivo"
                      >
                        {creatingObjective ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {newObjectiveName.length}/25 caracteres
                    </p>
                  </div>
                  
                  {/* Moment date boundary alert */}
                  {effectiveDateBoundaries.hasMomentDates && (
                    <Alert className="bg-primary/5 border-primary/20">
                      <Link2 className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-sm">
                        As datas da linha devem estar dentro do período do momento selecionado
                        {effectiveDateBoundaries.minDate && effectiveDateBoundaries.maxDate && (
                          <span className="font-medium">
                            {' '}({new Date(effectiveDateBoundaries.minDate + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(effectiveDateBoundaries.maxDate + 'T00:00:00').toLocaleDateString('pt-BR')})
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <LabelWithTooltip 
                        htmlFor="start_date" 
                        tooltip={effectiveDateBoundaries.hasMomentDates 
                          ? "Deve estar dentro do período do momento selecionado." 
                          : "Deve estar dentro do período do plano."
                        }
                        required
                      >
                        Data de Início
                      </LabelWithTooltip>
                      <Input
                        id="start_date"
                        type="date"
                        value={lineDetails.start_date}
                        min={effectiveDateBoundaries.minDate}
                        max={lineDetails.end_date || effectiveDateBoundaries.maxDate}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                      {effectiveDateBoundaries.minDate && lineDetails.start_date && lineDetails.start_date < effectiveDateBoundaries.minDate && (
                        <p className="text-xs text-destructive">
                          A data de início não pode ser anterior a {new Date(effectiveDateBoundaries.minDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <LabelWithTooltip 
                        htmlFor="end_date" 
                        tooltip={effectiveDateBoundaries.hasMomentDates 
                          ? "Deve estar dentro do período do momento e ser posterior à data de início." 
                          : "Deve estar dentro do período do plano e ser posterior à data de início."
                        }
                        required
                      >
                        Data de Fim
                      </LabelWithTooltip>
                      <Input
                        id="end_date"
                        type="date"
                        value={lineDetails.end_date}
                        min={lineDetails.start_date || effectiveDateBoundaries.minDate}
                        max={effectiveDateBoundaries.maxDate}
                        onChange={(e) => setLineDetails(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                      {lineDetails.start_date && lineDetails.end_date && lineDetails.end_date <= lineDetails.start_date && (
                        <p className="text-xs text-destructive">A data de fim deve ser posterior à data de início</p>
                      )}
                      {effectiveDateBoundaries.maxDate && lineDetails.end_date && lineDetails.end_date > effectiveDateBoundaries.maxDate && (
                        <p className="text-xs text-destructive">
                          A data de fim não pode ser posterior a {new Date(effectiveDateBoundaries.maxDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <LabelWithTooltip 
                      htmlFor="notes" 
                      tooltip="Observações internas sobre a linha. Não aparecem em exportações ou UTMs."
                    >
                      Observações
                    </LabelWithTooltip>
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
                      <div><span className="text-muted-foreground">Target:</span> {targets.data?.find(t => t.id === selectedTarget)?.name || '-'}</div>
                      <div><span className="text-muted-foreground">Objetivo:</span> {mediaObjectives.activeItems?.find(o => o.id === selectedObjective)?.name || '-'}</div>
                    </div>
                  </div>

                  {/* UTM Preview - always show with fallback URL */}
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Preview dos UTMs:</h4>
                    <UTMPreview
                      destinationUrl={lineDetails.destination_url || null}
                      fallbackUrl={(plan as any).default_url || null}
                      utmParams={generateUTM({
                        lineCode: editingLine?.line_code || 'NEW',
                        campaignName: plan.campaign,
                        subdivisionSlug: toSlug(subdivisions.data?.find(s => s.id === selectedSubdivision)?.name),
                        momentSlug: toSlug(moments.data?.find(m => m.id === selectedMoment)?.name),
                        funnelStageSlug: toSlug(funnelStages.data?.find(f => f.id === selectedFunnelStage)?.name),
                        vehicleSlug: toSlug(vehicles.data?.find(v => v.id === selectedVehicle)?.name),
                        channelSlug: toSlug(channels.data?.find(c => c.id === selectedChannel)?.name),
                        targetSlug: toSlug(targets.data?.find(t => t.id === selectedTarget)?.name),
                      })}
                      isValidated={editingLine?.utm_validated || false}
                    />
                    {!lineDetails.destination_url && !(plan as any).default_url && (
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Dica: Preencha a URL de destino acima ou defina uma URL padrão nas configurações do plano.
                      </p>
                    )}
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
            
            <div className="flex gap-2">
              {currentStep === 'details' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleSave(false)}
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
                        <Save className="w-4 h-4" />
                        Salvar
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleSave(true)}
                    disabled={!canProceed() || saving}
                    className="gap-2"
                  >
                    Próximo
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              {currentStep === 'creatives' && (
                <Button
                  onClick={() => {
                    onComplete();
                    onOpenChange(false);
                  }}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  Concluir
                </Button>
              )}
              
              {currentStep !== 'details' && currentStep !== 'creatives' && (
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
        </DialogContent>
      </Dialog>

      {/* Duplicate Line Dialog */}
      {duplicateInfo && (
        <DuplicateLineDialog
          open={showDuplicateDialog}
          onOpenChange={setShowDuplicateDialog}
          lineCode={duplicateInfo.lineCode}
          existingMomentName={duplicateInfo.existingMomentName}
          targetMomentName={getSelectedMomentName()}
          onDuplicate={handleDuplicateLine}
          onCreateNew={handleCreateNewLineCode}
        />
      )}
    </>
  );
}
