import { useState, useMemo, useEffect } from 'react';
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
  Star,
  GitBranch,
  CheckCircle2,
  ArrowRight,
  User,
  Filter,
  FileText
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
import { supabase } from '@/integrations/supabase/client';
import { STATUS_LABELS } from '@/types/media';
import { Skeleton } from '@/components/ui/skeleton';

type EventType = 'version' | 'status' | 'utm';
type FilterType = 'all' | EventType;

interface AuditEvent {
  id: string;
  type: EventType;
  timestamp: string;
  userEmail: string;
  details: {
    versionNumber?: number;
    changeLog?: string;
    fromStatus?: string;
    toStatus?: string;
    comment?: string;
    lineName?: string;
  };
}

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
  const [mainTab, setMainTab] = useState<'versions' | 'audit'>('versions');
  const [versionTab, setVersionTab] = useState<'saved' | 'auto'>('saved');
  
  // Audit state
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<FilterType>('all');

  // Separate manual versions from auto-backups
  const { savedVersions, autoBackups } = useMemo(() => {
    const saved = versions.filter(v => !v.is_auto_backup);
    const auto = versions.filter(v => v.is_auto_backup);
    return { savedVersions: saved, autoBackups: auto };
  }, [versions]);

  // Fetch audit data when audit tab is selected
  useEffect(() => {
    if (open && mainTab === 'audit' && planId) {
      fetchAuditData();
    }
  }, [open, mainTab, planId]);

  const fetchAuditData = async () => {
    setAuditLoading(true);
    try {
      // Fetch version history
      const { data: versionsData, error: versionsError } = await supabase
        .from('media_plan_versions')
        .select('id, version_number, change_log, created_at, created_by')
        .eq('media_plan_id', planId)
        .order('created_at', { ascending: false });

      if (versionsError) throw versionsError;

      // Fetch status history
      const { data: statusHistory, error: statusError } = await supabase
        .from('plan_status_history')
        .select('id, from_status, to_status, comment, changed_at, changed_by')
        .eq('media_plan_id', planId)
        .order('changed_at', { ascending: false });

      if (statusError) throw statusError;

      // Fetch UTM validations from media lines
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select('id, platform, utm_validated, utm_validated_at, utm_validated_by')
        .eq('media_plan_id', planId)
        .eq('utm_validated', true)
        .not('utm_validated_at', 'is', null);

      if (linesError) throw linesError;

      // Get unique user IDs to fetch emails
      const userIds = new Set<string>();
      versionsData?.forEach(v => v.created_by && userIds.add(v.created_by));
      statusHistory?.forEach(s => s.changed_by && userIds.add(s.changed_by));
      lines?.forEach(l => l.utm_validated_by && userIds.add(l.utm_validated_by));

      // Fetch user emails from profiles
      const userEmails: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', Array.from(userIds));

        profiles?.forEach(p => {
          userEmails[p.user_id] = p.full_name || 'Usuário';
        });
      }

      // Build unified events list
      const allEvents: AuditEvent[] = [];

      // Add version events
      versionsData?.forEach(v => {
        allEvents.push({
          id: `version-${v.id}`,
          type: 'version',
          timestamp: v.created_at,
          userEmail: userEmails[v.created_by] || 'Usuário',
          details: {
            versionNumber: v.version_number,
            changeLog: v.change_log,
          },
        });
      });

      // Add status events
      statusHistory?.forEach(s => {
        allEvents.push({
          id: `status-${s.id}`,
          type: 'status',
          timestamp: s.changed_at,
          userEmail: userEmails[s.changed_by] || 'Usuário',
          details: {
            fromStatus: s.from_status,
            toStatus: s.to_status,
            comment: s.comment,
          },
        });
      });

      // Add UTM validation events
      lines?.forEach(l => {
        if (l.utm_validated_at && l.utm_validated_by) {
          allEvents.push({
            id: `utm-${l.id}`,
            type: 'utm',
            timestamp: l.utm_validated_at,
            userEmail: userEmails[l.utm_validated_by] || 'Usuário',
            details: {
              lineName: l.platform,
            },
          });
        }
      });

      // Sort by timestamp descending
      allEvents.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setAuditEvents(allEvents);
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  // Audit memoized data
  const groupedAudit = useMemo(() => {
    const byType: Record<EventType, AuditEvent[]> = { version: [], status: [], utm: [] };
    for (const e of auditEvents) byType[e.type].push(e);
    return byType;
  }, [auditEvents]);

  const auditCounts = useMemo(
    () => ({
      version: groupedAudit.version.length,
      status: groupedAudit.status.length,
      utm: groupedAudit.utm.length,
    }),
    [groupedAudit],
  );

  const filteredAuditEvents = useMemo(() => {
    if (auditFilter === 'all') return auditEvents;
    return groupedAudit[auditFilter];
  }, [auditEvents, groupedAudit, auditFilter]);

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
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico
            </DialogTitle>
            <DialogDescription>
              Versões, alterações e auditoria do plano
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'versions' | 'audit')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="versions" className="gap-2">
                <FileText className="w-4 h-4" />
                Versões
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <History className="w-4 h-4" />
                Auditoria
              </TabsTrigger>
            </TabsList>

            {/* Versions Tab */}
            <TabsContent value="versions" className="mt-4">
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
                  <Tabs value={versionTab} onValueChange={(v) => setVersionTab(v as 'saved' | 'auto')}>
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
            </TabsContent>

            {/* Audit Tab */}
            <TabsContent value="audit" className="mt-4">
              {auditLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant={auditFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs px-2 h-7"
                      onClick={() => setAuditFilter('all')}
                    >
                      <Filter className="w-3 h-3 mr-1" />
                      Todos ({auditEvents.length})
                    </Button>
                    <Button
                      type="button"
                      variant={auditFilter === 'version' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs px-2 h-7"
                      onClick={() => setAuditFilter('version')}
                    >
                      <GitBranch className="w-3 h-3 mr-1" />
                      Versões ({auditCounts.version})
                    </Button>
                    <Button
                      type="button"
                      variant={auditFilter === 'status' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs px-2 h-7"
                      onClick={() => setAuditFilter('status')}
                    >
                      <History className="w-3 h-3 mr-1" />
                      Status ({auditCounts.status})
                    </Button>
                    <Button
                      type="button"
                      variant={auditFilter === 'utm' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs px-2 h-7"
                      onClick={() => setAuditFilter('utm')}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      UTMs ({auditCounts.utm})
                    </Button>
                  </div>

                  {/* Events Timeline */}
                  {filteredAuditEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {auditFilter === 'all'
                        ? 'Nenhuma atividade registrada ainda.'
                        : 'Nenhum evento deste tipo encontrado.'}
                    </p>
                  ) : (
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-4">
                        {filteredAuditEvents.map((event, index) => (
                          <div key={event.id} className="relative flex gap-3 pb-4">
                            {/* Timeline line */}
                            {index < filteredAuditEvents.length - 1 && (
                              <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
                            )}

                            {/* Icon */}
                            <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                              {event.type === 'version' && <GitBranch className="w-4 h-4 text-primary" />}
                              {event.type === 'status' && <History className="w-4 h-4 text-amber-500" />}
                              {event.type === 'utm' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {event.type === 'version' && <Badge variant="secondary">Versão</Badge>}
                                {event.type === 'status' && (
                                  <Badge variant="outline" className="border-warning text-warning">Status</Badge>
                                )}
                                {event.type === 'utm' && (
                                  <Badge variant="outline" className="border-success text-success">UTM</Badge>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  <span>{event.userEmail}</span>
                                </div>
                              </div>

                              <div className="text-sm">
                                {event.type === 'version' && (
                                  <div>
                                    <span className="font-medium">Versão {event.details.versionNumber}</span>
                                    {event.details.changeLog && (
                                      <p className="text-sm text-muted-foreground mt-1">"{event.details.changeLog}"</p>
                                    )}
                                  </div>
                                )}
                                {event.type === 'status' && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {event.details.fromStatus && (
                                      <>
                                        <span className="text-sm">
                                          {STATUS_LABELS[event.details.fromStatus] || event.details.fromStatus}
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                      </>
                                    )}
                                    <span className="font-medium">
                                      {STATUS_LABELS[event.details.toStatus || ''] || event.details.toStatus}
                                    </span>
                                    {event.details.comment && (
                                      <p className="text-sm text-muted-foreground w-full mt-1">"{event.details.comment}"</p>
                                    )}
                                  </div>
                                )}
                                {event.type === 'utm' && (
                                  <div>
                                    <span className="font-medium">UTM validado</span>
                                    <span className="text-sm text-muted-foreground ml-1">na linha "{event.details.lineName}"</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(event.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
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
