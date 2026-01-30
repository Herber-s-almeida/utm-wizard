import { useMemo, useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
  Check,
  X,
  ChevronRight,
  ChevronDown,
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
    dimensions: { width: number; height: number; unit: string; description: string | null }[];
    extensions: { name: string }[];
    copy_fields: { name: string; max_characters: number | null; observation: string | null }[];
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
  format: { id: string; name: string } | null;
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
  format_details?: FormatCreativeType[];
}

interface KanbanCardProps {
  creative: MediaCreativeWithDetails;
  columnId: ColumnId;
  hasWarning: boolean;
  onUpdate: () => void;
  userId: string; // ✅ NOVO: necessário para inserir logs
  isDragging?: boolean;
}

function buildSpecsSummary(formatDetails?: FormatCreativeType[]) {
  if (!formatDetails?.length) return null;

  const dimensionsSet = new Set<string>();
  const extensionsSet = new Set<string>();
  const durationSet = new Set<string>();
  const weightSet = new Set<string>();
  const copySet = new Set<string>();

  formatDetails.forEach((type) => {
    type.specifications.forEach((spec) => {
      spec.dimensions?.forEach((d) => {
        const label = `${d.width}x${d.height}${d.unit}${d.description ? ` (${d.description})` : ""}`;
        if (label.trim()) dimensionsSet.add(label);
      });

      spec.extensions?.forEach((e) => {
        if (e?.name?.trim()) extensionsSet.add(e.name.trim());
      });

      if (spec.has_duration && spec.duration_value) {
        durationSet.add(`${spec.duration_value}${spec.duration_unit || "s"}`);
      }

      if (spec.max_weight) {
        weightSet.add(`${spec.max_weight}${spec.weight_unit || "KB"}`);
      }

      spec.copy_fields?.forEach((cf) => {
        const label = `${cf.name}${cf.max_characters ? ` (${cf.max_characters} chars)` : ""}`;
        if (label.trim()) copySet.add(label);
      });
    });
  });

  return {
    dimensions: Array.from(dimensionsSet),
    copyFields: Array.from(copySet),
    extensions: Array.from(extensionsSet).join(", ") || "—",
    duration: Array.from(durationSet).join(", ") || "—",
    weight: Array.from(weightSet).join(", ") || "—",
  };
}

