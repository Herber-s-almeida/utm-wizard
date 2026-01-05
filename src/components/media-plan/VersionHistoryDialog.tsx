import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  RotateCcw, 
  GitCompare, 
  Clock, 
  Loader2,
  AlertTriangle,
  ChevronRight,
  Check,
  Archive,
  Star
} from 'lucide-react';
import { usePlanVersions, PlanVersion } from '@/hooks/usePlanVersions';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { cn } from '@/lib/utils';

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  onRestored: () => void;
}

export function VersionHistoryDialog({ 
  open, 
  onOpenChange, 
  planId,
  onRestored 
}: VersionHistoryDialogProps) {
  const { versions, isLoading, restoreVersion, isRestoring } = usePlanVersions(planId);
  const [selectedVersion, setSelectedVersion] = useState<PlanVersion | null>(null);
  const [compareVersions, setCompareVersions] = useState<[PlanVersion | null, PlanVersion | null]>([null, null]);
  const [showCompare, setShowCompare] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<PlanVersion | null>(null);
  const [activeTab, setActiveTab] = useState<'saved' | 'auto'>('saved');

  // Separate manual versions from auto-backups
  const { savedVersions, autoBackups } = useMemo(() => {
    const saved = versions.filter(v => !v.is_auto_backup);
    const auto = versions.filter(v => v.is_auto_backup);
    return { savedVersions: saved, autoBackups: auto };
  }, [versions]);

  const displayedVersions = activeTab === 'saved' ? savedVersions : autoBackups;

  const handleRestoreClick = (version: PlanVersion) => {
    setVersionToRestore(version);
    setConfirmRestoreOpen(true);
  };

  const handleConfirmRestore = () => {
    if (versionToRestore) {
      restoreVersion(versionToRestore, {
        onSuccess: () => {
          setConfirmRestoreOpen(false);
          onOpenChange(false);
          onRestored();
        }
      });
    }
  };

  const handleCompareSelect = (version: PlanVersion) => {
    if (!compareVersions[0]) {
      setCompareVersions([version, null]);
    } else if (!compareVersions[1]) {
      setCompareVersions([compareVersions[0], version]);
      setShowCompare(true);
    }
  };

  const resetCompare = () => {
    setCompareVersions([null, null]);
    setShowCompare(false);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatRelativeTime = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  };

  const getSnapshotSummary = (snapshot: PlanVersion['snapshot_data']) => {
    return {
      linesCount: snapshot.lines?.length || 0,
      totalBudget: (snapshot.plan?.total_budget as number) || 0,
      status: (snapshot.plan?.status as string) || 'draft',
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Versões
            </DialogTitle>
            <DialogDescription>
              Visualize e restaure versões anteriores do plano
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma versão salva ainda
              </p>
              <p className="text-sm text-muted-foreground/70">
                Versões automáticas são criadas quando você edita o plano
              </p>
            </div>
          ) : showCompare && compareVersions[0] && compareVersions[1] ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Comparando versões</h3>
                <Button variant="ghost" size="sm" onClick={resetCompare}>
                  Voltar
                </Button>
              </div>
              <VersionCompare 
                version1={compareVersions[0]} 
                version2={compareVersions[1]} 
                formatCurrency={formatCurrency}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'saved' | 'auto')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="saved" className="gap-2">
                    <Star className="w-3 h-3" />
                    Versões Salvas ({savedVersions.length})
                  </TabsTrigger>
                  <TabsTrigger value="auto" className="gap-2">
                    <Archive className="w-3 h-3" />
                    Backups Auto ({autoBackups.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="saved" className="mt-4">
                  {savedVersions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma versão salva manualmente</p>
                      <p className="text-xs mt-1">Use o botão "Salvar Versão" para criar uma versão importante</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[350px] pr-4">
                      <VersionList 
                        versions={savedVersions}
                        selectedVersion={selectedVersion}
                        compareVersions={compareVersions}
                        onSelectVersion={setSelectedVersion}
                        onRestoreClick={handleRestoreClick}
                        onCompareSelect={handleCompareSelect}
                        isRestoring={isRestoring}
                        formatDate={formatDate}
                        formatRelativeTime={formatRelativeTime}
                        formatCurrency={formatCurrency}
                        getSnapshotSummary={getSnapshotSummary}
                        showVersionNumber
                      />
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="auto" className="mt-4">
                  {autoBackups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhum backup automático ainda</p>
                      <p className="text-xs mt-1">Backups são criados a cada edição e mantidos por 15 dias</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted/50 rounded">
                        Backups automáticos são mantidos por 15 dias
                      </div>
                      <VersionList 
                        versions={autoBackups}
                        selectedVersion={selectedVersion}
                        compareVersions={compareVersions}
                        onSelectVersion={setSelectedVersion}
                        onRestoreClick={handleRestoreClick}
                        onCompareSelect={handleCompareSelect}
                        isRestoring={isRestoring}
                        formatDate={formatDate}
                        formatRelativeTime={formatRelativeTime}
                        formatCurrency={formatCurrency}
                        getSnapshotSummary={getSnapshotSummary}
                        showVersionNumber={false}
                      />
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>

              {compareVersions[0] && !compareVersions[1] && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    Selecione outra versão para comparar
                  </p>
                  <Button variant="ghost" size="sm" onClick={resetCompare} className="mt-2">
                    Cancelar comparação
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Restaurar versão?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá substituir todos os dados atuais do plano. 
              Uma nova versão será criada automaticamente com o estado atual antes da restauração.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                'Restaurar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Component for rendering the version list
interface VersionListProps {
  versions: PlanVersion[];
  selectedVersion: PlanVersion | null;
  compareVersions: [PlanVersion | null, PlanVersion | null];
  onSelectVersion: (version: PlanVersion | null) => void;
  onRestoreClick: (version: PlanVersion) => void;
  onCompareSelect: (version: PlanVersion) => void;
  isRestoring: boolean;
  formatDate: (dateStr: string) => string;
  formatRelativeTime: (dateStr: string) => string;
  formatCurrency: (value: number) => string;
  getSnapshotSummary: (snapshot: PlanVersion['snapshot_data']) => { linesCount: number; totalBudget: number; status: string };
  showVersionNumber: boolean;
}

function VersionList({
  versions,
  selectedVersion,
  compareVersions,
  onSelectVersion,
  onRestoreClick,
  onCompareSelect,
  isRestoring,
  formatDate,
  formatRelativeTime,
  formatCurrency,
  getSnapshotSummary,
  showVersionNumber,
}: VersionListProps) {
  return (
    <div className="space-y-3">
      {versions.map((version) => {
        const summary = getSnapshotSummary(version.snapshot_data);
        const isSelected = selectedVersion?.id === version.id;
        const isCompareSelected = compareVersions[0]?.id === version.id || compareVersions[1]?.id === version.id;

        return (
          <div
            key={version.id}
            className={cn(
              "border rounded-lg p-4 transition-colors cursor-pointer hover:bg-muted/30",
              isSelected && "ring-2 ring-primary",
              isCompareSelected && "bg-primary/5 border-primary/30"
            )}
            onClick={() => onSelectVersion(isSelected ? null : version)}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {showVersionNumber ? (
                    <Badge variant="secondary">v{version.version_number}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {formatRelativeTime(version.created_at)}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(version.created_at)}
                  </span>
                </div>
                {version.change_log && (
                  <p className="text-sm">{version.change_log}</p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                  <span>{summary.linesCount} linhas</span>
                  <span>{formatCurrency(summary.totalBudget)}</span>
                </div>
              </div>
              {isCompareSelected && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>

            {isSelected && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestoreClick(version);
                  }}
                  disabled={isRestoring}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompareSelect(version);
                  }}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Comparar
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface VersionCompareProps {
  version1: PlanVersion;
  version2: PlanVersion;
  formatCurrency: (value: number) => string;
}

function VersionCompare({ version1, version2, formatCurrency }: VersionCompareProps) {
  const plan1 = version1.snapshot_data.plan as Record<string, unknown>;
  const plan2 = version2.snapshot_data.plan as Record<string, unknown>;
  const lines1 = version1.snapshot_data.lines || [];
  const lines2 = version2.snapshot_data.lines || [];

  const changes: { field: string; old: string; new: string }[] = [];

  // Compare plan fields
  const compareFields = ['name', 'client', 'campaign', 'total_budget', 'status'];
  compareFields.forEach((field) => {
    const val1 = plan1[field];
    const val2 = plan2[field];
    if (val1 !== val2) {
      changes.push({
        field,
        old: field === 'total_budget' ? formatCurrency(val1 as number) : String(val1 || '-'),
        new: field === 'total_budget' ? formatCurrency(val2 as number) : String(val2 || '-'),
      });
    }
  });

  // Compare line counts
  if (lines1.length !== lines2.length) {
    changes.push({
      field: 'Número de linhas',
      old: String(lines1.length),
      new: String(lines2.length),
    });
  }

  // Total budget from lines
  const totalLines1 = lines1.reduce((acc, l) => acc + (Number((l as Record<string, unknown>).budget) || 0), 0);
  const totalLines2 = lines2.reduce((acc, l) => acc + (Number((l as Record<string, unknown>).budget) || 0), 0);
  if (totalLines1 !== totalLines2) {
    changes.push({
      field: 'Orçamento alocado',
      old: formatCurrency(totalLines1),
      new: formatCurrency(totalLines2),
    });
  }

  const fieldLabels: Record<string, string> = {
    name: 'Nome do plano',
    client: 'Cliente',
    campaign: 'Campanha',
    total_budget: 'Orçamento total',
    status: 'Status',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <Badge variant="secondary">v{version1.version_number}</Badge>
        <ChevronRight className="w-4 h-4" />
        <Badge variant="secondary">v{version2.version_number}</Badge>
      </div>

      {changes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Check className="w-8 h-8 mx-auto mb-2 text-success" />
          <p>As versões são idênticas</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Campo</th>
                <th className="text-left p-3 font-medium">v{version1.version_number}</th>
                <th className="text-left p-3 font-medium">v{version2.version_number}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-3 text-muted-foreground">
                    {fieldLabels[change.field] || change.field}
                  </td>
                  <td className="p-3 bg-red-500/5">{change.old}</td>
                  <td className="p-3 bg-green-500/5">{change.new}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
