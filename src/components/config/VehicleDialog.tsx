import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Medium } from '@/hooks/useConfigData';
import { toSlug } from '@/utils/utmGenerator';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';

interface Channel {
  name: string;
  description: string;
  slug: string;
  slugManuallyEdited?: boolean;
}

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string; medium_id: string; slug: string; channels: Channel[] }) => void;
  existingNames?: string[];
  initialData?: { name: string; description: string; medium_id?: string; slug?: string; channels: Channel[] };
  mode?: 'create' | 'edit';
  mediums: Medium[];
  onCreateMedium: (data: { name: string; description: string }) => Promise<Medium | undefined>;
}

export function VehicleDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create',
  mediums,
  onCreateMedium
}: VehicleDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [mediumId, setMediumId] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showNewMediumForm, setShowNewMediumForm] = useState(false);
  const [newMediumName, setNewMediumName] = useState('');
  const [newMediumDescription, setNewMediumDescription] = useState('');
  const [isCreatingMedium, setIsCreatingMedium] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setSlug(initialData?.slug || '');
      setSlugManuallyEdited(!!initialData?.slug);
      setMediumId(initialData?.medium_id || '');
      setChannels(initialData?.channels || []);
      setShowNewMediumForm(false);
      setNewMediumName('');
      setNewMediumDescription('');
    }
  }, [open, initialData]);

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(toSlug(name));
    }
  }, [name, slugManuallyEdited]);

  const handleAddChannel = () => {
    setChannels([...channels, { name: '', description: '', slug: '', slugManuallyEdited: false }]);
  };

  const handleRemoveChannel = (index: number) => {
    setChannels(channels.filter((_, i) => i !== index));
  };

  const handleChannelNameChange = (index: number, value: string) => {
    const newChannels = [...channels];
    newChannels[index].name = value;
    // Auto-generate slug if not manually edited
    if (!newChannels[index].slugManuallyEdited) {
      newChannels[index].slug = toSlug(value);
    }
    setChannels(newChannels);
  };

  const handleChannelSlugChange = (index: number, value: string) => {
    const newChannels = [...channels];
    newChannels[index].slug = toSlug(value);
    newChannels[index].slugManuallyEdited = true;
    setChannels(newChannels);
  };

  const handleChannelDescriptionChange = (index: number, value: string) => {
    const newChannels = [...channels];
    newChannels[index].description = value;
    setChannels(newChannels);
  };

  const handleCreateNewMedium = async () => {
    const trimmedName = newMediumName.trim();
    if (!trimmedName) {
      toast.error('Nome do meio é obrigatório');
      return;
    }

    const selectableMediums = mediums.filter(m => !m.deleted_at);
    const existingMedium = selectableMediums.find(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingMedium) {
      toast.error('Já existe um meio com este nome');
      return;
    }

    setIsCreatingMedium(true);
    try {
      const newMedium = await onCreateMedium({
        name: trimmedName,
        description: newMediumDescription.slice(0, 180)
      });
      
      if (newMedium) {
        setMediumId(newMedium.id);
        setShowNewMediumForm(false);
        setNewMediumName('');
        setNewMediumDescription('');
      }
    } finally {
      setIsCreatingMedium(false);
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const finalSlug = slug || toSlug(trimmedName);
    
    if (!mediumId) {
      toast.error('Selecione um meio');
      return;
    }

    if (!trimmedName) {
      toast.error('Nome do veículo é obrigatório');
      return;
    }

    if (trimmedName.length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }

    // Validate slug format
    if (!finalSlug || !/^[a-z0-9-]+$/.test(finalSlug)) {
      toast.error('Slug inválido. Use apenas letras minúsculas, números e hífens.');
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const originalName = initialData?.name?.toLowerCase();
    const isExisting = existingNames.some(
      n => n.toLowerCase() === normalizedName && n.toLowerCase() !== originalName
    );
    
    if (isExisting) {
      toast.error('Já existe um veículo com este nome');
      return;
    }

    onSave({
      name: trimmedName,
      description: description.slice(0, 180),
      medium_id: mediumId,
      slug: finalSlug,
      channels: channels.filter(c => c.name.trim())
    });

    setName('');
    setDescription('');
    setSlug('');
    setSlugManuallyEdited(false);
    setMediumId('');
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
          {/* Meio Selection - First and Required */}
          <div className="space-y-2">
            <LabelWithTooltip tooltip="Categoria principal a que este veículo pertence." required>
              Meio
            </LabelWithTooltip>
            {!showNewMediumForm ? (
              <div className="flex gap-2">
                <Select value={mediumId} onValueChange={setMediumId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um meio" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {mediums.filter(m => !m.deleted_at).map((medium) => (
                      <SelectItem key={medium.id} value={medium.id}>
                        {medium.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewMediumForm(true)}
                  className="whitespace-nowrap"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Criar novo meio
                </Button>
              </div>
            ) : (
              <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="newMediumName">Nome do meio *</Label>
                  <Input
                    id="newMediumName"
                    value={newMediumName}
                    onChange={(e) => setNewMediumName(e.target.value.slice(0, 25))}
                    placeholder="Ex: Digital"
                    maxLength={25}
                  />
                  <p className="text-xs text-muted-foreground">{newMediumName.length}/25 caracteres</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newMediumDescription">Descrição</Label>
                  <Textarea
                    id="newMediumDescription"
                    value={newMediumDescription}
                    onChange={(e) => setNewMediumDescription(e.target.value.slice(0, 180))}
                    placeholder="Descrição opcional..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewMediumForm(false);
                      setNewMediumName('');
                      setNewMediumDescription('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateNewMedium}
                    disabled={isCreatingMedium}
                  >
                    {isCreatingMedium ? 'Criando...' : 'Criar meio'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <LabelWithTooltip htmlFor="name" tooltip="Nome da plataforma. Máximo 25 caracteres." required>
              Nome do veículo
            </LabelWithTooltip>
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

          <div className="space-y-2">
            <LabelWithTooltip htmlFor="slug" tooltip="Será usado como utm_source nas URLs de rastreamento. Apenas letras minúsculas, números e hífens.">
              Source Slug (utm_source)
            </LabelWithTooltip>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(toSlug(e.target.value));
                setSlugManuallyEdited(true);
              }}
              placeholder="google-ads"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Gerado automaticamente do nome, mas pode ser editado.
            </p>
          </div>

          {mode === 'create' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <LabelWithTooltip tooltip="Canais são tipos de anúncio dentro do veículo. Ex: Search, Display, Video.">
                  Canais do veículo
                </LabelWithTooltip>
                <Button type="button" variant="outline" size="sm" onClick={handleAddChannel}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar canal
                </Button>
              </div>

              {channels.map((channel, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Input
                      value={channel.name}
                      onChange={(e) => handleChannelNameChange(index, e.target.value.slice(0, 25))}
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
                  <div className="space-y-1">
                    <Label className="text-xs">Medium Slug (utm_medium)</Label>
                    <Input
                      value={channel.slug}
                      onChange={(e) => handleChannelSlugChange(index, e.target.value)}
                      placeholder="search"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Textarea
                    value={channel.description}
                    onChange={(e) => handleChannelDescriptionChange(index, e.target.value.slice(0, 180))}
                    placeholder="Descrição do canal..."
                    rows={2}
                  />
                  {/* UTM Preview */}
                  {(slug || channel.slug) && (
                    <div className="p-2 bg-background rounded text-xs font-mono text-muted-foreground border">
                      <span className="text-foreground">utm_source=</span>{slug || 'vehicle-slug'}
                      <span className="text-foreground">&utm_medium=</span>{channel.slug || 'channel-slug'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Criar' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
