import { useState } from 'react';
import { Plus, Trash2, DollarSign, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PercentageInput } from './PercentageInput';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';

interface AllocationItem {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

interface ExistingItem {
  id: string;
  name: string;
}

type InputMode = 'percentage' | 'absolute';

interface BudgetAllocationTableProps {
  items: AllocationItem[];
  existingItems: ExistingItem[];
  totalBudget: number;
  onAdd: (item: AllocationItem) => void;
  onUpdate: (id: string, percentage: number) => void;
  onRemove: (id: string) => void;
  onCreate?: (name: string) => Promise<ExistingItem>;
  label: string;
  createLabel: string;
  maxItems?: number;
}

export function BudgetAllocationTable({
  items,
  existingItems,
  totalBudget,
  onAdd,
  onUpdate,
  onRemove,
  onCreate,
  label,
  createLabel,
  maxItems,
}: BudgetAllocationTableProps) {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('percentage');

  const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);
  const totalAmount = items.reduce((sum, item) => sum + (totalBudget * item.percentage) / 100, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;
  
  // Filter out "Geral" (system items with name "Geral") and already selected items
  const availableItems = existingItems.filter(
    e => !items.find(i => i.id === e.id) && e.name.toLowerCase() !== 'geral'
  );
  const canAddMore = maxItems === undefined || items.length < maxItems;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAddExisting = () => {
    if (!canAddMore) return;
    const item = existingItems.find(e => e.id === selectedItem);
    if (item) {
      onAdd({
        id: item.id,
        name: item.name,
        percentage: 0,
        amount: 0,
      });
      setSelectedItem('');
    }
  };

  const handleCreateNew = async () => {
    if (!onCreate || !newItemName.trim() || !canAddMore) return;
    setIsCreating(true);
    try {
      const newItem = await onCreate(newItemName.trim());
      onAdd({
        id: newItem.id,
        name: newItem.name,
        percentage: 0,
        amount: 0,
      });
      setNewItemName('');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePercentageChange = (id: string, percentage: number) => {
    onUpdate(id, percentage);
  };

  const handleAbsoluteChange = (id: string, absoluteValue: number) => {
    // Calculate percentage from absolute value
    const percentage = totalBudget > 0 ? (absoluteValue / totalBudget) * 100 : 0;
    onUpdate(id, Math.round(percentage * 100) / 100); // Round to 2 decimal places
  };

  const parseCurrencyInput = (value: string): number => {
    // Remove currency formatting and parse
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  return (
    <div className="space-y-4">
      {/* Limit message */}
      {maxItems !== undefined && (
        <p className="text-xs text-muted-foreground">
          {items.length} de {maxItems} {label.toLowerCase()}(s) adicionado(s)
        </p>
      )}

      {/* Add from existing */}
      {canAddMore && (
        <div className="flex gap-2">
          <Select value={selectedItem} onValueChange={setSelectedItem}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={`Selecione ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {availableItems.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  Nenhum disponível
                </SelectItem>
              ) : (
                availableItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={handleAddExisting}
            disabled={!selectedItem}
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Create new */}
      {onCreate && canAddMore && (
        <div className="flex gap-2">
          <Input
            placeholder={createLabel}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateNew();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleCreateNew}
            disabled={!newItemName.trim() || isCreating}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar
          </Button>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          {/* Mode Toggle */}
          <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/30 border-b">
            <span className="text-xs text-muted-foreground">Editar por:</span>
            <div className="flex items-center gap-1 bg-background rounded-md border p-1">
              <Toggle 
                size="sm"
                pressed={inputMode === 'percentage'}
                onPressedChange={() => setInputMode('percentage')}
                className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Editar por percentual"
              >
                <Percent className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">%</span>
              </Toggle>
              <Toggle 
                size="sm"
                pressed={inputMode === 'absolute'}
                onPressedChange={() => setInputMode('absolute')}
                className="h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Editar por valor"
              >
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">R$</span>
              </Toggle>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>{label}</TableHead>
                <TableHead className="w-32 text-right">%</TableHead>
                <TableHead className="w-40 text-right">Valor</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const itemAmount = (totalBudget * item.percentage) / 100;
                return (
                  <TableRow key={item.id} className="group">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {inputMode === 'percentage' ? (
                        <PercentageInput
                          value={item.percentage}
                          onChange={(value) => handlePercentageChange(item.id, value)}
                          className="w-24 ml-auto"
                        />
                      ) : (
                        <span className="text-muted-foreground font-mono">
                          {item.percentage.toFixed(2)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {inputMode === 'absolute' ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemAmount.toFixed(2)}
                          onChange={(e) => handleAbsoluteChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-32 ml-auto text-right font-mono"
                        />
                      ) : (
                        <span className="font-mono text-muted-foreground">
                          {formatCurrency(itemAmount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemove(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Total row */}
              <TableRow className="bg-muted/50 border-t-2">
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  isValid ? "text-success" : "text-destructive"
                )}>
                  {totalPercentage.toFixed(2)}%
                </TableCell>
                <TableCell className={cn(
                  "text-right font-semibold font-mono",
                  inputMode === 'absolute' && !isValid ? "text-destructive" : ""
                )}>
                  {formatCurrency(totalAmount)}
                  {inputMode === 'absolute' && Math.abs(totalAmount - totalBudget) > 0.01 && (
                    <span className="block text-xs text-muted-foreground">
                      Meta: {formatCurrency(totalBudget)}
                    </span>
                  )}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
          {!isValid && items.length > 0 && (
            <div className="p-3 border-t bg-destructive/10 text-destructive text-sm">
              {inputMode === 'percentage' 
                ? 'A soma dos percentuais deve ser exatamente 100%'
                : `A soma dos valores deve ser exatamente ${formatCurrency(totalBudget)}`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
