import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Calendar, DollarSign, Layers, FileSpreadsheet, Check, Building2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { HIERARCHY_LEVEL_CONFIG } from '@/types/hierarchy';
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
        <WizardStepper steps={STEPS} currentStep={state.step} />

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
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Confirmar Importação</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Revise as informações antes de criar o plano
                  </p>
                </div>

                {/* Card: Resumo do Plano */}
                <div className="border-2 border-primary/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <h3 className="font-display text-lg font-semibold">Resumo do Plano</h3>
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full" />
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Nome do Plano + Slug UTM */}
                    <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Nome do Plano</span>
                      <p className="font-display text-xl font-semibold mt-1">{state.planInfo.name}</p>
                      {state.planInfo.utmCampaignSlug && (
                        <span className="text-xs text-muted-foreground">
                          Slug UTM: {state.planInfo.utmCampaignSlug}
                        </span>
                      )}
                    </div>

                    {/* Grid: Cliente + Datas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cliente */}
                      <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</span>
                        </div>
                        <p className="font-semibold text-lg">{state.planInfo.clientName || 'Nenhum'}</p>
                      </div>

                      {/* Datas */}
                      <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground uppercase">Início</span>
                          <span className="ml-auto font-semibold">
                            {state.planInfo.startDate 
                              ? format(state.planInfo.startDate, 'dd/MM/yyyy') 
                              : calculatedStartDate
                                ? format(calculatedStartDate, 'dd/MM/yyyy')
                                : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground uppercase">Término</span>
                          <span className="ml-auto font-semibold">
                            {state.planInfo.endDate 
                              ? format(state.planInfo.endDate, 'dd/MM/yyyy') 
                              : calculatedEndDate
                                ? format(calculatedEndDate, 'dd/MM/yyyy')
                                : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Orçamento */}
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground uppercase">Orçamento Total</span>
                      </div>
                      <p className="font-display text-3xl font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                        }).format(
                          state.planInfo.useBudgetFromFile 
                            ? calculatedBudget 
                            : state.planInfo.totalBudget
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card: Hierarquia */}
                <div className="border border-border/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Layers className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Hierarquia do Orçamento</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {state.detectedHierarchy.length > 0
                      ? state.detectedHierarchy
                          .map(h => HIERARCHY_LEVEL_CONFIG[h.level].label)
                          .join(' → ')
                      : 'Orçamento geral (sem divisões)'}
                  </p>
                </div>

                {/* Card: Estatísticas da Importação */}
                <div className="border border-border/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Dados Importados</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {state.parseResult?.lines.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Linhas</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {new Set(state.parseResult?.lines.map(l => l.vehicleName).filter(Boolean) || []).size}
                      </p>
                      <p className="text-xs text-muted-foreground">Veículos</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {new Set(state.parseResult?.lines.map(l => l.channelName).filter(Boolean) || []).size}
                      </p>
                      <p className="text-xs text-muted-foreground">Canais</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {state.unresolvedEntities.filter(e => e.status === 'resolved').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Entidades Resolvidas</p>
                    </div>
                  </div>
                </div>
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
