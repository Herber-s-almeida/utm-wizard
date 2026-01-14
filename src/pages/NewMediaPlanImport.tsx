import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useImportPlan, UnresolvedEntity, EntityType } from '@/hooks/useImportPlan';
import { ImportFileUpload } from '@/components/import/ImportFileUpload';
import { ImportColumnMapper } from '@/components/import/ImportColumnMapper';
import { ImportPlanInfo } from '@/components/import/ImportPlanInfo';
import { ImportEntityResolver } from '@/components/import/ImportEntityResolver';
import { WizardStepper } from '@/components/media-plan/WizardStepper';
import { VehicleDialog } from '@/components/config/VehicleDialog';
import { ChannelDialog } from '@/components/config/ChannelDialog';
import { SubdivisionDialog } from '@/components/config/SubdivisionDialog';
import { TargetDialog } from '@/components/config/TargetDialog';
import { SimpleConfigDialog } from '@/components/config/SimpleConfigDialog';
import { HierarchyOrderSelector } from '@/components/media-plan/HierarchyOrderSelector';
import { useVehicles, useMediums, useChannels, useSubdivisions, useTargets, useMoments, useFunnelStages, Vehicle, Medium } from '@/hooks/useConfigData';

const STEPS = [
  { id: 1, title: 'Upload' },
  { id: 2, title: 'Colunas' },
  { id: 3, title: 'Plano' },
  { id: 4, title: 'Entidades' },
  { id: 5, title: 'Hierarquia do Orçamento' },
  { id: 6, title: 'Confirmar' },
];

