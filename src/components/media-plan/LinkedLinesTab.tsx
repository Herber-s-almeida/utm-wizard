import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Star, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2,
  Link2,
} from 'lucide-react';
import { LineDetailLink, useLineDetailLinks } from '@/hooks/useLineDetailLinks';
import { cn } from '@/lib/utils';

interface LinkedLinesTabProps {
  detailId: string;
  detailTotalNet: number;
  planLines: Array<{
    id: string;
    line_code: string | null;
    platform: string | null;
    budget: number | null;
  }>;
}

export function LinkedLinesTab({ 
  detailId, 
  detailTotalNet,
  planLines,
}: LinkedLinesTabProps) {
  const { 
    links, 
    isLoading, 
    totalAllocatedPercentage,
    linkLine, 
    unlinkLine, 
    updateAllocation,
    setPrimary,
  } = useLineDetailLinks(detailId);

  const [isAddingLine, setIsAddingLine] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [newAllocation, setNewAllocation] = useState<number>(0);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [linkToUnlink, setLinkToUnlink] = useState<LineDetailLink | null>(null);

  const hasAllocationError = Math.abs(totalAllocatedPercentage - 100) > 0.01;

  // Lines that are not yet linked
  const availableLines = useMemo(() => {
    const linkedIds = new Set(links.map(l => l.media_line_id));
    return planLines.filter(line => !linkedIds.has(line.id));
  }, [planLines, links]);

  // Calculate suggested allocation for new line
  const suggestedAllocation = useMemo(() => {
    if (links.length === 0) return 100;
    const remaining = Math.max(0, 100 - totalAllocatedPercentage);
    return Math.round(remaining * 100) / 100;
  }, [links, totalAllocatedPercentage]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAddLine = async () => {
    if (!selectedLineId || newAllocation <= 0) return;

    await linkLine({
      lineId: selectedLineId,
      isPrimary: links.length === 0, // First link is primary
      allocatedPercentage: newAllocation,
    });

    setIsAddingLine(false);
    setSelectedLineId('');
    setNewAllocation(0);
  };

  const handleUnlink = async () => {
    if (!linkToUnlink) return;
    
    await unlinkLine(linkToUnlink.id);
    setUnlinkDialogOpen(false);
    setLinkToUnlink(null);
  };

  const handleAllocationChange = async (linkId: string, value: number) => {
    await updateAllocation({ linkId, allocatedPercentage: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Allocation Summary */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 rounded-lg",
        hasAllocationError ? "bg-destructive/10 border border-destructive/30" : "bg-primary/10"
      )}>
        <div className="flex items-center gap-3">
          {hasAllocationError ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          )}
          <div>
            <p className="font-medium">
              Alocação Total: {totalAllocatedPercentage.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {hasAllocationError 
                ? 'A soma das alocações deve ser exatamente 100%'
                : 'Distribuição correta do detalhamento'
              }
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total do Detalhamento</p>
          <p className="font-semibold">{formatCurrency(detailTotalNet)}</p>
        </div>
      </div>

      {/* Links Table */}
      {links.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Linha</TableHead>
                <TableHead className="text-right">Orçamento Linha</TableHead>
                <TableHead className="text-center w-[120px]">Alocação %</TableHead>
                <TableHead className="text-right">Valor Alocado</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const allocatedAmount = detailTotalNet * (link.allocated_percentage / 100);
                const lineBudget = link.media_line?.budget || 0;
                const budgetDiff = lineBudget - allocatedAmount;
                const hasBudgetIssue = Math.abs(budgetDiff) > 0.01 && allocatedAmount > lineBudget;

                return (
                  <TableRow key={link.id} className="group">
                    <TableCell className="text-center">
                      {link.is_primary ? (
                        <Star className="h-4 w-4 text-warning fill-warning mx-auto" />
                      ) : (
                        <button 
                          onClick={() => setPrimary(link.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Definir como linha primária"
                        >
                          <Star className="h-4 w-4 text-muted-foreground hover:text-warning mx-auto" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {link.media_line?.line_code || 'S/C'}
                        </span>
                        {link.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primária</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {link.media_line?.platform || 'Linha'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(lineBudget)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-20 h-8 text-center mx-auto"
                        value={link.allocated_percentage}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleAllocationChange(link.id, Math.min(100, Math.max(0, value)));
                        }}
                      />
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      hasBudgetIssue && "text-destructive"
                    )}>
                      {formatCurrency(allocatedAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasBudgetIssue ? (
                        <AlertTriangle className="h-4 w-4 text-destructive mx-auto" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
                      )}
                    </TableCell>
                    <TableCell>
                      {!link.is_primary && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setLinkToUnlink(link);
                            setUnlinkDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Link2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma linha vinculada a este detalhamento</p>
        </div>
      )}

      {/* Add Line Form */}
      {isAddingLine ? (
        <div className="flex items-end gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex-1 space-y-2">
            <Label>Linha</Label>
            <Select value={selectedLineId} onValueChange={setSelectedLineId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma linha..." />
              </SelectTrigger>
              <SelectContent>
                {availableLines.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    Todas as linhas já estão vinculadas
                  </div>
                ) : (
                  availableLines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      <span className="font-mono">{line.line_code || 'S/C'}</span>
                      <span className="text-muted-foreground ml-2">
                        - {line.platform} ({formatCurrency(line.budget || 0)})
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-2">
            <Label>Alocação %</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={newAllocation || suggestedAllocation}
              onChange={(e) => setNewAllocation(parseFloat(e.target.value) || 0)}
            />
          </div>
          <Button 
            onClick={handleAddLine}
            disabled={!selectedLineId || newAllocation <= 0}
          >
            Vincular
          </Button>
          <Button variant="outline" onClick={() => setIsAddingLine(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          onClick={() => {
            setNewAllocation(suggestedAllocation);
            setIsAddingLine(true);
          }}
          disabled={availableLines.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Vincular Linha
        </Button>
      )}

      {/* Unlink Dialog */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              A linha {linkToUnlink?.media_line?.line_code || ''} não receberá mais 
              alocação deste detalhamento. A alocação de {linkToUnlink?.allocated_percentage}% 
              será removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnlink}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
