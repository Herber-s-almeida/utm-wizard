import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useFormatCreativeTypes } from '@/hooks/useFormatsHierarchy';

interface CreativeTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatId: string;
  initialData?: {
    id?: string;
    name: string;
    formatId?: string;
  };
  mode?: 'create' | 'edit';
}

export function CreativeTypeDialog({
  open,
  onOpenChange,
  formatId,
  initialData,
  mode = 'create'
}: CreativeTypeDialogProps) {
  const [name, setName] = useState('');
  const { create, update } = useFormatCreativeTypes(formatId);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
    }
  }, [open, initialData]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome do tipo de criativo é obrigatório');
      return;
    }

    if (trimmedName.length > 100) {
      toast.error('Nome deve ter no máximo 100 caracteres');
      return;
    }

    try {
      if (mode === 'edit' && initialData?.id) {
        await update.mutateAsync({ id: initialData.id, name: trimmedName });
      } else {
        await create.mutateAsync({ formatId, name: trimmedName });
      }
      setName('');
      onOpenChange(false);
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Tipo de Criativo' : 'Editar Tipo de Criativo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Tipo de Criativo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder="Ex: Anúncio Search, OOH Lonado, Rádio Spot 30s"
              maxLength={100}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{name.length}/100 caracteres</p>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Tipos de criativo definem o comportamento criativo do formato.
            Após criar, adicione especificações técnicas (Copy, Dimensões, Extensões, etc).
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={handleSave}
            disabled={create.isPending || update.isPending}
          >
            {mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
