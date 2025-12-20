import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface HierarchyItem {
  id: string;
  name: string;
  description?: string | null;
  amount?: number;
  percentage?: number;
}

interface HierarchyBlockSelectorProps {
  title: string;
  items: HierarchyItem[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onDeselect: (id: string) => void;
  onCreate?: (name: string) => Promise<HierarchyItem>;
  createPlaceholder?: string;
  showBudget?: boolean;
  totalBudget?: number;
  multiSelect?: boolean;
  allowCreate?: boolean;
  emptyMessage?: string;
}

export function HierarchyBlockSelector({
  title,
  items,
  selectedIds,
  onSelect,
  onDeselect,
  onCreate,
  createPlaceholder = 'Nome do novo item',
  showBudget = false,
  totalBudget = 0,
  multiSelect = true,
  allowCreate = true,
  emptyMessage = 'Nenhum item disponível',
}: HierarchyBlockSelectorProps) {
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleCreate = async () => {
    if (!onCreate || !newItemName.trim()) return;
    setIsCreating(true);
    try {
      const created = await onCreate(newItemName.trim());
      onSelect(created.id);
      setNewItemName('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onDeselect(id);
    } else {
      if (!multiSelect) {
        // Deselect all others first
        selectedIds.forEach(sid => onDeselect(sid));
      }
      onSelect(id);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-primary">{title}:</h3>
      
      {/* Grid of blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => {
            const isSelected = selectedIds.includes(item.id);
            const amount = item.amount ?? (item.percentage ? (totalBudget * item.percentage) / 100 : 0);
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleToggle(item.id)}
                className={cn(
                  "relative cursor-pointer rounded-xl border-2 p-5 transition-all duration-200",
                  "hover:shadow-md hover:border-primary/50",
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border bg-card hover:bg-muted/30"
                )}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </motion.div>
                )}
                
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground block">
                    {item.name}
                  </span>
                  
                  {showBudget && (
                    <>
                      <p className="font-display text-2xl font-bold text-foreground">
                        {formatCurrency(amount)}
                      </p>
                      {item.percentage !== undefined && (
                        <span className="text-sm text-primary font-medium">
                          {item.percentage.toFixed(1)}% do plano
                        </span>
                      )}
                    </>
                  )}
                  
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      ({item.description})
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Empty state */}
        {items.length === 0 && !allowCreate && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
      
      {/* Create new item */}
      {allowCreate && onCreate && (
        <div className="flex gap-2 mt-4">
          <Input
            placeholder={createPlaceholder}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleCreate}
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
