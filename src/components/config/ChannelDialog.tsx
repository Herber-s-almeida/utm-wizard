import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Channel } from '@/hooks/useConfigData';

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description?: string; vehicle_id: string }) => void;
  onUpdate?: (data: { id: string; name: string; description?: string }) => void;
  editingChannel?: Channel | null;
  vehicleId: string;
  vehicleName: string;
  existingNames?: string[];
}

export function ChannelDialog({
  open,
  onOpenChange,
  onSave,
  onUpdate,
  editingChannel,
  vehicleId,
  vehicleName,
  existingNames = [],
}: ChannelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingChannel) {
      setName(editingChannel.name);
      setDescription(editingChannel.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [editingChannel, open]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    // Check for duplicate names
    const isDuplicate = existingNames.some(
      (n) => n.toLowerCase() === name.trim().toLowerCase() && 
      (!editingChannel || n.toLowerCase() !== editingChannel.name.toLowerCase())
    );
    if (isDuplicate) {
      return;
    }

    if (editingChannel && onUpdate) {
      onUpdate({
        id: editingChannel.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } else {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        vehicle_id: vehicleId,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingChannel ? 'Editar Canal' : 'Criar Novo Canal'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Veículo: <span className="font-medium">{vehicleName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Nome do Canal *</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Search, Display, Video..."
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Descrição (opcional)</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do canal..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {editingChannel ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
