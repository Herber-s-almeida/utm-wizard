import { useState, useMemo } from 'react';
import { FileSpreadsheet, ChevronDown, ExternalLink, AlertTriangle, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AnimatedCollapsible,
  AnimatedCollapsibleContent,
  AnimatedCollapsibleTrigger,
} from '@/components/ui/animated-collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { LineDetailDialog } from './LineDetailDialog';

interface DetailSummary {
  id: string;
  media_line_id: string;
  line_code: string | null;
  platform: string;
  line_budget: number;
  detail_type_name: string;
  detail_type_icon: string | null;
  detail_name: string | null;
  items_count: number;
  total_insertions: number;
  total_net: number;
}

interface LineDetailsSummaryCardProps {
  planId: string;
  lines: Array<{
    id: string;
    line_code: string | null;
    platform: string;
    budget: number | null;
    start_date?: string | null;
    end_date?: string | null;
  }>;
  onHide?: () => void;
}

export function LineDetailsSummaryCard({ planId, lines, onHide }: LineDetailsSummaryCardProps) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all details for lines in this plan
  const { data: detailsSummary, isLoading } = useQuery({
    queryKey: ['plan-details-summary', planId, lines.map(l => l.id)],
    queryFn: async () => {
      if (lines.length === 0) return [];

      const lineIds = lines.map(l => l.id);

      const { data: details, error } = await supabase
        .from('line_details')
        .select(`
          id,
          media_line_id,
          name,
          detail_type_id,
          line_detail_types!inner(name, icon)
        `)
        .in('media_line_id', lineIds);

      if (error) throw error;
      if (!details || details.length === 0) return [];

      // Fetch items for all details
      const detailIds = details.map(d => d.id);
      const { data: items, error: itemsError } = await supabase
        .from('line_detail_items')
        .select('id, line_detail_id, total_insertions, total_net')
        .in('line_detail_id', detailIds)
        .eq('is_active', true);

      if (itemsError) throw itemsError;

      // Build summary
      const summary: DetailSummary[] = details.map(detail => {
        const line = lines.find(l => l.id === detail.media_line_id);
        const detailItems = (items || []).filter(i => i.line_detail_id === detail.id);
        const detailType = detail.line_detail_types as unknown as { name: string; icon: string | null };

        return {
          id: detail.id,
          media_line_id: detail.media_line_id,
          line_code: line?.line_code || null,
          platform: line?.platform || 'Linha',
          line_budget: Number(line?.budget) || 0,
          detail_type_name: detailType?.name || 'Detalhamento',
          detail_type_icon: detailType?.icon || null,
          detail_name: detail.name,
          items_count: detailItems.length,
          total_insertions: detailItems.reduce((sum, i) => sum + (i.total_insertions || 0), 0),
          total_net: detailItems.reduce((sum, i) => sum + (i.total_net || 0), 0),
        };
      });

      return summary;
    },
    enabled: lines.length > 0,
  });

  // Group by type
  const groupedByType = useMemo(() => {
    if (!detailsSummary) return {};
    
    const grouped: Record<string, DetailSummary[]> = {};
    detailsSummary.forEach(detail => {
      if (!grouped[detail.detail_type_name]) {
        grouped[detail.detail_type_name] = [];
      }
      grouped[detail.detail_type_name].push(detail);
    });
    
    return grouped;
  }, [detailsSummary]);

  const totalDetails = detailsSummary?.length || 0;
  const totalItems = detailsSummary?.reduce((sum, d) => sum + d.items_count, 0) || 0;
  const totalNet = detailsSummary?.reduce((sum, d) => sum + d.total_net, 0) || 0;

  // Lines with budget mismatch
  const linesWithMismatch = useMemo(() => {
    if (!detailsSummary) return [];
    
    const lineDetails: Record<string, { budget: number; totalNet: number }> = {};
    
    detailsSummary.forEach(detail => {
      if (!lineDetails[detail.media_line_id]) {
        lineDetails[detail.media_line_id] = {
          budget: detail.line_budget,
          totalNet: 0,
        };
      }
      lineDetails[detail.media_line_id].totalNet += detail.total_net;
    });

    return Object.entries(lineDetails)
      .filter(([, data]) => Math.abs(data.budget - data.totalNet) > 0.01)
      .map(([lineId, data]) => ({
        lineId,
        difference: data.budget - data.totalNet,
      }));
  }, [detailsSummary]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleOpenDetail = (lineId: string) => {
    setSelectedLineId(lineId);
    setDialogOpen(true);
  };

  const selectedLine = lines.find(l => l.id === selectedLineId);

  if (totalDetails === 0 && !isLoading) {
    return null;
  }

  return (
    <>
      <AnimatedCollapsible defaultOpen={false} storageKey="line-details-summary" className="border rounded-lg overflow-hidden bg-card">
        <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors">
          <AnimatedCollapsibleTrigger asChild>
            <button className="flex-1 flex items-center gap-3 text-left">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Detalhamentos</h3>
                <Badge variant="secondary" className="text-xs">
                  {totalDetails} detalhamento{totalDetails !== 1 ? 's' : ''}
                </Badge>
                {linesWithMismatch.length > 0 && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {linesWithMismatch.length} divergência{linesWithMismatch.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {totalItems} itens • {formatCurrency(totalNet)} total
              </span>
            </button>
          </AnimatedCollapsibleTrigger>

          <div className="flex items-center gap-1">
            {onHide && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onHide();
                      }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Ocultar esta seção</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <AnimatedCollapsibleTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <motion.div
                  initial={false}
                  className="[[data-state=open]_&]:rotate-180 transition-transform duration-200"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </button>
            </AnimatedCollapsibleTrigger>
          </div>
        </div>

        <AnimatedCollapsibleContent>
          <div className="p-4 border-t">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedByType).map(([typeName, typeDetails]) => (
                  <div key={typeName} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{typeName}</h4>
                      <Badge variant="outline" className="text-xs">{typeDetails.length}</Badge>
                    </div>
                    
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium">Linha</th>
                            <th className="text-left px-3 py-2 font-medium">Detalhamento</th>
                            <th className="text-center px-3 py-2 font-medium">Itens</th>
                            <th className="text-center px-3 py-2 font-medium">Inserções</th>
                            <th className="text-right px-3 py-2 font-medium">Orç. Linha</th>
                            <th className="text-right px-3 py-2 font-medium">Total Det.</th>
                            <th className="text-center px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {typeDetails.map(detail => {
                            const diff = detail.line_budget - detail.total_net;
                            const hasMismatch = Math.abs(diff) > 0.01;
                            
                            return (
                              <tr key={detail.id} className="border-t hover:bg-muted/30">
                                <td className="px-3 py-2">
                                  <span className="font-mono text-xs">{detail.line_code || detail.platform}</span>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{detail.detail_name || '-'}</td>
                                <td className="px-3 py-2 text-center">{detail.items_count}</td>
                                <td className="px-3 py-2 text-center">{detail.total_insertions}</td>
                                <td className="px-3 py-2 text-right font-medium">{formatCurrency(detail.line_budget)}</td>
                                <td className={cn("px-3 py-2 text-right font-medium", hasMismatch && "text-destructive")}>
                                  {formatCurrency(detail.total_net)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {hasMismatch ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex"><AlertTriangle className="h-4 w-4 text-destructive" /></span>
                                        </TooltipTrigger>
                                        <TooltipContent>Diferença: {formatCurrency(diff)}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <Check className="h-4 w-4 text-primary mx-auto" />
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDetail(detail.media_line_id)}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-end gap-6 pt-2 border-t text-sm">
                  <div><span className="text-muted-foreground">Total itens:</span><span className="font-semibold ml-2">{totalItems}</span></div>
                  <div><span className="text-muted-foreground">Total detalhado:</span><span className="font-semibold ml-2">{formatCurrency(totalNet)}</span></div>
                </div>
              </div>
            )}
          </div>
        </AnimatedCollapsibleContent>
      </AnimatedCollapsible>

      {selectedLine && (
        <LineDetailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mediaLineId={selectedLine.id}
          startDate={selectedLine.start_date}
          endDate={selectedLine.end_date}
          lineBudget={Number(selectedLine.budget) || 0}
          lineCode={selectedLine.line_code || undefined}
          platform={selectedLine.platform}
        />
      )}
    </>
  );
}
