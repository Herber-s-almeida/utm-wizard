import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  History, 
  GitBranch, 
  CheckCircle2, 
  ArrowRight,
  User,
  Clock,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS } from '@/types/media';

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

interface AuditPanelProps {
  planId: string;
}

export function AuditPanel({ planId }: AuditPanelProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchAuditData();
  }, [planId]);

  const fetchAuditData = async () => {
    try {
      // Fetch version history
      const { data: versions, error: versionsError } = await supabase
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
      versions?.forEach(v => v.created_by && userIds.add(v.created_by));
      statusHistory?.forEach(s => s.changed_by && userIds.add(s.changed_by));
      lines?.forEach(l => l.utm_validated_by && userIds.add(l.utm_validated_by));

      // Fetch user emails from auth.users via profiles
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
      versions?.forEach(v => {
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
      allEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: AuditEvent['type']) => {
    switch (type) {
      case 'version':
        return <GitBranch className="w-4 h-4 text-primary" />;
      case 'status':
        return <History className="w-4 h-4 text-amber-500" />;
      case 'utm':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getEventBadge = (type: AuditEvent['type']) => {
    switch (type) {
      case 'version':
        return <Badge variant="secondary">Versão</Badge>;
      case 'status':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Status</Badge>;
      case 'utm':
        return <Badge variant="outline" className="border-green-500 text-green-600">UTM</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const renderEventDetails = (event: AuditEvent) => {
    switch (event.type) {
      case 'version':
        return (
          <div>
            <span className="font-medium">Versão {event.details.versionNumber}</span>
            {event.details.changeLog && (
              <p className="text-sm text-muted-foreground mt-1">
                "{event.details.changeLog}"
              </p>
            )}
          </div>
        );
      case 'status':
        return (
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
              <p className="text-sm text-muted-foreground w-full mt-1">
                "{event.details.comment}"
              </p>
            )}
          </div>
        );
      case 'utm':
        return (
          <div>
            <span className="font-medium">UTM validado</span>
            <span className="text-sm text-muted-foreground ml-1">
              na linha "{event.details.lineName}"
            </span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Auditoria
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  const eventCounts = {
    version: events.filter(e => e.type === 'version').length,
    status: events.filter(e => e.type === 'status').length,
    utm: events.filter(e => e.type === 'utm').length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="w-5 h-5" />
          Histórico de Auditoria
        </CardTitle>
        <div className="pt-2">
          <ToggleGroup 
            type="single" 
            value={filter} 
            onValueChange={(value) => value && setFilter(value as FilterType)}
            className="justify-start flex-wrap gap-1"
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs px-2 h-7">
              <Filter className="w-3 h-3 mr-1" />
              Todos ({events.length})
            </ToggleGroupItem>
            <ToggleGroupItem value="version" size="sm" className="text-xs px-2 h-7">
              <GitBranch className="w-3 h-3 mr-1" />
              Versões ({eventCounts.version})
            </ToggleGroupItem>
            <ToggleGroupItem value="status" size="sm" className="text-xs px-2 h-7">
              <History className="w-3 h-3 mr-1" />
              Status ({eventCounts.status})
            </ToggleGroupItem>
            <ToggleGroupItem value="utm" size="sm" className="text-xs px-2 h-7">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              UTMs ({eventCounts.utm})
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {filter === 'all' 
              ? 'Nenhuma atividade registrada ainda.'
              : 'Nenhum evento deste tipo encontrado.'}
          </p>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-4">
              {filteredEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  className="relative flex gap-3 pb-4"
                >
                  {/* Timeline line */}
                  {index < filteredEvents.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
                  )}
                  
                  {/* Icon */}
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {getEventIcon(event.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getEventBadge(event.type)}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{event.userEmail}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      {renderEventDetails(event)}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(event.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
