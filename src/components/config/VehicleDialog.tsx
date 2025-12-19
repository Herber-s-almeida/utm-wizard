import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Channel {
  name: string;
  description: string;
}

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string; channels: Channel[] }) => void;
  existingNames?: string[];
  initialData?: { name: string; description: string; channels: Channel[] };
  mode?: 'create' | 'edit';
}

export function VehicleDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create'
}: VehicleDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setChannels(initialData?.channels || []);
    }
  }, [open, initialData]);

  const handleAddChannel = () => {
    setChannels([...channels, { name: '', description: '' }]);
  };

  const handleRemoveChannel = (index: number) => {
    setChannels(channels.filter((_, i) => i !== index));
  };

  const handleChannelChange = (index: number, field: 'name' | 'description', value: string) => {
    const newChannels = [...channels];
    newChannels[index][field] = value;
    setChannels(newChannels);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome do veículo é obrigatório');
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
      toast.error('Já existe um veículo com este nome');
      return;
    }

    onSave({
      name: trimmedName,
      description: description.slice(0, 180),
      channels: channels.filter(c => c.name.trim())
    });

    setName('');
    setDescription('');
    setChannels([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Criar novo veículo' : 'Editar veículo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do veículo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 25))}
              placeholder="Ex: Google Ads"
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
              <Label>Canais do veículo</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddChannel}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar canal
              </Button>
            </div>

            {channels.map((channel, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Input
                    value={channel.name}
                    onChange={(e) => handleChannelChange(index, 'name', e.target.value.slice(0, 25))}
                    placeholder="Nome do canal"
                    maxLength={25}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveChannel(index)}
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={channel.description}
                  onChange={(e) => handleChannelChange(index, 'description', e.target.value.slice(0, 180))}
                  placeholder="Descrição do canal..."
                  rows={2}
                />
              </div>
            ))}
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
