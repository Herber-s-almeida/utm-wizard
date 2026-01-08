import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Image, FileText, ExternalLink, ChevronDown, ChevronRight, Check, Plus, Calendar, Link as LinkIcon, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { usePlanBySlug, getPlanUrl } from '@/hooks/usePlanBySlug';

const PRODUCTION_STATUSES = [
  { value: 'solicitado', label: 'Solicitado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'enviado', label: 'Enviado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'finalizado', label: 'Finalizado', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'entregue', label: 'Entregue', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  { value: 'alteracao', label: 'Alteração', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
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
    dimensions: {
      width: number;
      height: number;
      unit: string;
      description: string | null;
    }[];
    extensions: {
      name: string;
    }[];
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
  format_details?: FormatCreativeType[];
  change_logs?: ChangeLog[];
}

function SpecificationsCell({ formatDetails }: { formatDetails?: FormatCreativeType[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!formatDetails || formatDetails.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const allSpecs: {
    typeName: string;
    specName: string;
    dimensions: string;
    extensions: string;
    duration: string;
    weight: string;
    copyFields: string;
  }[] = [];

  formatDetails.forEach(type => {
    type.specifications.forEach(spec => {
      const dimensions = spec.dimensions
        .map(d => `${d.width}x${d.height}${d.unit}${d.description ? ` (${d.description})` : ''}`)
        .join(', ') || '—';
      
      const extensions = spec.extensions.map(e => e.name).join(', ') || '—';
      
      const duration = spec.has_duration && spec.duration_value
        ? `${spec.duration_value}${spec.duration_unit || 's'}`
        : '—';
      
      const weight = spec.max_weight
        ? `${spec.max_weight}${spec.weight_unit || 'KB'}`
        : '—';
      
      const copyFields = spec.copy_fields
        .map(cf => `${cf.name}${cf.max_characters ? ` (${cf.max_characters} chars)` : ''}`)
        .join(', ') || '—';

      allSpecs.push({
        typeName: type.name,
        specName: spec.name,
        dimensions,
        extensions,
        duration,
        weight,
        copyFields,
      });
    });
  });

  if (allSpecs.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {allSpecs.length} especificação(ões)
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {allSpecs.map((spec, idx) => (
          <div key={idx} className="text-xs p-2 bg-muted/50 rounded space-y-1">
            <div className="font-medium">{spec.typeName} › {spec.specName}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span>Dimensões: {spec.dimensions}</span>
              <span>Extensões: {spec.extensions}</span>
              <span>Duração: {spec.duration}</span>
              <span>Peso máx: {spec.weight}</span>
              {spec.copyFields !== '—' && (
                <span className="col-span-2">Copy: {spec.copyFields}</span>
              )}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function StatusCell({ 
  creativeId, 
  currentStatus, 
  onUpdate 
}: { 
  creativeId: string; 
  currentStatus: string | null; 
  onUpdate: () => void;
}) {
  const status = PRODUCTION_STATUSES.find(s => s.value === currentStatus) || PRODUCTION_STATUSES[0];

  const handleChange = async (newStatus: string) => {
    const { error } = await supabase
      .from('media_creatives')
      .update({ production_status: newStatus })
      .eq('id', creativeId);
    
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      onUpdate();
    }
  };

  return (
    <Select value={currentStatus || 'solicitado'} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-[130px] text-xs">
        <SelectValue>
          <Badge className={`${status.color} text-xs font-normal`}>
            {status.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PRODUCTION_STATUSES.map(s => (
          <SelectItem key={s.value} value={s.value}>
            <Badge className={`${s.color} text-xs font-normal`}>
              {s.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DateCell({ 
  date, 
  creativeId, 
  field, 
  onUpdate,
  readOnly = false 
}: { 
  date: string | null; 
  creativeId: string;
  field: string;
  onUpdate: () => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = async (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    const { error } = await supabase
      .from('media_creatives')
      .update({ [field]: selectedDate.toISOString() })
      .eq('id', creativeId);
    
    if (error) {
      toast.error('Erro ao atualizar data');
    } else {
      onUpdate();
      setOpen(false);
    }
  };

  if (readOnly) {
    return (
      <span className="text-xs">
        {date ? format(new Date(date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
          <Calendar className="h-3 w-3" />
          {date ? format(new Date(date), 'dd/MM/yy', { locale: ptBR }) : '—'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={date ? new Date(date) : undefined}
          onSelect={handleSelect}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}

function ChangeLogsCell({ 
  creativeId, 
  logs, 
  userId,
  onUpdate 
}: { 
  creativeId: string; 
  logs: ChangeLog[];
  userId: string;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newNotes, setNewNotes] = useState('');

  const handleAddLog = async () => {
    const { error } = await supabase
      .from('creative_change_logs')
      .insert({
        creative_id: creativeId,
        user_id: userId,
        notes: newNotes || null,
      });

    if (error) {
      toast.error('Erro ao adicionar alteração');
    } else {
      // Also update status to "alteracao"
      await supabase
        .from('media_creatives')
        .update({ production_status: 'alteracao' })
        .eq('id', creativeId);
      
      toast.success('Alteração registrada');
      setNewNotes('');
      setAddingNew(false);
      onUpdate();
    }
  };

  const handleDeleteLog = async (logId: string) => {
    const { error } = await supabase
      .from('creative_change_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      toast.error('Erro ao remover alteração');
    } else {
      onUpdate();
    }
  };

  return (
    <div className="min-w-[150px]">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="flex items-center gap-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {logs.length} alteração(ões)
            </Button>
          </CollapsibleTrigger>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => { setExpanded(true); setAddingNew(true); }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <CollapsibleContent className="mt-2 space-y-2">
          {addingNew && (
            <div className="flex items-center gap-1 p-2 bg-muted/50 rounded">
              <Input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Observação..."
                className="h-6 text-xs flex-1"
              />
              <Button size="sm" className="h-6 w-6 p-0" onClick={handleAddLog}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setAddingNew(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded group">
              <div>
                <span className="font-medium">
                  {format(new Date(log.change_date), 'dd/MM/yy HH:mm', { locale: ptBR })}
                </span>
                {log.notes && <span className="text-muted-foreground ml-2">{log.notes}</span>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => handleDeleteLog(log.id)}
              >
                <X className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ApprovalCell({ 
  creativeId, 
  approvedDate, 
  currentStatus,
  onUpdate 
}: { 
  creativeId: string; 
  approvedDate: string | null;
  currentStatus: string | null;
  onUpdate: () => void;
}) {
  const isApproved = currentStatus === 'aprovado' || !!approvedDate;

  const handleApprove = async () => {
    const { error } = await supabase
      .from('media_creatives')
      .update({ 
        production_status: 'aprovado',
        approved_date: new Date().toISOString()
      })
      .eq('id', creativeId);
    
    if (error) {
      toast.error('Erro ao aprovar');
    } else {
      toast.success('Criativo aprovado!');
      onUpdate();
    }
  };

  const handleUnapprove = async () => {
    const { error } = await supabase
      .from('media_creatives')
      .update({ 
        production_status: 'solicitado',
        approved_date: null
      })
      .eq('id', creativeId);
    
    if (error) {
      toast.error('Erro ao desaprovar');
    } else {
      toast.success('Aprovação removida');
      onUpdate();
    }
  };

  if (isApproved && approvedDate) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <Check className="h-3 w-3" />
          {format(new Date(approvedDate), 'dd/MM/yy', { locale: ptBR })}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleUnapprove}
          title="Desaprovar"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="h-6 px-2 text-xs gap-1"
      onClick={handleApprove}
    >
      <Check className="h-3 w-3" />
      Aprovar
    </Button>
  );
}

function PieceLinkCell({ 
  creativeId, 
  link, 
  onUpdate 
}: { 
  creativeId: string; 
  link: string | null;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(link || '');

  const handleSave = async () => {
    const { error } = await supabase
      .from('media_creatives')
      .update({ piece_link: value || null })
      .eq('id', creativeId);
    
    if (error) {
      toast.error('Erro ao salvar link');
    } else {
      setEditing(false);
      onUpdate();
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://..."
          className="h-6 text-xs w-[150px]"
        />
        <Button size="sm" className="h-6 w-6 p-0" onClick={handleSave}>
          <Check className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (link) {
    return (
      <div className="flex items-center gap-1">
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1 max-w-[120px] truncate"
        >
          <LinkIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{link}</span>
        </a>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditing(true)}>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-6 px-2 text-xs gap-1 text-muted-foreground"
      onClick={() => setEditing(true)}
    >
      <Plus className="h-3 w-3" />
      Adicionar
    </Button>
  );
}

export default function MediaResourcesPage() {
  const { id: identifier } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch plan by slug or ID
  const { data: mediaPlan, isLoading: loadingPlan } = usePlanBySlug(identifier);
  
  // Get actual plan ID
  const planId = mediaPlan?.id;
  const planUrl = mediaPlan ? getPlanUrl(mediaPlan) : '/media-plans';

  // Redirect from ID to slug
  useEffect(() => {
    if (mediaPlan && identifier) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      if (isUUID && mediaPlan.slug && identifier !== mediaPlan.slug) {
        navigate(`/media-plans/${mediaPlan.slug}/resources`, { replace: true });
      }
    }
  }, [mediaPlan, identifier, navigate]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['media-resources', planId] });
  };

  // Fetch all creatives for this plan's lines with full details
  const { data: creatives, isLoading: loadingCreatives } = useQuery({
    queryKey: ['media-resources', planId],
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

      // Get format details (creative types with specifications)
      const formatIds = [...new Set((creativesData || []).map(c => c.format_id).filter(Boolean))] as string[];
      
      let formatCreativeTypesMap: Record<string, FormatCreativeType[]> = {};
      
      if (formatIds.length > 0) {
        const { data: creativeTypes } = await supabase
          .from('format_creative_types')
          .select(`id, name, format_id`)
          .in('format_id', formatIds);

        if (creativeTypes && creativeTypes.length > 0) {
          const typeIds = creativeTypes.map(t => t.id);
          
          const { data: specs } = await supabase
            .from('creative_type_specifications')
            .select(`id, name, creative_type_id, has_duration, duration_value, duration_unit, max_weight, weight_unit`)
            .in('creative_type_id', typeIds);

          const specIds = specs?.map(s => s.id) || [];
          const { data: dimensions } = await supabase
            .from('specification_dimensions')
            .select('id, specification_id, width, height, unit, description')
            .in('specification_id', specIds);

          const { data: extensionsData } = await supabase
            .from('specification_extensions')
            .select('id, specification_id, extension_id, extension:file_extensions(name)')
            .in('specification_id', specIds);

          const { data: copyFields } = await supabase
            .from('specification_copy_fields')
            .select('id, specification_id, name, max_characters, observation')
            .in('specification_id', specIds);

          creativeTypes.forEach(type => {
            const formatId = type.format_id;
            if (!formatCreativeTypesMap[formatId]) {
              formatCreativeTypesMap[formatId] = [];
            }
            
            const typeSpecs = (specs || [])
              .filter(s => s.creative_type_id === type.id)
              .map(spec => ({
                id: spec.id,
                name: spec.name,
                has_duration: spec.has_duration,
                duration_value: spec.duration_value,
                duration_unit: spec.duration_unit,
                max_weight: spec.max_weight,
                weight_unit: spec.weight_unit,
                dimensions: (dimensions || [])
                  .filter(d => d.specification_id === spec.id)
                  .map(d => ({ width: d.width, height: d.height, unit: d.unit, description: d.description })),
                extensions: (extensionsData || [])
                  .filter(e => e.specification_id === spec.id)
                  .map(e => ({ name: (e.extension as any)?.name || '' })),
                copy_fields: (copyFields || [])
                  .filter(cf => cf.specification_id === spec.id)
                  .map(cf => ({ name: cf.name, max_characters: cf.max_characters, observation: cf.observation })),
              }));

            formatCreativeTypesMap[formatId].push({
              id: type.id,
              name: type.name,
              specifications: typeSpecs,
            });
          });
        }
      }

      return (creativesData || []).map(creative => ({
        ...creative,
        media_line: lines.find(l => l.id === creative.media_line_id),
        format_details: creative.format_id ? formatCreativeTypesMap[creative.format_id] : undefined,
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
          <Link to={planUrl}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Recursos de Mídia</h1>
            {mediaPlan && (
              <p className="text-muted-foreground text-sm">
                Plano: {mediaPlan.name}
              </p>
            )}
          </div>
          <Link to={planUrl}>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver Plano
            </Button>
          </Link>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Criativos Solicitados
            </CardTitle>
            <CardDescription>
              Lista de todos os criativos vinculados às linhas de mídia deste plano.
              Compartilhe esta página com o time criativo para produção das peças.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !creatives || creatives.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum criativo cadastrado neste plano.</p>
                <p className="text-sm mt-1">
                  Adicione criativos às linhas de mídia no plano.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">ID</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Abertura</TableHead>
                      <TableHead className="whitespace-nowrap">Recebimento</TableHead>
                      <TableHead className="whitespace-nowrap">Alterações</TableHead>
                      <TableHead className="whitespace-nowrap">Aprovação</TableHead>
                      <TableHead className="whitespace-nowrap">Link da Peça</TableHead>
                      <TableHead className="whitespace-nowrap">Subdivisão</TableHead>
                      <TableHead className="whitespace-nowrap">Momento</TableHead>
                      <TableHead className="whitespace-nowrap">Fase</TableHead>
                      <TableHead className="whitespace-nowrap">Código</TableHead>
                      <TableHead className="whitespace-nowrap">Meio</TableHead>
                      <TableHead className="whitespace-nowrap">Veículo</TableHead>
                      <TableHead className="whitespace-nowrap">Canal</TableHead>
                      <TableHead className="whitespace-nowrap">Segmentação</TableHead>
                      <TableHead className="whitespace-nowrap">Formato</TableHead>
                      <TableHead className="whitespace-nowrap">Mensagem</TableHead>
                      <TableHead className="whitespace-nowrap">Observações</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[200px]">Especificações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatives.map((creative) => (
                      <TableRow key={creative.id}>
                        <TableCell className="font-mono text-xs">
                          <Badge variant="outline" className="font-mono">
                            {creative.creative_id || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusCell 
                            creativeId={creative.id} 
                            currentStatus={creative.production_status} 
                            onUpdate={refetch}
                          />
                        </TableCell>
                        <TableCell>
                          <DateCell 
                            date={creative.opening_date} 
                            creativeId={creative.id}
                            field="opening_date"
                            onUpdate={refetch}
                            readOnly
                          />
                        </TableCell>
                        <TableCell>
                          <DateCell 
                            date={creative.received_date} 
                            creativeId={creative.id}
                            field="received_date"
                            onUpdate={refetch}
                          />
                        </TableCell>
                        <TableCell>
                          <ChangeLogsCell 
                            creativeId={creative.id}
                            logs={creative.change_logs || []}
                            userId={user?.id || ''}
                            onUpdate={refetch}
                          />
                        </TableCell>
                        <TableCell>
                          <ApprovalCell 
                            creativeId={creative.id}
                            approvedDate={creative.approved_date}
                            currentStatus={creative.production_status}
                            onUpdate={refetch}
                          />
                        </TableCell>
                        <TableCell>
                          <PieceLinkCell 
                            creativeId={creative.id}
                            link={creative.piece_link}
                            onUpdate={refetch}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {creative.media_line?.subdivision?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {creative.media_line?.moment?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {creative.media_line?.funnel_stage_ref?.name || 
                           (creative.media_line?.funnel_stage === 'top' ? 'Topo' : 
                            creative.media_line?.funnel_stage === 'middle' ? 'Meio' : 
                            creative.media_line?.funnel_stage === 'bottom' ? 'Fundo' : '—')}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {creative.media_line?.line_code || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {creative.media_line?.medium?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {creative.media_line?.vehicle?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {creative.media_line?.channel?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {creative.media_line?.target?.name || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {creative.format?.name ? (
                            <Badge variant="secondary" className="text-xs">{creative.format.name}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <span className="text-xs line-clamp-2">
                            {creative.copy_text || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {creative.notes || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <SpecificationsCell formatDetails={creative.format_details} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {creatives && creatives.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{creatives.length}</div>
                <p className="text-xs text-muted-foreground">Total de Criativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {creatives.filter(c => c.production_status === 'aprovado').length}
                </div>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {creatives.filter(c => c.production_status === 'em_andamento').length}
                </div>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {creatives.filter(c => c.production_status === 'solicitado').length}
                </div>
                <p className="text-xs text-muted-foreground">Solicitados</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
