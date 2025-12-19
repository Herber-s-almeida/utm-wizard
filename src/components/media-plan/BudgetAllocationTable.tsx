import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
}: BudgetAllocationTableProps) {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;
  const availableItems = existingItems.filter(
    e => !items.find(i => i.id === e.id)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAddExisting = () => {
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
    if (!onCreate || !newItemName.trim()) return;
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

  return (
    <div className="space-y-4">
      {/* Add from existing */}
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

      {/* Create new */}
      {onCreate && (
        <div className="flex gap-2">
          <Input
            placeholder={createLabel}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{label}</TableHead>
                <TableHead className="w-32 text-right">%</TableHead>
                <TableHead className="w-40 text-right">Valor</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={item.percentage}
                      onChange={(e) => onUpdate(item.id, parseFloat(e.target.value) || 0)}
                      className="w-24 text-right ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency((totalBudget * item.percentage) / 100)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  isValid ? "text-success" : "text-destructive"
                )}>
                  {totalPercentage.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-semibold font-mono">
                  {formatCurrency((totalBudget * totalPercentage) / 100)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
          {!isValid && items.length > 0 && (
            <div className="p-3 border-t bg-destructive/10 text-destructive text-sm">
              A soma dos percentuais deve ser exatamente 100%
            </div>
          )}
        </div>
      )}
    </div>
  );
}