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
import { toSlug } from '@/utils/utmGenerator';
import { toast } from 'sonner';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description?: string; slug?: string; vehicle_id: string }) => void;
  onUpdate?: (data: { id: string; name: string; description?: string; slug?: string }) => void;
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
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (editingChannel) {
      setName(editingChannel.name);
      setDescription(editingChannel.description || '');
      setSlug(editingChannel.slug || '');
      setSlugManuallyEdited(!!editingChannel.slug);
    } else {
      setName('');
      setDescription('');
      setSlug('');
      setSlugManuallyEdited(false);
    }
  }, [editingChannel, open]);

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(toSlug(name));
    }
  }, [name, slugManuallyEdited]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const finalSlug = slug || toSlug(trimmedName);

    if (!trimmedName) {
      toast.error('Nome do canal é obrigatório');
      return;
    }

    // Validate slug format
    if (!finalSlug || !/^[a-z0-9-]+$/.test(finalSlug)) {
      toast.error('Slug inválido. Use apenas letras minúsculas, números e hífens.');
      return;
    }

    // Check for duplicate names
    const isDuplicate = existingNames.some(
      (n) => n.toLowerCase() === trimmedName.toLowerCase() && 
      (!editingChannel || n.toLowerCase() !== editingChannel.name.toLowerCase())
    );
    if (isDuplicate) {
      toast.error('Já existe um canal com este nome');
      return;
    }

    if (editingChannel && onUpdate) {
      onUpdate({
        id: editingChannel.id,
        name: trimmedName,
        description: description.trim() || undefined,
        slug: finalSlug,
      });
    } else {
      onSave({
        name: trimmedName,
        description: description.trim() || undefined,
        slug: finalSlug,
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
            <LabelWithTooltip htmlFor="channel-name" tooltip="Nome do tipo de anúncio. Ex: Search, Display, Video, Stories." required>
              Nome do Canal
            </LabelWithTooltip>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Search, Display, Video..."
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <LabelWithTooltip htmlFor="channel-slug" tooltip="Será usado como utm_medium nas URLs de rastreamento. Apenas letras minúsculas, números e hífens.">
              Medium Slug (utm_medium)
            </LabelWithTooltip>
            <Input
              id="channel-slug"
              value={slug}
              onChange={(e) => {
                setSlug(toSlug(e.target.value));
                setSlugManuallyEdited(true);
              }}
              placeholder="search"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Gerado automaticamente do nome, mas pode ser editado.
            </p>
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
