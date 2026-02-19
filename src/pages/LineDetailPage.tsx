import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Tv,
  Radio,
  Signpost,
  FileText,
  Link2,
  Grid3X3,
  ArrowLeft,
  MapPin,
  Calendar,
  TrendingUp,
  Target,
  Hash,
} from 'lucide-react';
import { useLineDetails, LineDetail } from '@/hooks/useLineDetails';
import { useLineDetailTypes, LineDetailType } from '@/hooks/useLineDetailTypes';
import { LineDetailTable } from '@/components/media-plan/LineDetailTable';
import { DetailBlockTable } from '@/components/media-plan/detail-blocks/DetailBlockTable';
import { LinkedLinesTab } from '@/components/media-plan/LinkedLinesTab';
import { type DetailCategory, detailTypeSchemas } from '@/utils/detailSchemas';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStatuses } from '@/hooks/useStatuses';
import { useFormats } from '@/hooks/useFormatsHierarchy';
import { LoadingPage } from '@/components/ui/loading-dots';

const ICON_MAP: Record<string, React.ElementType> = {
  tv: Tv,
  radio: Radio,
  signpost: Signpost,
  'file-text': FileText,
};

export default function LineDetailPage() {
  const { id: planSlug, lineId: mediaLineId } = useParams<{ id: string; lineId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch plan info from slug
  const { data: plan } = useQuery({
    queryKey: ['plan-for-detail-page', planSlug],
    queryFn: async () => {
      if (!planSlug) return null;
      const { data, error } = await supabase
        .from('media_plans')
        .select('id, name, slug, start_date, end_date')
        .or(`slug.eq.${planSlug},id.eq.${planSlug}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!planSlug,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch line info with relations
  const { data: line } = useQuery({
    queryKey: ['line-for-detail-page', mediaLineId],
    queryFn: async () => {
      if (!mediaLineId) return null;
      const { data, error } = await supabase
        .from('media_lines')
        .select(`
          id, line_code, platform, budget, start_date, end_date,
          vehicle_id, medium_id, channel_id, subdivision_id, moment_id, funnel_stage_id, target_id,
          vehicles(name), mediums(name), channels(name), plan_subdivisions(name), moments(name), funnel_stages(name), targets(name)
        `)
        .eq('id', mediaLineId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!mediaLineId,
    staleTime: 5 * 60 * 1000,
  });

  const planId = plan?.id;
  const startDate = line?.start_date || plan?.start_date;
  const endDate = line?.end_date || plan?.end_date;
  const lineBudget = (line?.budget as number) || 0;
  const lineCode = line?.line_code;
  const platform = line?.platform;
  const vehicleName = (line as any)?.vehicles?.name;
  const mediumName = (line as any)?.mediums?.name;
  const channelName = (line as any)?.channels?.name;
  const subdivisionName = (line as any)?.plan_subdivisions?.name;
  const momentName = (line as any)?.moments?.name;
  const funnelStageName = (line as any)?.funnel_stages?.name;
  const targetName = (line as any)?.targets?.name;

  const {
    details,
    isLoading,
    totalNet,
    createDetail,
    deleteDetail,
    createItem,
    updateItem,
    deleteItem,
    upsertInsertions,
  } = useLineDetails(mediaLineId, planId);

  const { types } = useLineDetailTypes();
  const { activeItems: statusOptions } = useStatuses();
  const formats = useFormats();
  const formatOptions = formats.activeItems;

  const [activeTab, setActiveTab] = useState<string>('');
  const [showNewDetailForm, setShowNewDetailForm] = useState(false);
  const [newDetailTypeId, setNewDetailTypeId] = useState<string>('');
  const [newDetailHasGrid, setNewDetailHasGrid] = useState(false);
  const [newMetadata, setNewMetadata] = useState<Record<string, unknown>>({});

  // Stable format IDs for query key
  const formatIdStr = useMemo(() => (formatOptions || []).map(f => f.id).sort().join(','), [formatOptions]);

  // Fetch format hierarchy details
  const { data: formatHierarchy } = useQuery({
    queryKey: ['format-hierarchy-details', formatIdStr],
    queryFn: async () => {
      if (!formatOptions || formatOptions.length === 0) return {};
      const formatIds = formatOptions.map(f => f.id);
      const { data: fcts, error } = await supabase
        .from('format_creative_types')
        .select(`id, name, format_id, creative_type_specifications (id, name, has_duration, duration_value, duration_unit)`)
        .in('format_id', formatIds)
        .is('deleted_at', null);
      if (error) throw error;

      const specIds = (fcts || []).flatMap(fct =>
        ((fct as any).creative_type_specifications || []).map((s: any) => s.id)
      );
      let dimMap: Record<string, string> = {};
      if (specIds.length > 0) {
        const { data: dims } = await supabase
          .from('specification_dimensions')
          .select('specification_id, width, height, unit')
          .in('specification_id', specIds)
          .is('deleted_at', null);
        (dims || []).forEach(d => {
          dimMap[d.specification_id] = `${d.width}x${d.height}${d.unit}`;
        });
      }

      const result: Record<string, { creative_type_name?: string; dimension?: string; duration?: string }> = {};
      (fcts || []).forEach((fct: any) => {
        const specs = fct.creative_type_specifications || [];
        const firstSpec = specs[0];
        const dim = firstSpec ? dimMap[firstSpec.id] : undefined;
        const dur = firstSpec?.has_duration && firstSpec?.duration_value
          ? `${firstSpec.duration_value}${firstSpec.duration_unit || 's'}`
          : undefined;
        result[fct.format_id] = { creative_type_name: fct.name, dimension: dim, duration: dur };
      });
      return result;
    },
    enabled: (formatOptions?.length || 0) > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch creatives
  const { data: lineCreatives = [] } = useQuery({
    queryKey: ['line-creatives-for-detail', mediaLineId],
    queryFn: async () => {
      if (!mediaLineId) return [];
      const { data, error } = await supabase
        .from('media_creatives')
        .select('id, creative_id, copy_text, name')
        .eq('media_line_id', mediaLineId)
        .order('created_at');
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        creative_id: c.creative_id || c.name,
        message: c.copy_text,
        copy_text: c.copy_text,
      }));
    },
    enabled: !!mediaLineId,
    staleTime: 5 * 60 * 1000,
  });
  const refetchCreatives = useCallback(() => {
    // Only used for manual refresh after creating a creative
    queryClient.invalidateQueries({ queryKey: ['line-creatives-for-detail', mediaLineId] });
  }, [mediaLineId]);

  // Fetch plan lines for linking
  const { data: planLines = [] } = useQuery({
    queryKey: ['plan-lines-for-linking', planId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from('media_lines')
        .select('id, line_code, platform, budget')
        .eq('media_plan_id', planId)
        .is('deleted_at', null)
        .order('line_code');
      if (error) throw error;
      return data || [];
    },
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });

  // Derive active detail type ID from current tab selection
  const activeDetailTypeId = useMemo(() => {
    if (!activeTab) return null;
    const d = details.find(det => det.id === activeTab);
    return d?.detail_type_id || null;
  }, [activeTab, details]);

  // Fetch sibling items from other lines in the same plan that use the same detail type
  const { data: siblingItems = [] } = useQuery({
    queryKey: ['sibling-detail-items', planId, activeDetailTypeId, mediaLineId],
    queryFn: async () => {
      if (!planId || !activeDetailTypeId || !mediaLineId) return [];

      // Find other line_details in this plan with the same type, from OTHER lines
      const { data: otherDetails } = await supabase
        .from('line_details')
        .select('id, media_line_id')
        .eq('media_plan_id', planId)
        .eq('detail_type_id', activeDetailTypeId)
        .neq('media_line_id', mediaLineId);

      if (!otherDetails?.length) return [];

      const otherDetailIds = otherDetails.map(d => d.id);
      const otherLineIds = [...new Set(otherDetails.map(d => d.media_line_id).filter(Boolean))] as string[];

      // Fetch items + line codes in parallel
      const [itemsRes, linesRes] = await Promise.all([
        supabase
          .from('line_detail_items')
          .select('*')
          .in('line_detail_id', otherDetailIds)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('media_lines')
          .select('id, line_code')
          .in('id', otherLineIds),
      ]);

      const lineCodeMap: Record<string, string> = {};
      (linesRes.data || []).forEach(l => { lineCodeMap[l.id] = l.line_code || '?'; });
      const detailLineMap: Record<string, string> = {};
      otherDetails.forEach(d => { if (d.media_line_id) detailLineMap[d.id] = d.media_line_id; });

      // Fetch insertions
      const itemIds = (itemsRes.data || []).map(i => i.id);
      let insertionsData: Array<{ line_detail_item_id: string; insertion_date: string; quantity: number }> = [];
      if (itemIds.length > 0) {
        const { data } = await supabase
          .from('line_detail_insertions')
          .select('line_detail_item_id, insertion_date, quantity')
          .in('line_detail_item_id', itemIds);
        insertionsData = (data || []) as typeof insertionsData;
      }

      return (itemsRes.data || []).map(item => {
        const lineId = detailLineMap[item.line_detail_id];
        const itemData = (typeof item.data === 'object' && item.data && !Array.isArray(item.data)
          ? item.data : {}) as Record<string, unknown>;
        return {
          id: item.id,
          data: itemData,
          total_insertions: item.total_insertions,
          days_of_week: item.days_of_week,
          period_start: item.period_start,
          period_end: item.period_end,
          format_id: item.format_id,
          creative_id: item.creative_id,
          status_id: item.status_id,
          sourceLineCode: lineCodeMap[lineId] || '?',
          readOnly: true as const,
          insertions: insertionsData
            .filter(ins => ins.line_detail_item_id === item.id)
            .map(ins => ({
              insertion_date: ins.insertion_date,
              quantity: ins.quantity || 0,
              line_detail_item_id: ins.line_detail_item_id,
            })),
        };
      });
    },
    enabled: !!planId && !!activeDetailTypeId && !!mediaLineId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (details.length > 0 && !activeTab) {
      setActiveTab(details[0].id);
    }
  }, [details, activeTab]);

  const budgetDifference = lineBudget - totalNet;
  const hasBudgetMismatch = Math.abs(budgetDifference) > 0.01;

  const currencyFormatter = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }), []);
  const formatCurrency = useCallback((value: number) => currencyFormatter.format(value), [currencyFormatter]);

  const inheritedContext = useMemo(() => ({
    vehicle_name: vehicleName,
    medium_name: mediumName,
    channel_name: channelName,
    subdivision_name: subdivisionName,
    moment_name: momentName,
    funnel_stage_name: funnelStageName,
    target_name: targetName,
    line_code: lineCode,
    line_budget: lineBudget,
  }), [vehicleName, mediumName, channelName, subdivisionName, momentName, funnelStageName, targetName, lineCode, lineBudget]);

  const BLOCK_CATEGORIES: DetailCategory[] = ['ooh', 'radio', 'tv'];
  const isBlockBasedType = (type: LineDetailType): boolean =>
    BLOCK_CATEGORIES.includes((type as any).detail_category as DetailCategory);
  const getDetailCategory = (detail: LineDetail): DetailCategory | null => {
    const dt = detail.detail_type;
    if (!dt) return null;
    const cat = (dt as any).detail_category as string;
    if (BLOCK_CATEGORIES.includes(cat as DetailCategory)) return cat as DetailCategory;
    return null;
  };

  const selectedType = types.find(t => t.id === newDetailTypeId);
  const activeDetail = details.find(d => d.id === activeTab);

  const getIcon = (iconName: string | null | undefined) => {
    return iconName ? ICON_MAP[iconName] || FileText : FileText;
  };

  const handleCreateDetail = useCallback(async () => {
    if (!newDetailTypeId) return;

    const autoName = selectedType?.name || 'Detalhamento';
    try {
      const metadata: Record<string, unknown> = {
        ...newMetadata,
        ...(selectedType && isBlockBasedType(selectedType) ? { has_insertion_grid: newDetailHasGrid } : {}),
      };
      const result = await createDetail({
        detail_type_id: newDetailTypeId,
        name: autoName,
        metadata,
        inherited_context: inheritedContext,
      });
      setShowNewDetailForm(false);
      setNewDetailTypeId('');
      setNewMetadata({});
      setActiveTab(result.id);
    } catch (error) {
      console.error('Error creating detail:', error);
    }
  }, [newDetailTypeId, selectedType, lineCode, newMetadata, newDetailHasGrid, createDetail, inheritedContext, details]);

  const handleDeleteDetail = useCallback(async (detailId: string) => {
    try {
      await deleteDetail(detailId);
      if (activeTab === detailId && details.length > 1) {
        const remaining = details.filter(d => d.id !== detailId);
        setActiveTab(remaining[0]?.id || '');
      }
    } catch (error) {
      console.error('Error deleting detail:', error);
    }
  }, [deleteDetail, activeTab, details]);

  // Inline context badges from line data
  const contextBadges = useMemo(() => [
    { label: 'Subdivisão', value: subdivisionName, icon: MapPin },
    { label: 'Momento', value: momentName, icon: Calendar },
    { label: 'Fase', value: funnelStageName, icon: TrendingUp },
    { label: 'Veículo', value: vehicleName, icon: Tv },
    { label: 'Meio', value: mediumName, icon: Radio },
    { label: 'Target', value: targetName, icon: Target },
  ].filter(b => b.value), [subdivisionName, momentName, funnelStageName, vehicleName, mediumName, targetName]);

  // Memoize stable props for DetailBlockTable
  const memoizedFormats = useMemo(() => (formatOptions || []).map(f => ({ id: f.id, name: f.name })), [formatOptions]);
  const memoizedStatuses = useMemo(() => (statusOptions || []).map(s => ({ id: s.id, name: s.name })), [statusOptions]);
  const memoizedFormatDetails = useMemo(() => formatHierarchy || {}, [formatHierarchy]);

  const handleFormatCreated = useCallback(() => formats.refetch(), [formats]);
  const handleCreativeCreated = useCallback(() => refetchCreatives(), [refetchCreatives]);

  if (!mediaLineId) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col -m-4 md:-m-6 lg:-m-8 h-[calc(100vh-3.5rem)] md:h-screen">
        {/* ── Compact Header ── */}
        <div className="border-b bg-card px-4 py-3 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(`/media-plans/${planSlug}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base font-semibold flex items-center gap-2">
                  Detalhamento da Linha
                  <Badge variant="outline" className="font-mono text-xs">
                    {lineCode || 'Sem código'}
                  </Badge>
                </h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span>{platform || 'Linha'} • Orçamento: {formatCurrency(lineBudget)}</span>
                  {contextBadges.map(b => {
                    const Icon = b.icon;
                    return (
                      <span key={b.label} className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {b.value}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Budget comparison */}
            <div className={cn(
              "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm shrink-0",
              hasBudgetMismatch ? "bg-destructive/10" : "bg-primary/10"
            )}>
              {hasBudgetMismatch && <AlertTriangle className="h-4 w-4 text-destructive" />}
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">Total Detalhado</div>
                <div className={cn(
                  "font-semibold text-sm",
                  hasBudgetMismatch ? "text-destructive" : "text-primary"
                )}>
                  {formatCurrency(totalNet)}
                </div>
              </div>
              {hasBudgetMismatch && (
                <div className="text-right border-l pl-3">
                  <div className="text-[10px] text-muted-foreground">Diferença</div>
                  <div className="font-semibold text-sm text-destructive">
                    {formatCurrency(budgetDifference)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Body fills remaining height ── */}
        <div className="flex-1 min-h-0 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingPage />
            </div>
          ) : details.length === 0 && !showNewDetailForm ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <FileText className="h-16 w-16 text-muted-foreground/50" />
              <div className="text-center">
                <h3 className="text-lg font-medium">Nenhum detalhamento</h3>
                <p className="text-muted-foreground">
                  Adicione um detalhamento para destrinchar esta linha de mídia
                </p>
              </div>
              <Button onClick={() => setShowNewDetailForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Detalhamento
              </Button>
            </div>
          ) : (
            <Tabs
              value={showNewDetailForm ? 'new' : activeTab}
              onValueChange={(v) => {
                if (v === 'new') {
                  setShowNewDetailForm(true);
                } else {
                  setShowNewDetailForm(false);
                  setActiveTab(v);
                }
              }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="border-b px-4 py-1.5 shrink-0 bg-muted/20">
                <TabsList className="h-auto gap-1 bg-transparent p-0">
                  {details.map((detail) => {
                    const Icon = getIcon(detail.detail_type?.icon);
                    return (
                      <TabsTrigger
                        key={detail.id}
                        value={detail.id}
                        className="data-[state=active]:bg-muted gap-2 px-3 py-1.5"
                      >
                        <Icon className="h-4 w-4" />
                        {detail.detail_type?.name || detail.name || 'Detalhamento'}
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {detail.items?.length || 0}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                  <TabsTrigger
                    value="new"
                    className="data-[state=active]:bg-muted gap-1 px-3 py-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Novo
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* New detail form */}
              {showNewDetailForm && (
                <TabsContent value="new" className="flex-1 p-6 m-0 overflow-auto">
                  <div className="max-w-lg space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Detalhamento</Label>
                      <Select value={newDetailTypeId} onValueChange={setNewDetailTypeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {types.map((type) => {
                            const Icon = getIcon(type.icon);
                            return (
                              <SelectItem key={type.id} value={type.id}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {type.name}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>


                    {selectedType && isBlockBasedType(selectedType) && (
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Grade de Inserções</p>
                            <p className="text-xs text-muted-foreground">
                              Habilitar calendário mensal para controle diário de inserções
                            </p>
                          </div>
                        </div>
                        <Switch checked={newDetailHasGrid} onCheckedChange={setNewDetailHasGrid} />
                      </div>
                    )}

                    {selectedType && !isBlockBasedType(selectedType) && selectedType.metadata_schema?.filter(field =>
                      !['praca', 'veiculo', 'meio', 'canal', 'formato'].includes(field.key.toLowerCase())
                    ).map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label}</Label>
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={String(newMetadata[field.key] || '')}
                          onChange={(e) => setNewMetadata(prev => ({
                            ...prev,
                            [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value
                          }))}
                          placeholder={field.label}
                        />
                      </div>
                    ))}

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleCreateDetail} disabled={!newDetailTypeId}>Criar Detalhamento</Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowNewDetailForm(false);
                          if (details.length > 0) setActiveTab(details[0].id);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Detail content – ONLY render the active detail to avoid heavy DOM */}
              {activeDetail && !showNewDetailForm && (
                <TabsContent
                  key={activeDetail.id}
                  value={activeDetail.id}
                  forceMount
                  className="flex-1 flex flex-col min-h-0 m-0"
                >
                  <ActiveDetailContent
                    detail={activeDetail}
                    getDetailCategory={getDetailCategory}
                    startDate={startDate}
                    endDate={endDate}
                    createItem={createItem}
                    updateItem={updateItem}
                    deleteItem={deleteItem}
                    upsertInsertions={upsertInsertions}
                    handleDeleteDetail={handleDeleteDetail}
                    formats={memoizedFormats}
                    statuses={memoizedStatuses}
                    creatives={lineCreatives}
                    formatDetails={memoizedFormatDetails}
                    mediaLineId={mediaLineId}
                    onFormatCreated={handleFormatCreated}
                    onCreativeCreated={handleCreativeCreated}
                    planLines={planLines}
                    siblingItems={siblingItems}
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * Extracted active detail content to its own memoized component.
 * This prevents the parent from re-creating inline closures and arrays on every render.
 */
const ActiveDetailContent = memo(function ActiveDetailContent({
  detail,
  getDetailCategory,
  startDate,
  endDate,
  createItem,
  updateItem,
  deleteItem,
  upsertInsertions,
  handleDeleteDetail,
  formats,
  statuses,
  creatives,
  formatDetails,
  mediaLineId,
  onFormatCreated,
  onCreativeCreated,
  planLines,
  siblingItems,
}: {
  detail: LineDetail;
  getDetailCategory: (d: LineDetail) => DetailCategory | null;
  startDate?: string | null;
  endDate?: string | null;
  createItem: (input: { line_detail_id: string; data: Record<string, unknown> }) => Promise<unknown>;
  updateItem: (input: { id: string; data: Record<string, unknown> }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  upsertInsertions: (input: { item_id: string; insertions: { date: string; quantity: number }[] }) => Promise<void>;
  handleDeleteDetail: (id: string) => Promise<void>;
  formats: Array<{ id: string; name: string }>;
  statuses: Array<{ id: string; name: string }>;
  creatives: Array<{ id: string; creative_id: string; message: string | null; copy_text?: string | null }>;
  formatDetails: Record<string, { creative_type_name?: string; dimension?: string; duration?: string }>;
  mediaLineId?: string;
  onFormatCreated: () => void;
  onCreativeCreated: () => void;
  planLines: Array<{ id: string; line_code: string | null; platform: string | null; budget: number | null }>;
  siblingItems: Array<{
    id: string;
    data: Record<string, unknown>;
    total_insertions?: number | null;
    days_of_week?: string[] | null;
    period_start?: string | null;
    period_end?: string | null;
    format_id?: string | null;
    creative_id?: string | null;
    status_id?: string | null;
    sourceLineCode: string;
    readOnly: true;
    insertions?: Array<{ insertion_date: string; quantity: number; line_detail_item_id: string }>;
  }>;
}) {
  const detailCategory = getDetailCategory(detail);

  // Memoize the items array to avoid recreating on every render
  const mappedItems = useMemo(() => {
    return (detail.items || []).map(item => ({
      id: item.id,
      data: item.data as Record<string, unknown>,
      total_insertions: item.total_insertions,
      days_of_week: (item as any).days_of_week,
      period_start: (item as any).period_start,
      period_end: (item as any).period_end,
      format_id: (item as any).format_id,
      creative_id: (item as any).creative_id,
      status_id: (item as any).status_id,
      insertions: item.insertions?.map(ins => ({
        insertion_date: ins.insertion_date,
        quantity: ins.quantity,
        line_detail_item_id: ins.line_detail_item_id,
      })),
    }));
  }, [detail.items]);

  // Merge current line items with sibling items from other lines
  const allItems = useMemo(() => {
    return [...mappedItems, ...siblingItems.map(si => ({
      id: si.id,
      data: si.data,
      total_insertions: si.total_insertions ?? undefined,
      days_of_week: si.days_of_week ?? undefined,
      period_start: si.period_start,
      period_end: si.period_end,
      format_id: si.format_id,
      creative_id: si.creative_id,
      status_id: si.status_id,
      sourceLineCode: si.sourceLineCode,
      readOnly: true as const,
      insertions: si.insertions,
    }))];
  }, [mappedItems, siblingItems]);

  const handleCreate = useCallback(
    (data: Record<string, unknown>) => createItem({ line_detail_id: detail.id, data }),
    [createItem, detail.id]
  );

  const handleUpdate = useCallback(
    async (id: string, data: Record<string, unknown>, extras?: Record<string, unknown>) => {
      const mergedData = { ...data, ...(extras || {}) };
      await updateItem({ id, data: mergedData as any });
    },
    [updateItem]
  );
  const handleSaveInsertions = useCallback(
    async (itemId: string, ins: { date: string; quantity: number }[]) => {
      await upsertInsertions({ item_id: itemId, insertions: ins });
    },
    [upsertInsertions]
  );

  const detailTotalNet = useMemo(
    () => (detail.items || []).reduce((sum, item) => sum + (item.total_net || 0), 0),
    [detail.items]
  );

  // Stable empty callback for insertion change (local state is managed in DetailBlockTable)
  const noopInsertionChange = useCallback(() => {}, []);

  return (
    <Tabs defaultValue="items" className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-1.5 border-b bg-muted/20 flex items-center justify-between shrink-0">
        <TabsList className="h-8">
          <TabsTrigger value="items" className="text-xs h-7">
            <FileText className="h-3 w-3 mr-1" />
            Itens
          </TabsTrigger>
          <TabsTrigger value="links" className="text-xs h-7">
            <Link2 className="h-3 w-3 mr-1" />
            Linhas Vinculadas
          </TabsTrigger>
        </TabsList>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-destructive hover:text-destructive text-xs"
          onClick={() => handleDeleteDetail(detail.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Excluir
        </Button>
      </div>

      <TabsContent value="items" className="flex-1 flex flex-col min-h-0 m-0 p-0">
        {detailCategory ? (
          <DetailBlockTable
            category={detailCategory}
            items={allItems}
            inheritedContext={detail.inherited_context}
            hasGrid={(detail.metadata as any)?.has_insertion_grid ?? detail.detail_type?.has_insertion_grid ?? false}
            planStartDate={startDate}
            planEndDate={endDate}
            onCreateItem={handleCreate}
            onUpdateItem={handleUpdate}
            onDeleteItem={deleteItem}
            onInsertionChange={noopInsertionChange}
            onSaveInsertions={handleSaveInsertions}
            formats={formats}
            statuses={statuses}
            creatives={creatives}
            formatDetails={formatDetails}
            mediaLineId={mediaLineId}
            onFormatCreated={onFormatCreated}
            onCreativeCreated={onCreativeCreated}
          />
        ) : (
          <LineDetailTable
            detail={detail}
            onCreateItem={handleCreate}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onUpdateInsertions={upsertInsertions}
            planStartDate={startDate}
            planEndDate={endDate}
          />
        )}
      </TabsContent>

      <TabsContent value="links" className="flex-1 overflow-auto m-0">
        <LinkedLinesTab
          detailId={detail.id}
          detailTotalNet={detailTotalNet}
          planLines={planLines}
        />
      </TabsContent>
    </Tabs>
  );
});
