import { useState, useMemo, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Users,
  Grid3X3,
} from 'lucide-react';
import { useLineDetails, LineDetail } from '@/hooks/useLineDetails';
import { useLineDetailTypes, LineDetailType } from '@/hooks/useLineDetailTypes';
import { useLineDetailLinks } from '@/hooks/useLineDetailLinks';
import { LineDetailTable } from './LineDetailTable';
import { DetailBlockTable } from './detail-blocks/DetailBlockTable';
import { LinkedLinesTab } from './LinkedLinesTab';
import { InheritedContextHeader } from './InheritedContextHeader';
import { type DetailCategory, detailTypeSchemas } from '@/utils/detailSchemas';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useStatuses } from '@/hooks/useStatuses';
import { useFormats } from '@/hooks/useFormatsHierarchy';

const ICON_MAP: Record<string, React.ElementType> = {
  tv: Tv,
  radio: Radio,
  signpost: Signpost,
  'file-text': FileText,
};

export interface LineDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaLineId: string;
  planId?: string;
  startDate?: string | null;
  endDate?: string | null;
  lineBudget?: number;
  lineCode?: string;
  platform?: string;
  // Additional context for inheritance
  vehicleName?: string;
  mediumName?: string;
  channelName?: string;
  subdivisionName?: string;
  momentName?: string;
  funnelStageName?: string;
  formatName?: string;
}

