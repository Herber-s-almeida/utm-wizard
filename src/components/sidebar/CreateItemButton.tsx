import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CreateItemButtonProps {
  onCreate: (name: string) => void;
  placeholder?: string;
  className?: string;
}

export function CreateItemButton({ onCreate, placeholder = 'Nome...', className }: CreateItemButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [value, setValue] = useState('');

  const handleCreate = () => {
    if (value.trim()) {
      onCreate(value.trim());
      setValue('');
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setValue('');
    setIsCreating(false);
  };

  if (isCreating) {
    return (
      <div className={cn("flex items-center gap-1 py-1 px-2", className)}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-7 text-xs flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCreate}>
          <Check className="h-3 w-3 text-success" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("w-full justify-start gap-2 h-7 text-xs text-primary hover:text-primary", className)}
      onClick={() => setIsCreating(true)}
    >
      <Plus className="h-3 w-3" />
      Criar novo
    </Button>
  );
}
