import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface SegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description?: string }) => void;
  existingNames?: string[];
  initialData?: {
    name: string;
    description?: string;
  };
  mode?: 'create' | 'edit';
}

export function SegmentDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create'
}: SegmentDialogProps) {
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
      toast.error('Nome do segmento é obrigatório');
      return;
    }

    if (trimmedName.length > 35) {
      toast.error('Nome deve ter no máximo 35 caracteres');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const isExisting = existingNames.some(
      n => n.toLowerCase() === normalizedName && n !== initialData?.name?.toLowerCase()
    );
    
    if (isExisting) {
      toast.error('Já existe um segmento com este nome');
      return;
    }

    onSave({
      name: trimmedName,
      description: description.trim() || undefined
    });

    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Criar novo segmento' : 'Editar segmento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="segment-name">Nome do segmento *</Label>
            <Input
              id="segment-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 35))}
              placeholder="Ex: Remarketing"
              maxLength={35}
            />
            <p className="text-xs text-muted-foreground">{name.length}/35 caracteres</p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="segment-description">Descrição</Label>
            <Textarea
              id="segment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 180))}
              placeholder="Descrição do segmento (opcional)"
              maxLength={180}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{description.length}/180 caracteres</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
