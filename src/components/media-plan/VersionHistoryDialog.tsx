import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  RotateCcw, 
  GitCompare, 
  Clock, 
  Loader2,
  AlertTriangle,
  ChevronRight,
  Check
} from 'lucide-react';
import { usePlanVersions, PlanVersion } from '@/hooks/usePlanVersions';
import { format } from 'date-fns';
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
                Versões são criadas automaticamente quando o status do plano muda
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
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {compareVersions[0] && !compareVersions[1] && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-muted-foreground">
                      Selecione outra versão para comparar com a versão {compareVersions[0].version_number}
                    </p>
                    <Button variant="ghost" size="sm" onClick={resetCompare} className="mt-2">
                      Cancelar comparação
                    </Button>
                  </div>
                )}

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
                      onClick={() => setSelectedVersion(isSelected ? null : version)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">v{version.version_number}</Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
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
                            <span>Status: {summary.status}</span>
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
                              handleRestoreClick(version);
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
                              handleCompareSelect(version);
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
            </ScrollArea>
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
              Esta ação irá substituir todos os dados atuais do plano pela versão {versionToRestore?.version_number}. 
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