export function KanbanCard({ creative, columnId, hasWarning, onUpdate, userId, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: creative.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const status = PRODUCTION_STATUSES.find((s) => s.value === creative.production_status) || PRODUCTION_STATUSES[0];

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from("media_creatives")
      .update({ production_status: newStatus })
      .eq("id", creative.id);
    if (error) toast.error("Erro ao atualizar status");
    else {
      toast.success("Status atualizado");
      onUpdate();
    }
  };

  const mediaLine = creative.media_line;
  const specsSummary = useMemo(() => buildSpecsSummary(creative.format_details), [creative.format_details]);

  // =========================
  // ✅ Link da peça (editável)
  // =========================
  const [editingLink, setEditingLink] = useState(false);
  const [linkValue, setLinkValue] = useState(creative.piece_link || "");

  useEffect(() => {
    if (!editingLink) setLinkValue(creative.piece_link || "");
  }, [creative.piece_link, editingLink]);

  const handleSavePieceLink = async () => {
    const trimmed = linkValue.trim();
    const { error } = await supabase
      .from("media_creatives")
      .update({ piece_link: trimmed ? trimmed : null })
      .eq("id", creative.id);
    if (error) return toast.error("Erro ao salvar link");
    toast.success("Link salvo");
    setEditingLink(false);
    onUpdate();
  };

  const cancelEditPieceLink = () => {
    setEditingLink(false);
    setLinkValue(creative.piece_link || "");
  };

  // =========================
  // ✅ Alterações (logs) no card
  // =========================
  const logs = creative.change_logs || [];
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [addingLog, setAddingLog] = useState(false);
  const [newLogNotes, setNewLogNotes] = useState("");

  const handleAddLog = async () => {
    const notes = newLogNotes.trim();

    if (!userId) {
      toast.error("Usuário não identificado para registrar alteração");
      return;
    }

    const { error: insertError } = await supabase.from("creative_change_logs").insert({
      creative_id: creative.id,
      user_id: userId,
      notes: notes || null,
    });

    if (insertError) {
      toast.error("Erro ao adicionar alteração");
      return;
    }

    // Igual ao MediaResourcesPage: ao registrar alteração, muda status para "alteracao"
    const { error: statusError } = await supabase
      .from("media_creatives")
      .update({ production_status: "alteracao" })
      .eq("id", creative.id);

    if (statusError) {
      // Não bloqueia UX: o log foi gravado; só avisa que status falhou.
      toast.error("Alteração registrada, mas falhou ao atualizar status");
    } else {
      toast.success("Alteração registrada");
    }

    setNewLogNotes("");
    setAddingLog(false);
    setLogsExpanded(true);
    onUpdate();
  };

  const handleDeleteLog = async (logId: string) => {
    const { error } = await supabase.from("creative_change_logs").delete().eq("id", logId);
    if (error) toast.error("Erro ao remover alteração");
    else onUpdate();
  };

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
          {/* Header */}
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

          {/* Line Info */}
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

          {/* Specs */}
          {specsSummary && (
            <div className="text-xs p-2 bg-muted/50 rounded space-y-2 text-muted-foreground">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-foreground font-medium">
                  <Ruler className="h-3 w-3" />
                  Dimensões:
                </div>
                {specsSummary.dimensions.length > 0 ? (
                  <ul className="pl-4 list-disc space-y-0.5">
                    {specsSummary.dimensions.map((d) => (
                      <li key={d} className="leading-snug">
                        {d}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>—</div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-foreground font-medium">
                  <Type className="h-3 w-3" />
                  Copy:
                </div>
                {specsSummary.copyFields.length > 0 ? (
                  <ul className="pl-4 list-disc space-y-0.5">
                    {specsSummary.copyFields.map((c) => (
                      <li key={c} className="leading-snug">
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>—</div>
                )}
              </div>

              <div className="pt-1 border-t space-y-1">
                <div className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  <span className="text-foreground font-medium">Extensões:</span> {specsSummary.extensions}
                </div>
                <div className="flex items-center gap-1">
                  <Weight className="h-3 w-3" />
                  <span className="text-foreground font-medium">Peso:</span> {specsSummary.weight}
                </div>
                <div className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  <span className="text-foreground font-medium">Duração:</span> {specsSummary.duration}
                </div>
              </div>
            </div>
          )}

          {/* Copy text do criativo */}
          {creative.copy_text && (
            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{creative.copy_text}"</p>
          )}

          {/* ✅ Alterações */}
          <div className="pt-1 border-t" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setLogsExpanded((v) => !v)}
              >
                {logsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {logs.length} alteração(ões)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Adicionar alteração"
                onClick={() => {
                  setLogsExpanded(true);
                  setAddingLog(true);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {logsExpanded && (
              <div className="mt-2 space-y-2">
                {addingLog && (
                  <div className="flex items-center gap-1 p-2 bg-muted/50 rounded">
                    <Input
                      value={newLogNotes}
                      onChange={(e) => setNewLogNotes(e.target.value)}
                      placeholder="Observação..."
                      className="h-7 text-xs flex-1"
                    />
                    <Button size="sm" className="h-7 w-7 p-0" onClick={handleAddLog}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setAddingLog(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {logs.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                    Nenhuma alteração registrada
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded group"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">
                          {format(new Date(log.change_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                        {log.notes && <span className="text-muted-foreground ml-2 break-words">{log.notes}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

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

          {/* Link da peça (editável) */}
          <div onClick={(e) => e.stopPropagation()}>
            {editingLink ? (
              <div className="flex items-center gap-1">
                <Input
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="https://..."
                  className="h-7 text-xs flex-1"
                />
                <Button size="sm" className="h-7 w-7 p-0" onClick={handleSavePieceLink}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelEditPieceLink}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : creative.piece_link ? (
              <div className="flex items-center gap-1">
                <a
                  href={creative.piece_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 min-w-0 flex-1"
                >
                  <LinkIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{creative.piece_link}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setEditingLink(true)}
                  title="Editar link"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1 text-muted-foreground"
                onClick={() => setEditingLink(true)}
              >
                <Plus className="h-3 w-3" />
                Adicionar link da peça
              </Button>
            )}
          </div>

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
