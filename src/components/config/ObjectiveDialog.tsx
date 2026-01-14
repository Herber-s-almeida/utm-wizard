import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';

interface ObjectiveDialogProps {
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

export function ObjectiveDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create'
}: ObjectiveDialogProps) {
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
      toast.error('Nome do objetivo é obrigatório');
      return;
    }

    if (trimmedName.length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const originalName = initialData?.name?.trim().toLowerCase();
    const isExisting = existingNames.some(
      n => n.trim().toLowerCase() === normalizedName && n.trim().toLowerCase() !== originalName
    );
    
    if (isExisting) {
      toast.error('Já existe um objetivo com este nome');
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 180) {
      toast.error('Descrição deve ter no máximo 180 caracteres');
      return;
    }

    onSave({
      name: trimmedName,
      description: trimmedDescription || undefined
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
            {mode === 'create' ? 'Criar novo objetivo' : 'Editar objetivo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <LabelWithTooltip 
              htmlFor="name" 
              tooltip="Nome curto do objetivo. Ex: Cliques, Impressões, Conversões, Leads."
              required
            >
              Nome do objetivo
            </LabelWithTooltip>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 25))}
              placeholder="Ex: Cliques"
              maxLength={25}
            />
            <p className="text-xs text-muted-foreground">{name.length}/25 caracteres</p>
          </div>

          <div className="space-y-2">
            <LabelWithTooltip 
              htmlFor="description" 
              tooltip="Descrição opcional explicando quando usar este objetivo."
            >
              Descrição
            </LabelWithTooltip>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 180))}
              placeholder="Ex: Use para campanhas focadas em tráfego para o site"
              rows={3}
              maxLength={180}
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
