import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Plus, Loader2, RefreshCw, Settings, Trash2, BarChart3,
  Table, Clock, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MediaPlan, MediaLine } from '@/types/media';
import {
  useReportImports, useReportData, useColumnMappings, useRunImport,
  useDeleteReportImport, ReportImport, SOURCE_CATEGORIES,
} from '@/hooks/useReportData';
import { ImportConfigDialog } from '@/components/reports/ImportConfigDialog';
import { ImportWizardDialog } from '@/components/performance/ImportWizardDialog';
import { ReportsDashboard } from '@/components/reports/ReportsDashboard';
import { ReportsTable } from '@/components/reports/ReportsTable';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { usePlanBySlug, getPlanUrl } from '@/hooks/usePlanBySlug';

export default function MediaPlanReports() {
  const { id: identifier } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const navigate = useNavigate();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState<ReportImport | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importToDelete, setImportToDelete] = useState<ReportImport | null>(null);

  const { data: plan, isLoading: planLoading } = usePlanBySlug(identifier);

  useEffect(() => {
    if (plan && identifier) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      if (isUUID && plan.slug && identifier !== plan.slug) {
        navigate(`/media-plans/${plan.slug}/reports`, { replace: true });
      }
    }
  }, [plan, identifier, navigate]);

  const planId = plan?.id;

  const { data: mediaLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['media-lines', planId],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_lines').select('*').eq('media_plan_id', planId);
      if (error) throw error;
      return data as MediaLine[];
    },
    enabled: !!planId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-reports', currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('id, name').is('deleted_at', null)
        .eq('environment_id', currentEnvironmentId);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!currentEnvironmentId,
  });

  const { data: subdivisions = [] } = useQuery({
    queryKey: ['subdivisions-for-reports', currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('plan_subdivisions').select('id, name').is('deleted_at', null)
        .eq('environment_id', currentEnvironmentId);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!currentEnvironmentId,
  });

  const { data: moments = [] } = useQuery({
    queryKey: ['moments-for-reports', currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('moments').select('id, name').is('deleted_at', null)
        .eq('environment_id', currentEnvironmentId);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!currentEnvironmentId,
  });

  const { data: funnelStages = [] } = useQuery({
    queryKey: ['funnel-stages-for-reports', currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('funnel_stages').select('id, name').is('deleted_at', null)
        .eq('environment_id', currentEnvironmentId);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!currentEnvironmentId,
  });

  const { data: mediums = [] } = useQuery({
    queryKey: ['mediums-for-reports', currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('mediums').select('id, name').is('deleted_at', null)
        .eq('environment_id', currentEnvironmentId);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!currentEnvironmentId,
  });

  const { data: channelsData = [] } = useQuery({
    queryKey: ['channels-for-reports', currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('channels').select('id, name').is('deleted_at', null)
        .eq('environment_id', currentEnvironmentId);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!currentEnvironmentId,
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['targets-for-reports', currentEnvironmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('behavioral_segmentations').select('id, name').is('deleted_at', null)
        .eq('environment_id', currentEnvironmentId);
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!currentEnvironmentId,
  });

  const { data: reportImports = [], isLoading: importsLoading, refetch: refetchImports } = useReportImports(planId || '');
  const { data: reportData = [], isLoading: dataLoading, refetch: refetchData } = useReportData(planId || '');
  const { data: selectedMappings = [] } = useColumnMappings(selectedImport?.id || '');

  const runImport = useRunImport();
  const deleteImport = useDeleteReportImport();

  const handleReimport = async (importConfig: ReportImport) => {
    const { data: mappings } = await supabase.from('report_column_mappings').select('*').eq('import_id', importConfig.id);
    if (!mappings || mappings.length === 0) {
      toast.error('Configure o mapeamento de colunas primeiro');
      return;
    }
    await runImport.mutateAsync({
      import_id: importConfig.id,
      media_plan_id: importConfig.media_plan_id,
      source_url: importConfig.source_url,
      mappings: mappings.map(m => ({ source_column: m.source_column, target_field: m.target_field })),
    });
    refetchData();
    refetchImports();
  };

  const handleDeleteImport = async () => {
    if (!importToDelete) return;
    await deleteImport.mutateAsync({ import_id: importToDelete.id, media_plan_id: importToDelete.media_plan_id });
    setDeleteDialogOpen(false);
    setImportToDelete(null);
    refetchData();
  };

  const handleEditImport = (importConfig: ReportImport) => {
    setSelectedImport(importConfig);
    setImportDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle2 className="w-3 h-3 mr-1" />Sucesso</Badge>;
      case 'processing': return <Badge variant="default" className="bg-primary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processando</Badge>;
      case 'error': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default: return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  const isLoading = planLoading || linesLoading || importsLoading || dataLoading;

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  if (!plan) {
    return <DashboardLayout><div className="text-center py-12"><p className="text-muted-foreground">Plano não encontrado</p></div></DashboardLayout>;
  }

  const matchedCount = reportData.filter(r => r.match_status === 'matched' || r.match_status === 'manual').length;
  const unmatchedCount = reportData.filter(r => r.match_status === 'unmatched').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(getPlanUrl(plan))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold">Relatórios</h1>
              <p className="text-muted-foreground">{plan.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => { setSelectedImport(null); setImportDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />Adicionar Fonte de Dados
            </Button>
          </div>
        </div>

        {/* Import Sources */}
        {reportImports.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Fontes de Dados</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" />{matchedCount} com match</span>
                  {unmatchedCount > 0 && <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-warning" />{unmatchedCount} sem match</span>}
                </div>
              </div>
              <div className="space-y-2">
                {reportImports.map(importConfig => (
                  <div key={importConfig.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{importConfig.source_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {SOURCE_CATEGORIES.find(c => c.value === (importConfig as any).source_category)?.label || 'Mídia Paga'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {importConfig.last_import_at
                            ? `Última importação: ${format(new Date(importConfig.last_import_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                            : 'Nunca importado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(importConfig.import_status)}
                      <Button variant="ghost" size="icon" onClick={() => handleReimport(importConfig)} disabled={runImport.isPending}>
                        <RefreshCw className={`w-4 h-4 ${runImport.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditImport(importConfig)}><Settings className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setImportToDelete(importConfig); setDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports Content */}
        {reportData.length > 0 ? (
          <Tabs defaultValue="dashboard">
            <TabsList>
              <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="w-4 h-4" />Dashboard</TabsTrigger>
              <TabsTrigger value="table" className="gap-2"><Table className="w-4 h-4" />Todos os Dados</TabsTrigger>
              {reportImports.map(imp => (
                <TabsTrigger key={imp.id} value={`source-${imp.id}`} className="gap-2"><Table className="w-4 h-4" />{imp.source_name}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <ReportsDashboard
                reportData={reportData}
                mediaLines={mediaLines}
                totalBudget={Number(plan.total_budget || 0)}
                vehicles={vehicles}
                reportImports={reportImports}
                subdivisions={subdivisions}
                moments={moments}
                funnelStages={funnelStages}
                mediums={mediums}
                channels={channelsData}
                targets={targets}
              />
            </TabsContent>

            <TabsContent value="table" className="mt-6">
              <ReportsTable reportData={reportData} mediaLines={mediaLines} planId={planId!} planName={plan.name} />
            </TabsContent>

            {reportImports.map(imp => {
              const sourceData = reportData.filter(r => r.import_id === imp.id);
              return (
                <TabsContent key={imp.id} value={`source-${imp.id}`} className="mt-6">
                  <ReportsTable reportData={sourceData} mediaLines={mediaLines} planId={planId!} planName={`${plan.name} - ${imp.source_name}`} />
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Nenhum dado importado</h3>
              <p className="text-sm text-muted-foreground mb-4">Adicione uma fonte de dados para começar a visualizar relatórios</p>
              <Button onClick={() => { setSelectedImport(null); setImportDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />Adicionar Fonte de Dados
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ImportConfigDialog
        open={importDialogOpen} onOpenChange={setImportDialogOpen} planId={planId!}
        existingImportId={selectedImport?.id} existingUrl={selectedImport?.source_url}
        existingName={selectedImport?.source_name} existingCategory={(selectedImport as any)?.source_category}
        existingMappings={selectedMappings.map((m: any) => ({ source_column: m.source_column, target_field: m.target_field, date_format: m.date_format || null }))}
        onComplete={() => { refetchImports(); refetchData(); }}
      />

      <ImportWizardDialog
        open={importWizardOpen} onOpenChange={setImportWizardOpen} planId={planId!}
        mediaLines={mediaLines} onComplete={() => { refetchImports(); refetchData(); }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fonte de dados</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover esta fonte de dados? Todos os dados importados serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
