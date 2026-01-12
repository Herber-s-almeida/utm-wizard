import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string; visible_for_media_plans: boolean }) => void;
  existingNames?: string[];
  initialData?: { name: string; description?: string | null; visible_for_media_plans?: boolean | null };
  mode?: 'create' | 'edit';
}

export function ClientDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create',
}: ClientDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibleForMediaPlans, setVisibleForMediaPlans] = useState(true);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setVisibleForMediaPlans(initialData?.visible_for_media_plans ?? true);
    }
  }, [open, initialData]);

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (trimmedName.length > 180) {
      toast.error('Nome deve ter no máximo 180 caracteres');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const isExisting = existingNames.some(
      n => n.toLowerCase() === normalizedName && n !== initialData?.name?.toLowerCase()
    );
    
    if (isExisting) {
      toast.error('Já existe um cliente com este nome');
      return;
    }

    onSave({
      name: trimmedName,
      description: description.slice(0, 180),
      visible_for_media_plans: visibleForMediaPlans,
    });

    setName('');
    setDescription('');
    setVisibleForMediaPlans(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Criar novo cliente' : 'Editar cliente'}</DialogTitle>
          <DialogDescription className="text-xs">
            Configure as informações do cliente e sua visibilidade nos módulos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do cliente *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 180))}
              placeholder="Ex: ACME Corp"
              maxLength={180}
            />
            <p className="text-xs text-muted-foreground">{name.length}/180 caracteres</p>
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

          <div className="border-t pt-4 mt-4">
            <Label className="text-sm font-medium mb-3 block">Visibilidade</Label>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="visible-media-plans"
                checked={visibleForMediaPlans}
                onCheckedChange={(checked) => setVisibleForMediaPlans(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="visible-media-plans"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Planos de Mídia
                </label>
                <p className="text-xs text-muted-foreground">
                  Quando ativado, este cliente aparecerá disponível para seleção ao criar planos de mídia.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              O módulo Financeiro sempre exibe todos os clientes, independente desta configuração.
            </p>
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