export default function NewMediaPlanImport() {
  const navigate = useNavigate();
  const {
    state,
    handleFileUpload,
    updateMapping,
    confirmMappings,
    updatePlanInfo,
    confirmPlanInfo,
    resolveEntity,
    unresolveEntity,
    setEntityCreating,
    addCreatedEntity,
    confirmEntityResolution,
    updateHierarchyOrder,
    confirmHierarchy,
    createPlan,
    goBack,
  } = useImportPlan();

  const vehiclesQuery = useVehicles();
  const mediumsQuery = useMediums();
  const channelsQuery = useChannels();
  const subdivisionsQuery = useSubdivisions();
  const targetsQuery = useTargets();
  const momentsQuery = useMoments();
  const funnelStagesQuery = useFunnelStages();
  
  const vehicles = (vehiclesQuery.activeItems || []) as Vehicle[];
  const mediums = (mediumsQuery.activeItems || []) as Medium[];
  
  const [creatingEntity, setCreatingEntity] = useState<UnresolvedEntity | null>(null);

  const canProceed = () => {
    switch (state.step) {
      case 1: return !!state.file;
      case 2: {
        const mapped = state.mappings.filter(m => m.systemField);
        const required = ['linha_codigo', 'veiculo', 'canal', 'orcamento_total'];
        return required.every(f => mapped.some(m => m.systemField === f));
      }
      case 3: return !!state.planInfo.name.trim() && !state.isCheckingEntities;
      case 4: return state.unresolvedEntities.every(e => e.status !== 'pending');
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (state.step) {
      case 2: confirmMappings(); break;
      case 3: confirmPlanInfo(); break;
      case 4: confirmEntityResolution(); break;
      case 5: confirmHierarchy(); break;
      case 6: createPlan(); break;
    }
  };

  const handleCreateEntity = (entity: UnresolvedEntity) => {
    setEntityCreating(entity.id, true);
    setCreatingEntity(entity);
  };

  const handleEntityCreated = (entityId: string, newId: string, entityType: EntityType, entityName: string, parentId?: string) => {
    resolveEntity(entityId, newId);
    addCreatedEntity(entityType, { id: newId, name: entityName, parentId });
    setCreatingEntity(null);
  };

  const handleDialogClose = () => {
    if (creatingEntity) {
      setEntityCreating(creatingEntity.id, false);
    }
    setCreatingEntity(null);
  };

  const calculatedBudget = state.parseResult?.lines.reduce((sum, l) => sum + l.totalBudget, 0) || 0;
  const allDates = state.parseResult?.lines.flatMap(l => [l.startDate, l.endDate].filter(Boolean)) as Date[] || [];
  const calculatedStartDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
  const calculatedEndDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;

  // Get parent vehicle for channel creation
  const getParentVehicle = () => {
    if (!creatingEntity?.parentContext?.name) return null;
    const vehicleName = creatingEntity.parentContext.name.toLowerCase();
    
    // First, check if the vehicle was resolved in unresolvedEntities
    const resolvedVehicle = state.unresolvedEntities.find(
      e => e.type === 'vehicle' && 
           e.originalName.toLowerCase() === vehicleName &&
           e.status === 'resolved' &&
           e.resolvedId
    );
    
    if (resolvedVehicle?.resolvedId) {
      // Find the full vehicle data by the resolved ID
      return vehicles.find(v => v.id === resolvedVehicle.resolvedId);
    }
    
    // Fallback: find by original name
    return vehicles.find(v => v.name.toLowerCase() === vehicleName);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/media-plans/new')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Importar Plano de Mídia</h1>
            <p className="text-muted-foreground text-sm">
              Crie um plano completo a partir de um arquivo CSV ou Excel
            </p>
          </div>
        </div>

        {/* Stepper */}
        <WizardStepper steps={STEPS} currentStep={state.step - 1} />

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            {state.step === 1 && (
              <ImportFileUpload file={state.file} onFileSelect={handleFileUpload} />
            )}

            {state.step === 2 && (
              <ImportColumnMapper
                mappings={state.mappings}
                monthColumns={state.monthColumns}
                onUpdateMapping={updateMapping}
              />
            )}

            {state.step === 3 && !state.isCheckingEntities && (
              <ImportPlanInfo
                planInfo={state.planInfo}
                onUpdatePlanInfo={updatePlanInfo}
                calculatedBudget={calculatedBudget}
                calculatedStartDate={calculatedStartDate}
                calculatedEndDate={calculatedEndDate}
              />
            )}

            {state.step === 3 && state.isCheckingEntities && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Verificando entidades...</p>
              </div>
            )}

            {state.step === 4 && (
              <ImportEntityResolver
                unresolvedEntities={state.unresolvedEntities}
                onResolve={resolveEntity}
                onUnresolve={unresolveEntity}
                onCreateEntity={handleCreateEntity}
                existingEntities={state.existingEntities}
              />
            )}

            {state.step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Hierarquia do Orçamento</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Ajuste a ordem dos níveis de divisão do orçamento
                  </p>
                </div>
                <HierarchyOrderSelector
                  selectedLevels={state.detectedHierarchy}
                  onConfigChange={updateHierarchyOrder}
                />
              </div>
            )}

            {state.step === 6 && (
              <div className="text-center py-8 space-y-4">
                <h2 className="text-xl font-semibold">Pronto para criar!</h2>
                <p className="text-muted-foreground">
                  Plano: {state.planInfo.name}<br />
                  Linhas: {state.parseResult?.lines.length || 0}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack} disabled={state.step === 1 || state.isCheckingEntities}>
            Voltar
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!canProceed() || state.isCreating || state.isCheckingEntities}
          >
            {state.step === 6 ? (state.isCreating ? 'Criando...' : 'Criar Plano') : 'Próximo'}
          </Button>
        </div>
      </motion.div>

      {/* Entity Creation Dialogs */}
      {creatingEntity?.type === 'vehicle' && (
        <VehicleDialog
          open={true}
          onOpenChange={(open) => !open && handleDialogClose()}
          onSave={async (data) => {
            try {
              const result = await vehiclesQuery.create.mutateAsync({
                name: data.name,
                description: data.description,
                medium_id: data.medium_id,
                slug: data.slug,
              });
              if (result) {
                // Also create channels if provided
                for (const channel of data.channels || []) {
                  if (channel.name.trim()) {
                    await channelsQuery.create.mutateAsync({
                      name: channel.name,
                      description: channel.description,
                      slug: channel.slug,
                      vehicle_id: result.id,
                    });
                  }
                }
                handleEntityCreated(creatingEntity.id, result.id, 'vehicle', data.name);
              }
            } catch (error) {
              console.error('Error creating vehicle:', error);
              handleDialogClose();
            }
          }}
          initialData={{ 
            name: creatingEntity.originalName, 
            description: '',
            channels: []
          }}
          mediums={mediums}
          onCreateMedium={async (data) => {
            const result = await mediumsQuery.create.mutateAsync(data);
            return result;
          }}
        />
      )}

      {creatingEntity?.type === 'channel' && (() => {
        const parentVehicle = getParentVehicle();
        return parentVehicle ? (
          <ChannelDialog
            open={true}
            onOpenChange={(open) => !open && handleDialogClose()}
            onSave={async (data) => {
              try {
                const result = await channelsQuery.create.mutateAsync(data);
                if (result) {
                  handleEntityCreated(creatingEntity.id, result.id, 'channel', data.name, parentVehicle.id);
                }
              } catch (error) {
                console.error('Error creating channel:', error);
                handleDialogClose();
              }
            }}
            vehicleId={parentVehicle.id}
            vehicleName={parentVehicle.name}
            vehicleSlug={parentVehicle.slug}
          />
        ) : null;
      })()}

      {creatingEntity?.type === 'subdivision' && (
        <SubdivisionDialog
          open={true}
          onOpenChange={(open) => !open && handleDialogClose()}
          onSave={async (data) => {
            try {
              const result = await subdivisionsQuery.create.mutateAsync(data);
              if (result) {
                handleEntityCreated(creatingEntity.id, result.id, 'subdivision', data.name);
              }
            } catch (error) {
              console.error('Error creating subdivision:', error);
              handleDialogClose();
            }
          }}
          initialData={{ 
            name: creatingEntity.originalName,
            description: ''
          }}
        />
      )}

      {creatingEntity?.type === 'target' && (
        <TargetDialog
          open={true}
          onOpenChange={(open) => !open && handleDialogClose()}
          onSave={async (data) => {
            try {
              const result = await targetsQuery.create.mutateAsync({
                name: data.name,
                slug: data.slug,
                age_range: data.age_range,
                geolocation: data.geolocation,
                behavior: data.behavior,
                description: data.description,
              });
              if (result) {
                handleEntityCreated(creatingEntity.id, result.id, 'target', data.name);
              }
            } catch (error) {
              console.error('Error creating target:', error);
              handleDialogClose();
            }
          }}
          initialData={{ 
            name: creatingEntity.originalName,
            age_range: '',
            geolocation: [],
            behavior: '',
            description: '',
          }}
        />
      )}

      {creatingEntity?.type === 'moment' && (
        <SimpleConfigDialog
          open={true}
          onOpenChange={(open) => !open && handleDialogClose()}
          onSave={async (data) => {
            try {
              const result = await momentsQuery.create.mutateAsync({
                name: data.name,
                description: data.description,
              });
              if (result) {
                handleEntityCreated(creatingEntity.id, result.id, 'moment', data.name);
              }
            } catch (error) {
              console.error('Error creating moment:', error);
              handleDialogClose();
            }
          }}
          title="Novo Momento"
          nameLabel="Nome do Momento"
          namePlaceholder="Ex: Black Friday, Lançamento..."
          initialData={{ 
            name: creatingEntity.originalName,
            description: ''
          }}
        />
      )}

      {creatingEntity?.type === 'funnel_stage' && (
        <SimpleConfigDialog
          open={true}
          onOpenChange={(open) => !open && handleDialogClose()}
          onSave={async (data) => {
            try {
              const result = await funnelStagesQuery.create.mutateAsync({
                name: data.name,
                description: data.description,
              });
              if (result) {
                handleEntityCreated(creatingEntity.id, result.id, 'funnel_stage', data.name);
              }
            } catch (error) {
              console.error('Error creating funnel stage:', error);
              handleDialogClose();
            }
          }}
          title="Nova Fase do Funil"
          nameLabel="Nome da Fase"
          namePlaceholder="Ex: Awareness, Consideração, Conversão..."
          initialData={{ 
            name: creatingEntity.originalName,
            description: ''
          }}
        />
      )}
    </DashboardLayout>
  );
}
