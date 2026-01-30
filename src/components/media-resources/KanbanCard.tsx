import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  GripVertical,
  ExternalLink,
  FileType,
  Calendar,
  Link as LinkIcon,
  Ruler,
  Paperclip,
  Timer,
  Weight,
  Type,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ColumnId } from "./KanbanBoard";

const PRODUCTION_STATUSES = [
  { value: "solicitado", label: "Solicitado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  {
    value: "enviado",
    label: "Enviado",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  {
    value: "em_andamento",
    label: "Em Andamento",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  {
    value: "finalizado",
    label: "Finalizado",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  {
    value: "entregue",
    label: "Entregue",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  {
    value: "alteracao",
    label: "Alteração",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  { value: "aprovado", label: "Aprovado", color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
];

interface ChangeLog {
  id: string;
  change_date: string;
  notes: string | null;
}

/**
 * ✅ Tipos mínimos necessários para o card renderizar specs.
 * IMPORTANTE: seu backend/fetch do Kanban precisa preencher `creative.format_details`
 * no mesmo formato que você já monta na página de tabela.
 */
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

  /** ✅ NOVO: detalhes do formato com especificações (mesmo shape da tabela) */
  format_details?: FormatCreativeType[];
}

interface KanbanCardProps {
  creative: MediaCreativeWithDetails;
  columnId: ColumnId;
  hasWarning: boolean;
  onUpdate: () => void;
  isDragging?: boolean;
}

/** Helper: pega as specs do format_details e transforma em uma lista "flat" renderizável */
function buildSpecs(formatDetails?: FormatCreativeType[]) {
  if (!formatDetails?.length) return [];

  return formatDetails.flatMap((type) =>
    type.specifications.map((spec) => {
      const dimensions =
        spec.dimensions
          .map((d) => `${d.width}x${d.height}${d.unit}${d.description ? ` (${d.description})` : ""}`)
          .join(", ") || "—";

      const extensions = spec.extensions?.map((e) => e.name).join(", ") || "—";

      const duration =
        spec.has_duration && spec.duration_value ? `${spec.duration_value}${spec.duration_unit || "s"}` : "—";

      const weight = spec.max_weight ? `${spec.max_weight}${spec.weight_unit || "KB"}` : "—";

      const copyFields =
        spec.copy_fields
          ?.map((cf) => `${cf.name}${cf.max_characters ? ` (${cf.max_characters} chars)` : ""}`)
          .join(", ") || "—";

      return {
        typeName: type.name,
        specName: spec.name,
        dimensions,
        extensions,
        duration,
        weight,
        copyFields,
      };
    }),
  );
}

export function KanbanCard({ creative, columnId, hasWarning, onUpdate, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: creative.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const status = PRODUCTION_STATUSES.find((s) => s.value === creative.production_status) || PRODUCTION_STATUSES[0];

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from("media_creatives")
      .update({ production_status: newStatus })
      .eq("id", creative.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado");
      onUpdate();
    }
  };

  const mediaLine = creative.media_line;

  /** ✅ NOVO: calcula specs uma vez por render */
  const specs = useMemo(() => buildSpecs(creative.format_details), [creative.format_details]);

  /** ✅ NOVO: agrega por campo para mostrar no card (sem collapsible) */
  const specsSummary = useMemo(() => {
    if (!specs.length) return null;

    const joinUnique = (items: string[]) => {
      const set = new Set(items.flatMap((t) => t.split(",").map((x) => x.trim())).filter(Boolean));
      return set.size ? Array.from(set).join(", ") : "—";
    };

    const dimensions = joinUnique(specs.map((s) => s.dimensions).filter((v) => v && v !== "—"));
    const extensions = joinUnique(specs.map((s) => s.extensions).filter((v) => v && v !== "—"));

    const duration = joinUnique(specs.map((s) => s.duration).filter((v) => v && v !== "—"));
    const weight = joinUnique(specs.map((s) => s.weight).filter((v) => v && v !== "—"));

    const copyFields = joinUnique(specs.map((s) => s.copyFields).filter((v) => v && v !== "—"));

    return { dimensions, extensions, duration, weight, copyFields };
  }, [specs]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", (isDragging || isSortableDragging) && "opacity-50")}
    >
      <Card
        className={cn(
          "group relative transition-all hover:shadow-md",
          hasWarning && "border-destructive/50 bg-destructive/5",
          isDragging && "shadow-lg",
        )}
      >
        {/* Warning Badge */}
        {hasWarning && (
          <div className="absolute -top-2 -right-2 z-10">
            <div
              className="bg-destructive text-destructive-foreground rounded-full p-1"
              title="Status não corresponde à coluna"
            >
              <AlertTriangle className="h-3 w-3" />
            </div>
          </div>
        )}

        <CardContent className="p-3 space-y-2">
          {/* Header with drag handle and ID */}
          <div className="flex items-start gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono shrink-0">
                  {creative.creative_id || mediaLine?.line_code || "N/A"}
                </Badge>
                {creative.format?.name && (
                  <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <FileType className="h-3 w-3" />
                    {creative.format.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Line Information */}
          {mediaLine && (
            <div className="text-xs space-y-1 text-muted-foreground">
              {mediaLine.subdivision?.name && (
                <div className="truncate">
                  <span className="font-medium text-foreground">Subdivisão:</span> {mediaLine.subdivision.name}
                </div>
              )}
              {mediaLine.moment?.name && (
                <div className="truncate">
                  <span className="font-medium text-foreground">Momento:</span> {mediaLine.moment.name}
                </div>
              )}
              {mediaLine.vehicle?.name && (
                <div className="truncate">
                  <span className="font-medium text-foreground">Veículo:</span> {mediaLine.vehicle.name}
                </div>
              )}
              {mediaLine.channel?.name && (
                <div className="truncate">
                  <span className="font-medium text-foreground">Canal:</span> {mediaLine.channel.name}
                </div>
              )}
            </div>
          )}

          {/* ✅ NOVO: Specs no card */}
          {specsSummary && (
            <div className="text-xs p-2 bg-muted/50 rounded space-y-1 text-muted-foreground">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="flex items-center gap-1 min-w-0">
                  <Ruler className="h-3 w-3 shrink-0" />
                  <span className="truncate">Dim: {specsSummary.dimensions}</span>
                </span>
                <span className="flex items-center gap-1 min-w-0">
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="truncate">Ext: {specsSummary.extensions}</span>
                </span>
                <span className="flex items-center gap-1 min-w-0">
                  <Timer className="h-3 w-3 shrink-0" />
                  <span className="truncate">Dur: {specsSummary.duration}</span>
                </span>
                <span className="flex items-center gap-1 min-w-0">
                  <Weight className="h-3 w-3 shrink-0" />
                  <span className="truncate">Peso: {specsSummary.weight}</span>
                </span>
                {specsSummary.copyFields !== "—" && (
                  <span className="col-span-2 flex items-center gap-1 min-w-0">
                    <Type className="h-3 w-3 shrink-0" />
                    <span className="truncate">Copy: {specsSummary.copyFields}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Copy Text */}
          {creative.copy_text && (
            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{creative.copy_text}"</p>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-2 text-xs">
            {creative.opening_date && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Solicitado: {format(new Date(creative.opening_date), "dd/MM", { locale: ptBR })}
              </span>
            )}
            {creative.approved_date && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Calendar className="h-3 w-3" />
                Aprovado: {format(new Date(creative.approved_date), "dd/MM", { locale: ptBR })}
              </span>
            )}
          </div>

          {/* Piece Link */}
          {creative.piece_link && (
            <a
              href={creative.piece_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <LinkIcon className="h-3 w-3" />
              Ver peça
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Status Selector */}
          <div className="pt-1 border-t">
            <Select value={creative.production_status || "solicitado"} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue>
                  <Badge className={cn(status.color, "text-xs font-normal")}>{status.label}</Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <Badge className={cn(s.color, "text-xs font-normal")}>{s.label}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
