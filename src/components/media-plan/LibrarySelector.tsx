import { useState } from 'react';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface ExistingItem {
  id: string;
  name: string;
}

interface LibrarySelectorProps {
  label: string;
  placeholder?: string;
  items: ExistingItem[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreate?: (name: string) => Promise<ExistingItem>;
  createLabel?: string;
  required?: boolean;
}

export function LibrarySelector({
  label,
  placeholder = 'Selecione...',
  items,
  value,
  onChange,
  onCreate,
  createLabel = 'Criar novo',
  required = false,
}: LibrarySelectorProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const selectedItem = items.find(item => item.id === value);

  const handleCreate = async () => {
    if (!onCreate || !newItemName.trim()) return;
    setIsCreating(true);
    try {
      const newItem = await onCreate(newItemName.trim());
      onChange(newItem.id);
      setNewItemName('');
      setOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedItem ? selectedItem.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
          <Command>
            <CommandInput placeholder={`Buscar ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>Nenhum encontrado.</CommandEmpty>
              <CommandGroup>
                {value && (
                  <CommandItem
                    value="_clear"
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    Limpar seleção
                  </CommandItem>
                )}
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.name}
                    onSelect={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {onCreate && (
              <div className="border-t p-2">
                <div className="flex gap-2">
                  <Input
                    placeholder={createLabel}
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
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newItemName.trim() || isCreating}
                    className="gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Criar
                  </Button>
                </div>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}