import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface SimpleConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string }) => void;
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  existingNames?: string[];
  initialData?: { name: string; description: string };
  mode?: 'create' | 'edit';
}

export function SimpleConfigDialog({
  open,
  onOpenChange,
  onSave,
  title,
  nameLabel,
  namePlaceholder,
  existingNames = [],
  initialData,
  mode = 'create'
}: SimpleConfigDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
    }
  }, [open, initialData]);

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (trimmedName.length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const isExisting = existingNames.some(
      n => n.toLowerCase() === normalizedName && n !== initialData?.name?.toLowerCase()
    );
    
    if (isExisting) {
      toast.error('Já existe um item com este nome');
      return;
    }

    onSave({
      name: trimmedName,
      description: description.slice(0, 180)
    });

    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{nameLabel} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 25))}
              placeholder={namePlaceholder}
              maxLength={25}
            />
            <p className="text-xs text-muted-foreground">{name.length}/25 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 180))}
              placeholder="Descrição opcional..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{description.length}/180 caracteres</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Criar' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
