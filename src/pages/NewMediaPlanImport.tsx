import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useImportPlan } from '@/hooks/useImportPlan';
import { ImportFileUpload } from '@/components/import/ImportFileUpload';
import { ImportColumnMapper } from '@/components/import/ImportColumnMapper';
import { ImportPlanInfo } from '@/components/import/ImportPlanInfo';
import { WizardStepper } from '@/components/media-plan/WizardStepper';

const STEPS = [
  { id: 'upload', title: 'Upload', label: 'Upload' },
  { id: 'columns', title: 'Colunas', label: 'Colunas' },
  { id: 'plan', title: 'Plano', label: 'Plano' },
  { id: 'entities', title: 'Entidades', label: 'Entidades' },
  { id: 'hierarchy', title: 'Hierarquia', label: 'Hierarquia' },
  { id: 'confirm', title: 'Confirmar', label: 'Confirmar' },
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
    confirmEntityResolution,
    confirmHierarchy,
    createPlan,
    goBack,
  } = useImportPlan();

  const canProceed = () => {
    switch (state.step) {
      case 1: return !!state.file;
      case 2: {
        const mapped = state.mappings.filter(m => m.systemField);
        const required = ['linha_codigo', 'veiculo', 'canal', 'orcamento_total'];
        return required.every(f => mapped.some(m => m.systemField === f));
      }
      case 3: return !!state.planInfo.name.trim();
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

  const calculatedBudget = state.parseResult?.lines.reduce((sum, l) => sum + l.totalBudget, 0) || 0;
  const allDates = state.parseResult?.lines.flatMap(l => [l.startDate, l.endDate].filter(Boolean)) as Date[] || [];
  const calculatedStartDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
  const calculatedEndDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;

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

            {state.step === 3 && (
              <ImportPlanInfo
                planInfo={state.planInfo}
                onUpdatePlanInfo={updatePlanInfo}
                calculatedBudget={calculatedBudget}
                calculatedStartDate={calculatedStartDate}
                calculatedEndDate={calculatedEndDate}
              />
            )}

            {state.step === 4 && (
              <div className="text-center py-8">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Verificando entidades...</p>
              </div>
            )}

            {state.step === 5 && (
              <div className="text-center py-8 space-y-4">
                <h2 className="text-xl font-semibold">Hierarquia Detectada</h2>
                <p className="text-muted-foreground">
                  {state.detectedHierarchy.length > 0 
                    ? `Ordem: ${state.detectedHierarchy.join(' → ')}`
                    : 'Nenhuma hierarquia detectada'}
                </p>
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
          <Button variant="outline" onClick={goBack} disabled={state.step === 1}>
            Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canProceed() || state.isCreating}>
            {state.step === 6 ? (state.isCreating ? 'Criando...' : 'Criar Plano') : 'Próximo'}
          </Button>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
