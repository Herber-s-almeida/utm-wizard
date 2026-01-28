import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, List, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { usePlanBySlug, getPlanUrl } from '@/hooks/usePlanBySlug';
import { FollowerNotificationDialog } from '@/components/media-plan/FollowerNotificationDialog';
import { ManageFollowersDialog } from '@/components/media-plan/ManageFollowersDialog';
import { KanbanBoard } from '@/components/media-resources/KanbanBoard';

interface ChangeLog {
  id: string;
  change_date: string;
  notes: string | null;
}

interface MediaCreativeWithDetails {
  id: string;
  name: string;
  creative_id: string | null;
  copy_text: string | null;
  notes: string | null;
  format_id: string | null;
  media_line_id: string;
  created_at: string;
  production_status: string | null;
  opening_date: string | null;
  received_date: string | null;
  approved_date: string | null;
  piece_link: string | null;
  format: {
    id: string;
    name: string;
  } | null;
  media_line: {
    id: string;
    platform: string;
    line_code: string | null;
    funnel_stage: string | null;
    subdivision: { name: string } | null;
    moment: { name: string } | null;
    medium: { name: string } | null;
    vehicle: { name: string } | null;
    channel: { name: string } | null;
    target: { name: string } | null;
    funnel_stage_ref: { name: string } | null;
  } | null;
  change_logs?: ChangeLog[];
}

export default function MediaResourcesKanbanPage() {
  const { id: identifier } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);

  // Fetch plan by slug or ID
  const { data: mediaPlan, isLoading: loadingPlan } = usePlanBySlug(identifier);
  
  // Get actual plan ID
  const planId = mediaPlan?.id;
  const planUrl = mediaPlan ? getPlanUrl(mediaPlan) : '/media-plans';
  const resourcesUrl = mediaPlan?.slug 
    ? `/media-plans/${mediaPlan.slug}/resources` 
    : `/media-plans/${planId}/resources`;

  // Redirect from ID to slug
  useEffect(() => {
    if (mediaPlan && identifier) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      if (isUUID && mediaPlan.slug && identifier !== mediaPlan.slug) {
        navigate(`/media-plans/${mediaPlan.slug}/resources-kanban`, { replace: true });
      }
    }
  }, [mediaPlan, identifier, navigate]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['media-resources-kanban', planId] });
  };

  // Fetch all creatives for this plan's lines with full details
  const { data: creatives, isLoading: loadingCreatives } = useQuery({
    queryKey: ['media-resources-kanban', planId],
    queryFn: async () => {
      // First get all media lines for this plan
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select(`
          id,
          platform,
          line_code,
          funnel_stage,
          subdivision:plan_subdivisions(name),
          moment:moments(name),
          medium:mediums(name),
          vehicle:vehicles(name),
          channel:channels(name),
          target:targets(name),
          funnel_stage_ref:funnel_stages(name)
        `)
        .eq('media_plan_id', planId!);

      if (linesError) throw linesError;
      if (!lines || lines.length === 0) return [];

      const lineIds = lines.map(l => l.id);

      // Get all creatives for these lines
      const { data: creativesData, error: creativesError } = await supabase
        .from('media_creatives')
        .select(`
          id,
          name,
          creative_id,
          copy_text,
          notes,
          format_id,
          media_line_id,
          created_at,
          production_status,
          opening_date,
          received_date,
          approved_date,
          piece_link,
          format:formats(id, name)
        `)
        .in('media_line_id', lineIds)
        .order('created_at', { ascending: false });

      if (creativesError) throw creativesError;

      // Get change logs for all creatives
      const creativeIds = (creativesData || []).map(c => c.id);
      let changeLogsMap: Record<string, ChangeLog[]> = {};
      
      if (creativeIds.length > 0) {
        const { data: changeLogs } = await supabase
          .from('creative_change_logs')
          .select('id, creative_id, change_date, notes')
          .in('creative_id', creativeIds)
          .order('change_date', { ascending: false });

        (changeLogs || []).forEach(log => {
          if (!changeLogsMap[log.creative_id]) {
            changeLogsMap[log.creative_id] = [];
          }
          changeLogsMap[log.creative_id].push({
            id: log.id,
            change_date: log.change_date,
            notes: log.notes,
          });
        });
      }

      return (creativesData || []).map(creative => ({
        ...creative,
        media_line: lines.find(l => l.id === creative.media_line_id),
        change_logs: changeLogsMap[creative.id] || [],
      })) as MediaCreativeWithDetails[];
    },
    enabled: !!planId && !!user,
  });

  const isLoading = loadingPlan || loadingCreatives;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={resourcesUrl}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Recursos de Mídia - Kanban</h1>
            {mediaPlan && (
              <p className="text-muted-foreground text-sm">
                Plano: {mediaPlan.name}
              </p>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setNotificationDialogOpen(true)}
          >
            <Users className="h-3.5 w-3.5" />
            Notificar Seguidores
          </Button>
          <Link to={resourcesUrl}>
            <Button variant="outline" size="sm" className="gap-2">
              <List className="h-3.5 w-3.5" />
              Ver Lista
            </Button>
          </Link>
          <Link to={planUrl}>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver Plano
            </Button>
          </Link>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex gap-4">
            <Skeleton className="h-[600px] flex-1" />
            <Skeleton className="h-[600px] flex-1" />
            <Skeleton className="h-[600px] flex-1" />
          </div>
        ) : (
          <KanbanBoard 
            creatives={creatives || []} 
            onUpdate={refetch} 
          />
        )}
      </div>

      {/* Notification Dialog */}
      {planId && mediaPlan && (
        <>
          <FollowerNotificationDialog
            open={notificationDialogOpen}
            onOpenChange={setNotificationDialogOpen}
            planId={planId}
            planName={mediaPlan.name}
            recentChangeLogs={creatives?.flatMap(c => c.change_logs || []) || []}
            onManageFollowers={() => setFollowersDialogOpen(true)}
          />
          <ManageFollowersDialog
            open={followersDialogOpen}
            onOpenChange={setFollowersDialogOpen}
            planId={planId}
            planName={mediaPlan.name}
          />
        </>
      )}
    </DashboardLayout>
  );
}
