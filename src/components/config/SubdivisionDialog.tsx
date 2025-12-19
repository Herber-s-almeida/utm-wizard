import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Detail {
  name: string;
  description: string;
}

interface SubdivisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string; details: Detail[] }) => void;
  existingNames?: string[];
  initialData?: { name: string; description: string; details: Detail[] };
  mode?: 'create' | 'edit';
}

export function SubdivisionDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create'
}: SubdivisionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState<Detail[]>([]);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setDetails(initialData?.details || []);
    }
  }, [open, initialData]);

  const handleAddDetail = () => {
    if (details.length >= 100) {
      toast.error('Limite máximo de 100 detalhamentos atingido');
      return;
    }
    setDetails([...details, { name: '', description: '' }]);
  };

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, field: 'name' | 'description', value: string) => {
    const newDetails = [...details];
    newDetails[index][field] = value;
    setDetails(newDetails);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome da subdivisão é obrigatório');
      return;
    }

    if (trimmedName.length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const isExisting = existingNames.some(
      n => n.toLowerCase() === normalizedName && n !== initialData?.name
    );
    
    if (isExisting) {
      toast.error('Já existe uma subdivisão com este nome');
      return;
    }

    // Validate details
    for (const detail of details) {
      if (detail.name.trim() && detail.name.trim().length > 25) {
        toast.error('Nome do detalhamento deve ter no máximo 25 caracteres');
        return;
      }
      if (detail.description.length > 180) {
        toast.error('Descrição do detalhamento deve ter no máximo 180 caracteres');
        return;
      }
    }

    onSave({
      name: trimmedName,
      description: description.slice(0, 180),
      details: details.filter(d => d.name.trim())
    });

    setName('');
    setDescription('');
    setDetails([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Criar nova subdivisão de plano' : 'Editar subdivisão de plano'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da subdivisão *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 25))}
              placeholder="Ex: Curitiba"
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
              rows={2}
            />
            <p className="text-xs text-muted-foreground">{description.length}/180 caracteres</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Detalhamentos (opcional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddDetail}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>

            {details.map((detail, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Input
                    value={detail.name}
                    onChange={(e) => handleDetailChange(index, 'name', e.target.value.slice(0, 25))}
                    placeholder="Nome do detalhamento"
                    maxLength={25}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDetail(index)}
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={detail.description}
                  onChange={(e) => handleDetailChange(index, 'description', e.target.value.slice(0, 180))}
                  placeholder="Descrição do detalhamento..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">{detail.description.length}/180 caracteres</p>
              </div>
            ))}

            {details.length > 0 && (
              <p className="text-xs text-muted-foreground">{details.length}/100 detalhamentos</p>
            )}
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
