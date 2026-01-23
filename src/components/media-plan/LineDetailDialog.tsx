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
} from 'lucide-react';
import { useLineDetails, LineDetail } from '@/hooks/useLineDetails';
import { useLineDetailTypes, LineDetailType } from '@/hooks/useLineDetailTypes';
import { useLineDetailLinks } from '@/hooks/useLineDetailLinks';
import { LineDetailTable } from './LineDetailTable';
import { LinkedLinesTab } from './LinkedLinesTab';
import { InheritedContextHeader } from './InheritedContextHeader';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
  
  const [activeTab, setActiveTab] = useState<string>('');
  const [showNewDetailForm, setShowNewDetailForm] = useState(false);
  const [newDetailTypeId, setNewDetailTypeId] = useState<string>('');
  const [newDetailName, setNewDetailName] = useState('');
  const [newMetadata, setNewMetadata] = useState<Record<string, unknown>>({});

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
    
    try {
      const result = await createDetail({
        detail_type_id: newDetailTypeId,
        name: newDetailName || undefined,
        metadata: newMetadata,
        inherited_context: buildInheritedContext(),
      });
      
      setShowNewDetailForm(false);
      setNewDetailTypeId('');
      setNewDetailName('');
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
                  <div className="max-w-md space-y-4">
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

                    <div className="space-y-2">
                      <Label>Nome (opcional)</Label>
                      <Input
                        value={newDetailName}
                        onChange={(e) => setNewDetailName(e.target.value)}
                        placeholder={selectedType?.name || 'Nome do detalhamento'}
                      />
                    </div>

                    {/* Metadata fields based on type */}
                    {selectedType?.metadata_schema?.map((field) => (
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

                    {/* Inherited context preview */}
                    {(vehicleName || mediumName || formatName) && (
                      <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">
                          Contexto herdado da linha:
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {vehicleName && <Badge variant="outline">{vehicleName}</Badge>}
                          {mediumName && <Badge variant="outline">{mediumName}</Badge>}
                          {channelName && <Badge variant="outline">{channelName}</Badge>}
                          {formatName && <Badge variant="outline">{formatName}</Badge>}
                          {subdivisionName && <Badge variant="outline">{subdivisionName}</Badge>}
                        </div>
                      </div>
                    )}

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
                      <LineDetailTable
                        detail={detail}
                        onCreateItem={(data) => createItem({ line_detail_id: detail.id, data })}
                        onUpdateItem={updateItem}
                        onDeleteItem={deleteItem}
                        onUpdateInsertions={upsertInsertions}
                        planStartDate={startDate}
                        planEndDate={endDate}
                      />
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
