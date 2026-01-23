import { useState, useMemo } from 'react';
import { FileSpreadsheet, ChevronDown, ExternalLink, AlertTriangle, Check, X, Users, Link2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { LineDetailDialog } from './LineDetailDialog';
import { usePlanDetails, PlanDetail } from '@/hooks/usePlanDetails';

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

  const { 
    details, 
    detailsByType, 
    isLoading, 
    totalNet, 
    sharedDetailsCount 
  } = usePlanDetails(planId);

  const totalDetails = details.length;
  const totalItems = details.reduce((sum, d) => sum + d.items.length, 0);

  // Lines with budget mismatch (considering allocation)
  const linesWithMismatch = useMemo(() => {
    const lineAllocations: Record<string, { budget: number; allocated: number }> = {};
    
    details.forEach(detail => {
      detail.links.forEach(link => {
        if (!lineAllocations[link.media_line_id]) {
          lineAllocations[link.media_line_id] = {
            budget: link.media_line?.budget || 0,
            allocated: 0,
          };
        }
        const allocatedAmount = detail.total_net * (link.allocated_percentage / 100);
        lineAllocations[link.media_line_id].allocated += allocatedAmount;
      });
    });

    return Object.entries(lineAllocations)
      .filter(([, data]) => Math.abs(data.budget - data.allocated) > 0.01)
      .map(([lineId, data]) => ({
        lineId,
        difference: data.budget - data.allocated,
      }));
  }, [details]);

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
                {sharedDetailsCount > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Link2 className="h-3 w-3" />
                    {sharedDetailsCount} compartilhado{sharedDetailsCount !== 1 ? 's' : ''}
                  </Badge>
                )}
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
                {detailsByType.map((typeGroup) => (
                  <div key={typeGroup.typeId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{typeGroup.typeName}</h4>
                      <Badge variant="outline" className="text-xs">{typeGroup.details.length}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatCurrency(typeGroup.totalNet)}
                      </span>
                    </div>
                    
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium">Detalhamento</th>
                            <th className="text-left px-3 py-2 font-medium">Linhas</th>
                            <th className="text-center px-3 py-2 font-medium">Itens</th>
                            <th className="text-center px-3 py-2 font-medium">Inserções</th>
                            <th className="text-right px-3 py-2 font-medium">Total</th>
                            <th className="text-center px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {typeGroup.details.map((detail) => {
                            const primaryLink = detail.links.find(l => l.is_primary);
                            const hasAllocationError = detail.links.reduce(
                              (sum, l) => sum + (l.allocated_percentage || 0), 0
                            ) !== 100;

                            return (
                              <tr key={detail.id} className="border-t hover:bg-muted/30">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{detail.name || '-'}</span>
                                    {detail.is_shared && (
                                      <Badge variant="secondary" className="text-xs gap-1">
                                        <Users className="h-3 w-3" />
                                        Compartilhado
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    {detail.links.slice(0, 3).map((link, idx) => (
                                      <Badge 
                                        key={link.id} 
                                        variant={link.is_primary ? "default" : "outline"} 
                                        className="text-xs font-mono"
                                      >
                                        {link.media_line?.line_code || 'S/C'}
                                        {link.allocated_percentage < 100 && (
                                          <span className="ml-1 text-muted-foreground">
                                            {link.allocated_percentage}%
                                          </span>
                                        )}
                                      </Badge>
                                    ))}
                                    {detail.links.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{detail.links.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center">{detail.items.length}</td>
                                <td className="px-3 py-2 text-center">
                                  {detail.items.reduce((sum, i) => sum + (i.total_insertions || 0), 0)}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {formatCurrency(detail.total_net)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {hasAllocationError ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex">
                                            <AlertTriangle className="h-4 w-4 text-destructive" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>Alocação não soma 100%</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <Check className="h-4 w-4 text-primary mx-auto" />
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {primaryLink && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7" 
                                      onClick={() => handleOpenDetail(primaryLink.media_line_id)}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
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
                  <div>
                    <span className="text-muted-foreground">Total itens:</span>
                    <span className="font-semibold ml-2">{totalItems}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total detalhado:</span>
                    <span className="font-semibold ml-2">{formatCurrency(totalNet)}</span>
                  </div>
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
          planId={planId}
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