export function LineDetailDialog({ 
  open, 
  onOpenChange, 
  mediaLineId,
  planId,
  startDate,
  endDate,
  lineBudget = 0,
  lineCode,
  platform,
  vehicleName,
  mediumName,
  channelName,
  subdivisionName,
  momentName,
  funnelStageName,
  formatName,
}: LineDetailDialogProps) {
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

  // Fetch format hierarchy details for enrichment (creative_type, dimension, duration)
  const { data: formatHierarchy } = useQuery({
    queryKey: ['format-hierarchy-details', formatOptions?.map(f => f.id)],
    queryFn: async () => {
      if (!formatOptions || formatOptions.length === 0) return {};
      const formatIds = formatOptions.map(f => f.id);
      
      // Fetch format_creative_types with specifications
      const { data: fcts, error } = await supabase
        .from('format_creative_types')
        .select(`
          id, name, format_id,
          creative_type_specifications (
            id, name, has_duration, duration_value, duration_unit
          )
        `)
        .in('format_id', formatIds)
        .is('deleted_at', null);
      
      if (error) throw error;

      // Also fetch dimensions for specs
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

      // Build map: formatId -> { creative_type_name, dimension, duration }
      const result: Record<string, { creative_type_name?: string; dimension?: string; duration?: string }> = {};
      (fcts || []).forEach((fct: any) => {
        const specs = fct.creative_type_specifications || [];
        const firstSpec = specs[0];
        const dim = firstSpec ? dimMap[firstSpec.id] : undefined;
        const dur = firstSpec?.has_duration && firstSpec?.duration_value
          ? `${firstSpec.duration_value}${firstSpec.duration_unit || 's'}`
          : undefined;
        
        result[fct.format_id] = {
          creative_type_name: fct.name,
          dimension: dim,
          duration: dur,
        };
      });
      
      return result;
    },
    enabled: (formatOptions?.length || 0) > 0 && open,
  });

  // Fetch creatives for the media line
  const { data: lineCreatives = [], refetch: refetchCreatives } = useQuery({
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
    enabled: !!mediaLineId && open,
  });

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
    enabled: !!planId && open,
  });

  // Set first tab as active when details load
  useEffect(() => {
    if (details.length > 0 && !activeTab) {
      setActiveTab(details[0].id);
    }
  }, [details, activeTab]);

  const budgetDifference = lineBudget - totalNet;
  const hasBudgetMismatch = Math.abs(budgetDifference) > 0.01;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Build inherited context from props
  const buildInheritedContext = (): Record<string, unknown> => {
    return {
      vehicle_name: vehicleName,
      medium_name: mediumName,
      channel_name: channelName,
      subdivision_name: subdivisionName,
      moment_name: momentName,
      funnel_stage_name: funnelStageName,
      format_name: formatName,
    };
  };

  const handleCreateDetail = async () => {
    if (!newDetailTypeId) return;
    
    // Auto-generate name from type + line code
    const autoName = selectedType 
      ? `${selectedType.name}${lineCode ? ` - ${lineCode}` : ''}`
      : undefined;
    
    try {
      const result = await createDetail({
        detail_type_id: newDetailTypeId,
        name: autoName,
        metadata: newMetadata,
        inherited_context: buildInheritedContext(),
      });
      
      setShowNewDetailForm(false);
      setNewDetailTypeId('');
      setNewMetadata({});
      setActiveTab(result.id);
    } catch (error) {
      console.error('Error creating detail:', error);
    }
  };

  const handleDeleteDetail = async (detailId: string) => {
    try {
      await deleteDetail(detailId);
      if (activeTab === detailId && details.length > 1) {
        const remaining = details.filter(d => d.id !== detailId);
        setActiveTab(remaining[0]?.id || '');
      }
    } catch (error) {
      console.error('Error deleting detail:', error);
    }
  };

  const selectedType = types.find(t => t.id === newDetailTypeId);
  const activeDetail = details.find(d => d.id === activeTab);

  // Check if a detail type is block-based (OOH/Radio/TV)
  const BLOCK_CATEGORIES: DetailCategory[] = ['ooh', 'radio', 'tv'];
  const isBlockBasedType = (type: LineDetailType): boolean => {
    return BLOCK_CATEGORIES.includes((type as any).detail_category as DetailCategory);
  };
  const getDetailCategory = (detail: LineDetail): DetailCategory | null => {
    const dt = detail.detail_type;
    if (!dt) return null;
    const cat = (dt as any).detail_category as string;
    if (BLOCK_CATEGORIES.includes(cat as DetailCategory)) return cat as DetailCategory;
    return null;
  };

  const getIcon = (iconName: string | null | undefined) => {
    const Icon = iconName ? ICON_MAP[iconName] || FileText : FileText;
    return Icon;
  };

  // Check if active detail is shared
  const isDetailShared = (detail: LineDetail) => {
    // This will be checked via the links count
    return false; // Will be updated with actual link count
  };

  if (!mediaLineId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Detalhamento da Linha
                <Badge variant="outline" className="font-mono">
                  {lineCode || 'Sem código'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {platform || 'Linha'} • Orçamento: {formatCurrency(lineBudget)}
              </DialogDescription>
            </div>
            
            {/* Budget comparison */}
            <div className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg",
              hasBudgetMismatch ? "bg-destructive/10" : "bg-primary/10"
            )}>
              {hasBudgetMismatch && <AlertTriangle className="h-4 w-4 text-destructive" />}
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total Detalhado</div>
                <div className={cn(
                  "font-semibold",
                  hasBudgetMismatch ? "text-destructive" : "text-primary"
                )}>
                  {formatCurrency(totalNet)}
                </div>
              </div>
              {hasBudgetMismatch && (
                <div className="text-right border-l pl-3">
                  <div className="text-xs text-muted-foreground">Diferença</div>
                  <div className="font-semibold text-destructive">
                    {formatCurrency(budgetDifference)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
                } else if (v === 'links') {
                  // Links tab - do nothing special
                } else {
                  setShowNewDetailForm(false);
                  setActiveTab(v);
                }
              }}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="border-b px-6 py-2 shrink-0">
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
                        {detail.name || detail.detail_type?.name || 'Detalhamento'}
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
                <TabsContent value="new" className="flex-1 p-6 m-0">
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

                    {/* Auto-generated name preview */}
                    {selectedType && lineCode && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-xs text-muted-foreground mb-1">Nome do detalhamento:</p>
                        <p className="font-medium text-sm">
                          {selectedType.name} - {lineCode}
                        </p>
                      </div>
                    )}

                    {/* Inherited context preview - always show when creating */}
                    <div className="p-4 bg-muted/50 rounded-lg border border-dashed space-y-3">
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        Contexto herdado automaticamente da linha:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {vehicleName && (
                          <Badge variant="secondary" className="gap-1">
                            <Tv className="h-3 w-3" />
                            {vehicleName}
                          </Badge>
                        )}
                        {mediumName && (
                          <Badge variant="secondary" className="gap-1">
                            <Radio className="h-3 w-3" />
                            {mediumName}
                          </Badge>
                        )}
                        {channelName && (
                          <Badge variant="outline">{channelName}</Badge>
                        )}
                        {subdivisionName && (
                          <Badge variant="outline">{subdivisionName}</Badge>
                        )}
                        {momentName && (
                          <Badge variant="outline">{momentName}</Badge>
                        )}
                        {funnelStageName && (
                          <Badge variant="outline">{funnelStageName}</Badge>
                        )}
                        {formatName && (
                          <Badge variant="outline">{formatName}</Badge>
                        )}
                        {!vehicleName && !mediumName && !subdivisionName && (
                          <span className="text-xs text-muted-foreground italic">
                            Nenhum contexto disponível na linha
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Estes campos são exibidos como referência e não precisam ser preenchidos novamente.
                      </p>
                    </div>

                    {/* Grid toggle for block-based types */}
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
                        <Switch
                          checked={newDetailHasGrid}
                          onCheckedChange={setNewDetailHasGrid}
                        />
                      </div>
                    )}

                    {/* Metadata fields - only show non-redundant ones */}
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
                            [field.key]: field.type === 'number' 
                              ? Number(e.target.value) 
                              : e.target.value
                          }))}
                          placeholder={field.label}
                        />
                      </div>
                    ))}

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleCreateDetail} disabled={!newDetailTypeId}>
                        Criar Detalhamento
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowNewDetailForm(false);
                          if (details.length > 0) {
                            setActiveTab(details[0].id);
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Detail content */}
              {details.map((detail) => (
                <TabsContent 
                  key={detail.id} 
                  value={detail.id} 
                  className="flex-1 flex flex-col min-h-0 m-0"
                >
                  {/* Inherited Context Header */}
                  <InheritedContextHeader 
                    context={detail.inherited_context}
                  />

                  {/* Secondary tabs for items and links */}
                  <Tabs defaultValue="items" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 py-2 border-b bg-muted/30">
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

                      {/* Metadata header */}
                      {detail.metadata && Object.keys(detail.metadata as object).length > 0 && (
                        <div className="flex items-center gap-4 text-sm mt-2">
                          {Object.entries(detail.metadata as Record<string, unknown>).map(([key, value]) => {
                            const fieldDef = detail.detail_type?.metadata_schema?.find(f => f.key === key);
                            return (
                              <div key={key} className="flex items-center gap-1">
                                <span className="text-muted-foreground">{fieldDef?.label || key}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            );
                          })}
                          <div className="ml-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteDetail(detail.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <TabsContent value="items" className="flex-1 overflow-auto m-0">
                      {(() => {
                        const detailCategory = getDetailCategory(detail);
                        if (detailCategory) {
                          return (
                            <DetailBlockTable
                              category={detailCategory}
                              items={(detail.items || []).map(item => ({
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
                              }))}
                              inheritedContext={detail.inherited_context}
                              hasGrid={detail.detail_type?.has_insertion_grid ?? false}
                              planStartDate={startDate}
                              planEndDate={endDate}
                              onCreateItem={(data) => createItem({ line_detail_id: detail.id, data })}
                              onUpdateItem={async (id, data, extras) => {
                                await updateItem({ id, data: { ...data, ...extras } as any });
                              }}
                              onDeleteItem={deleteItem}
                              onInsertionChange={(itemId, date, qty) => {
                                // Local state managed inside DetailBlockTable/GridBlock
                              }}
                              onSaveInsertions={async (itemId, ins) => {
                                await upsertInsertions({ item_id: itemId, insertions: ins });
                              }}
                              formats={(formatOptions || []).map(f => ({ id: f.id, name: f.name }))}
                              statuses={(statusOptions || []).map(s => ({ id: s.id, name: s.name }))}
                              creatives={lineCreatives}
                              formatDetails={formatHierarchy || {}}
                              mediaLineId={mediaLineId}
                              onFormatCreated={() => formats.refetch()}
                              onCreativeCreated={() => refetchCreatives()}
                            />
                          );
                        }
                        return (
                          <LineDetailTable
                            detail={detail}
                            onCreateItem={(data) => createItem({ line_detail_id: detail.id, data })}
                            onUpdateItem={updateItem}
                            onDeleteItem={deleteItem}
                            onUpdateInsertions={upsertInsertions}
                            planStartDate={startDate}
                            planEndDate={endDate}
                          />
                        );
                      })()}
                    </TabsContent>

                    <TabsContent value="links" className="flex-1 overflow-auto m-0">
                      <LinkedLinesTab
                        detailId={detail.id}
                        detailTotalNet={
                          (detail.items || []).reduce((sum, item) => sum + (item.total_net || 0), 0)
                        }
                        planLines={planLines}
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
