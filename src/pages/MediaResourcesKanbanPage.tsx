import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, List, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { usePlanBySlug, getPlanUrl } from "@/hooks/usePlanBySlug";
import { FollowerNotificationDialog } from "@/components/media-plan/FollowerNotificationDialog";
import { ManageFollowersDialog } from "@/components/media-plan/ManageFollowersDialog";
import { KanbanBoard } from "@/components/media-resources/KanbanBoard";

interface ChangeLog {
  id: string;
  change_date: string;
  notes: string | null;
}

/** ✅ NOVO: tipos de formato/specs iguais ao da página de lista */
interface FormatCreativeType {
  id: string;
  name: string;
  specifications: {
    id: string;
    name: string;
    has_duration: boolean | null;
    duration_value: number | null;
    duration_unit: string | null;
    max_weight: number | null;
    weight_unit: string | null;
    dimensions: {
      width: number;
      height: number;
      unit: string;
      description: string | null;
    }[];
    extensions: { name: string }[];
    copy_fields: {
      name: string;
      max_characters: number | null;
      observation: string | null;
    }[];
  }[];
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

  /** ✅ NOVO: é isso que o KanbanCard precisa */
  format_details?: FormatCreativeType[];
}

export default function MediaResourcesKanbanPage() {
  const { id: identifier } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);

  const { data: mediaPlan, isLoading: loadingPlan } = usePlanBySlug(identifier);

  const planId = mediaPlan?.id;
  const planUrl = mediaPlan ? getPlanUrl(mediaPlan) : "/media-plans";
  const resourcesUrl = mediaPlan?.slug
    ? `/media-plans/${mediaPlan.slug}/resources`
    : `/media-plans/${planId}/resources`;

  useEffect(() => {
    if (mediaPlan && identifier) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      if (isUUID && mediaPlan.slug && identifier !== mediaPlan.slug) {
        navigate(`/media-plans/${mediaPlan.slug}/resources-kanban`, { replace: true });
      }
    }
  }, [mediaPlan, identifier, navigate]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["media-resources-kanban", planId] });
  };

  const { data: creatives, isLoading: loadingCreatives } = useQuery({
    queryKey: ["media-resources-kanban", planId],
    queryFn: async () => {
      // 1) media lines
      const { data: lines, error: linesError } = await supabase
        .from("media_lines")
        .select(
          `
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
        `,
        )
        .eq("media_plan_id", planId!);

      if (linesError) throw linesError;
      if (!lines || lines.length === 0) return [];

      const lineIds = lines.map((l) => l.id);

      // 2) creatives
      const { data: creativesData, error: creativesError } = await supabase
        .from("media_creatives")
        .select(
          `
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
        `,
        )
        .in("media_line_id", lineIds)
        .order("created_at", { ascending: false });

      if (creativesError) throw creativesError;

      // 3) change logs
      const creativeIds = (creativesData || []).map((c) => c.id);
      const changeLogsMap: Record<string, ChangeLog[]> = {};

      if (creativeIds.length > 0) {
        const { data: changeLogs } = await supabase
          .from("creative_change_logs")
          .select("id, creative_id, change_date, notes")
          .in("creative_id", creativeIds)
          .order("change_date", { ascending: false });

        (changeLogs || []).forEach((log) => {
          if (!changeLogsMap[log.creative_id]) changeLogsMap[log.creative_id] = [];
          changeLogsMap[log.creative_id].push({
            id: log.id,
            change_date: log.change_date,
            notes: log.notes,
          });
        });
      }

      /**
       * ✅ 4) NOVO: montar format_details por format_id (mesma lógica da lista)
       */
      const formatIds = [...new Set((creativesData || []).map((c) => c.format_id).filter(Boolean))] as string[];
      const formatCreativeTypesMap: Record<string, FormatCreativeType[]> = {};

      if (formatIds.length > 0) {
        const { data: creativeTypes, error: typesError } = await supabase
          .from("format_creative_types")
          .select(`id, name, format_id`)
          .in("format_id", formatIds);

        if (typesError) throw typesError;

        if (creativeTypes && creativeTypes.length > 0) {
          const typeIds = creativeTypes.map((t) => t.id);

          const { data: specs, error: specsError } = await supabase
            .from("creative_type_specifications")
            .select(`id, name, creative_type_id, has_duration, duration_value, duration_unit, max_weight, weight_unit`)
            .in("creative_type_id", typeIds)
            .is("deleted_at", null);

          if (specsError) throw specsError;

          const specIds = (specs || []).map((s) => s.id);

          const { data: dimensions, error: dimError } = await supabase
            .from("specification_dimensions")
            .select("id, specification_id, width, height, unit, description")
            .in("specification_id", specIds)
            .is("deleted_at", null);

          if (dimError) throw dimError;

          const { data: extensionsData, error: extError } = await supabase
            .from("specification_extensions")
            .select("id, specification_id, extension_id, extension:file_extensions(name)")
            .in("specification_id", specIds);

          if (extError) throw extError;

          const { data: copyFields, error: copyError } = await supabase
            .from("specification_copy_fields")
            .select("id, specification_id, name, max_characters, observation")
            .in("specification_id", specIds)
            .is("deleted_at", null);

          if (copyError) throw copyError;

          // agrupar por format_id
          creativeTypes.forEach((type) => {
            const formatId = type.format_id;
            if (!formatCreativeTypesMap[formatId]) formatCreativeTypesMap[formatId] = [];

            const typeSpecs =
              (specs || [])
                .filter((s) => s.creative_type_id === type.id)
                .map((spec) => ({
                  id: spec.id,
                  name: spec.name,
                  has_duration: spec.has_duration,
                  duration_value: spec.duration_value,
                  duration_unit: spec.duration_unit,
                  max_weight: spec.max_weight,
                  weight_unit: spec.weight_unit,
                  dimensions:
                    (dimensions || [])
                      .filter((d) => d.specification_id === spec.id)
                      .map((d) => ({
                        width: d.width,
                        height: d.height,
                        unit: d.unit,
                        description: d.description,
                      })) || [],
                  extensions:
                    (extensionsData || [])
                      .filter((e) => e.specification_id === spec.id)
                      .map((e) => ({ name: (e.extension as any)?.name || "" }))
                      .filter((x) => x.name) || [],
                  copy_fields:
                    (copyFields || [])
                      .filter((cf) => cf.specification_id === spec.id)
                      .map((cf) => ({
                        name: cf.name,
                        max_characters: cf.max_characters,
                        observation: cf.observation,
                      })) || [],
                })) || [];

            formatCreativeTypesMap[formatId].push({
              id: type.id,
              name: type.name,
              specifications: typeSpecs,
            });
          });
        }
      }

      // 5) merge final
      return (creativesData || []).map((creative) => ({
        ...creative,
        media_line: lines.find((l) => l.id === creative.media_line_id),
        change_logs: changeLogsMap[creative.id] || [],
        format_details: creative.format_id ? formatCreativeTypesMap[creative.format_id] : undefined,
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
            {mediaPlan && <p className="text-muted-foreground text-sm">Plano: {mediaPlan.name}</p>}
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setNotificationDialogOpen(true)}>
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
          <KanbanBoard creatives={creatives || []} onUpdate={refetch} />
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
            recentChangeLogs={creatives?.flatMap((c) => c.change_logs || []) || []}
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
