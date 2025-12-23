import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface FormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  existingNames?: string[];
  initialData?: {
    id?: string;
    name: string;
  };
  mode?: 'create' | 'edit';
}

export function FormatDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create'
}: FormatDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
    }
  }, [open, initialData]);

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome do formato é obrigatório');
      return;
    }

    if (trimmedName.length > 50) {
      toast.error('Nome deve ter no máximo 50 caracteres');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const isExisting = existingNames.some(
      n => n.toLowerCase() === normalizedName && n !== initialData?.name?.toLowerCase()
    );
    
    if (isExisting) {
      toast.error('Já existe um formato com este nome');
      return;
    }

    onSave(trimmedName);
    setName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Formato' : 'Editar Formato'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Formato *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="Ex: Display, Vídeo, Áudio, Social Feed"
              maxLength={50}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{name.length}/50 caracteres</p>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Formatos representam o conceito geral do criativo (ex: Display, Vídeo, Áudio).
            Após criar o formato, adicione Tipos de Criativo e suas Especificações.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Criar' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
