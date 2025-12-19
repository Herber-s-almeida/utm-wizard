import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Location {
  city: string;
  state: string;
  radius: string;
  radiusUnit: 'km' | 'miles';
}

const BEHAVIOR_OPTIONS = [
  'remarketing',
  'comportamento',
  'bases proprietárias',
  'look a like',
  'site'
];

interface TargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    age_range: string;
    geolocation: Location[];
    behavior: string;
  }) => void;
  existingNames?: string[];
  initialData?: {
    name: string;
    age_range: string;
    geolocation: Location[];
    behavior: string;
  };
  mode?: 'create' | 'edit';
}

export function TargetDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create'
}: TargetDialogProps) {
  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [behavior, setBehavior] = useState('');
  const [customBehavior, setCustomBehavior] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setAgeRange(initialData?.age_range || '');
      setLocations(initialData?.geolocation || []);
      const behaviorValue = initialData?.behavior || '';
      if (BEHAVIOR_OPTIONS.includes(behaviorValue)) {
        setBehavior(behaviorValue);
        setCustomBehavior('');
      } else if (behaviorValue) {
        setBehavior('custom');
        setCustomBehavior(behaviorValue);
      } else {
        setBehavior('');
        setCustomBehavior('');
      }
    }
  }, [open, initialData]);

  const handleAddLocation = () => {
    if (locations.length >= 100) {
      toast.error('Limite máximo de 100 localizações atingido');
      return;
    }
    setLocations([...locations, { city: '', state: '', radius: '', radiusUnit: 'km' }]);
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleLocationChange = (index: number, field: keyof Location, value: string) => {
    const newLocations = [...locations];
    if (field === 'radius') {
      // Only allow integers up to 999
      const numValue = value.replace(/\D/g, '').slice(0, 3);
      newLocations[index][field] = numValue;
    } else {
      newLocations[index][field] = value as any;
    }
    setLocations(newLocations);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome da segmentação é obrigatório');
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
      toast.error('Já existe uma segmentação com este nome');
      return;
    }

    const finalBehavior = behavior === 'custom' ? customBehavior : behavior;

    onSave({
      name: trimmedName,
      age_range: ageRange,
      geolocation: locations.filter(l => l.city.trim() || l.state.trim()),
      behavior: finalBehavior
    });

    setName('');
    setAgeRange('');
    setLocations([]);
    setBehavior('');
    setCustomBehavior('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Criar nova segmentação' : 'Editar segmentação'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da segmentação *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 25))}
              placeholder="Ex: Jovens Urbanos"
              maxLength={25}
            />
            <p className="text-xs text-muted-foreground">{name.length}/25 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Idade</Label>
            <Input
              id="age"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              placeholder="Ex: 18-34"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Localização</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLocation}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar localização
              </Button>
            </div>

            {locations.map((location, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={location.city}
                    onChange={(e) => handleLocationChange(index, 'city', e.target.value)}
                    placeholder="Cidade"
                  />
                  <Input
                    value={location.state}
                    onChange={(e) => handleLocationChange(index, 'state', e.target.value)}
                    placeholder="Estado"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={location.radius}
                    onChange={(e) => handleLocationChange(index, 'radius', e.target.value)}
                    placeholder="Raio"
                    className="w-20"
                    maxLength={3}
                  />
                  <Select
                    value={location.radiusUnit}
                    onValueChange={(value) => handleLocationChange(index, 'radiusUnit', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">km</SelectItem>
                      <SelectItem value="miles">milhas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLocation(index)}
                    className="h-8 w-8 text-destructive ml-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {locations.length > 0 && (
              <p className="text-xs text-muted-foreground">{locations.length}/100 localizações</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Comportamento / Segmentação</Label>
            <Select value={behavior} onValueChange={setBehavior}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de segmentação" />
              </SelectTrigger>
              <SelectContent>
                {BEHAVIOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Outro (personalizado)</SelectItem>
              </SelectContent>
            </Select>
            {behavior === 'custom' && (
              <Textarea
                value={customBehavior}
                onChange={(e) => setCustomBehavior(e.target.value)}
                placeholder="Descreva a segmentação personalizada..."
                rows={2}
              />
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
