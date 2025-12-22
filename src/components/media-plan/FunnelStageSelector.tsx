import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface FunnelStageSelectorProps {
  existingItems: ExistingItem[];
  selectedItems: AllocationItem[];
  onAdd: (item: AllocationItem) => void;
  onCreate?: (name: string) => Promise<ExistingItem>;
  maxItems?: number;
}

export function FunnelStageSelector({
  existingItems,
  selectedItems,
  onAdd,
  onCreate,
  maxItems,
}: FunnelStageSelectorProps) {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const availableItems = existingItems.filter(
    e => !selectedItems.find(i => i.id === e.id)
  );
  const canAddMore = maxItems === undefined || selectedItems.length < maxItems;

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

  return (
    <div className="space-y-3">
      {/* Limit message */}
      {maxItems !== undefined && (
        <p className="text-xs text-muted-foreground">
          {selectedItems.length} de {maxItems} fase(s) adicionada(s)
        </p>
      )}

      {/* Add from existing */}
      {canAddMore && (
        <div className="flex gap-2">
          <Select value={selectedItem} onValueChange={setSelectedItem}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione uma fase do funil" />
            </SelectTrigger>
            <SelectContent>
              {availableItems.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  Nenhuma disponível
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
            placeholder="Criar nova fase do funil"
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
    </div>
  );
}
