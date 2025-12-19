import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Upload, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Location {
  city: string;
  state: string;
  country: string;
  radius: string;
  radiusUnit: 'km' | 'miles';
}

const DEFAULT_SEGMENTATION_TYPES = [
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
  const [segmentationType, setSegmentationType] = useState('');
  const [customSegmentation, setCustomSegmentation] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  
  // Segmentation types management
  const [segmentationTypes, setSegmentationTypes] = useState<string[]>(DEFAULT_SEGMENTATION_TYPES);
  const [editingSegmentationType, setEditingSegmentationType] = useState<string | null>(null);
  const [editingSegmentationValue, setEditingSegmentationValue] = useState('');
  const [showNewSegmentationType, setShowNewSegmentationType] = useState(false);
  const [newSegmentationTypeName, setNewSegmentationTypeName] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setAgeRange(initialData?.age_range || '');
      setLocations(initialData?.geolocation || []);
      const behaviorValue = initialData?.behavior || '';
      if (segmentationTypes.includes(behaviorValue)) {
        setSegmentationType(behaviorValue);
        setCustomSegmentation('');
      } else if (behaviorValue) {
        setSegmentationType('custom');
        setCustomSegmentation(behaviorValue);
      } else {
        setSegmentationType('');
        setCustomSegmentation('');
      }
      setShowBulkImport(false);
      setBulkImportText('');
    }
  }, [open, initialData]);

  const handleAddLocation = () => {
    if (locations.length >= 100) {
      toast.error('Limite máximo de 100 localizações atingido');
      return;
    }
    setLocations([...locations, { city: '', state: '', country: '', radius: '', radiusUnit: 'km' }]);
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleLocationChange = (index: number, field: keyof Location, value: string) => {
    const newLocations = [...locations];
    if (field === 'radius') {
      const numValue = value.replace(/\D/g, '').slice(0, 3);
      newLocations[index][field] = numValue;
    } else {
      newLocations[index][field] = value as any;
    }
    setLocations(newLocations);
  };

  const handleBulkImport = () => {
    if (!bulkImportText.trim()) {
      toast.error('Cole as localizações no formato especificado');
      return;
    }

    const lines = bulkImportText.trim().split('\n');
    const newLocations: Location[] = [];
    
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 4) {
        const [city, state, country, radius, unit] = parts;
        const radiusUnit = unit?.toLowerCase() === 'miles' ? 'miles' : 'km';
        newLocations.push({
          city: city || '',
          state: state || '',
          country: country || '',
          radius: radius?.replace(/\D/g, '').slice(0, 3) || '',
          radiusUnit
        });
      }
    }

    if (newLocations.length === 0) {
      toast.error('Nenhuma localização válida encontrada. Use o formato: cidade,estado,país,raio,km');
      return;
    }

    if (locations.length + newLocations.length > 100) {
      toast.error('Limite máximo de 100 localizações seria excedido');
      return;
    }

    setLocations([...locations, ...newLocations]);
    setBulkImportText('');
    setShowBulkImport(false);
    toast.success(`${newLocations.length} localizações importadas`);
  };

  const handleAddSegmentationType = () => {
    const trimmedName = newSegmentationTypeName.trim();
    if (!trimmedName) return;
    if (trimmedName.length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }
    if (segmentationTypes.includes(trimmedName.toLowerCase())) {
      toast.error('Este tipo de segmentação já existe');
      return;
    }
    setSegmentationTypes([...segmentationTypes, trimmedName.toLowerCase()]);
    setNewSegmentationTypeName('');
    setShowNewSegmentationType(false);
    setSegmentationType(trimmedName.toLowerCase());
    toast.success('Tipo de segmentação adicionado');
  };

  const handleEditSegmentationType = (oldName: string) => {
    const trimmedName = editingSegmentationValue.trim();
    if (!trimmedName) return;
    if (trimmedName.length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }
    if (trimmedName.toLowerCase() !== oldName && segmentationTypes.includes(trimmedName.toLowerCase())) {
      toast.error('Este tipo de segmentação já existe');
      return;
    }
    const newTypes = segmentationTypes.map(t => t === oldName ? trimmedName.toLowerCase() : t);
    setSegmentationTypes(newTypes);
    if (segmentationType === oldName) {
      setSegmentationType(trimmedName.toLowerCase());
    }
    setEditingSegmentationType(null);
    setEditingSegmentationValue('');
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

    const finalBehavior = segmentationType === 'custom' ? customSegmentation : segmentationType;

    onSave({
      name: trimmedName,
      age_range: ageRange,
      geolocation: locations.filter(l => l.city.trim() || l.state.trim()),
      behavior: finalBehavior
    });

    setName('');
    setAgeRange('');
    setLocations([]);
    setSegmentationType('');
    setCustomSegmentation('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
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
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowBulkImport(!showBulkImport)}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Importar em massa
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLocation}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>

            {showBulkImport && (
              <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Cole uma localização por linha no formato: <strong>cidade,estado,país,raio,unidade</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Exemplo: curitiba,paraná,brasil,30,km
                </p>
                <Textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder="curitiba,paraná,brasil,30,km&#10;são paulo,são paulo,brasil,50,km"
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowBulkImport(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleBulkImport}>
                    Importar
                  </Button>
                </div>
              </div>
            )}

            {locations.map((location, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <div className="grid grid-cols-3 gap-2">
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
                  <Input
                    value={location.country}
                    onChange={(e) => handleLocationChange(index, 'country', e.target.value)}
                    placeholder="País"
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Segmentação</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => setShowNewSegmentationType(true)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Novo tipo
              </Button>
            </div>

            {showNewSegmentationType && (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                <Input
                  value={newSegmentationTypeName}
                  onChange={(e) => setNewSegmentationTypeName(e.target.value.slice(0, 25))}
                  placeholder="Nome do novo tipo"
                  maxLength={25}
                  className="flex-1 h-8 text-sm"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddSegmentationType}>
                  <Check className="h-3 w-3 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setShowNewSegmentationType(false); setNewSegmentationTypeName(''); }}>
                  <X className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            )}

            <div className="space-y-1">
              {segmentationTypes.map((type) => (
                <div 
                  key={type} 
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    segmentationType === type ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    if (editingSegmentationType !== type) {
                      setSegmentationType(type);
                    }
                  }}
                >
                  {editingSegmentationType === type ? (
                    <>
                      <Input
                        value={editingSegmentationValue}
                        onChange={(e) => setEditingSegmentationValue(e.target.value.slice(0, 25))}
                        maxLength={25}
                        className="flex-1 h-7 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6" 
                        onClick={(e) => { e.stopPropagation(); handleEditSegmentationType(type); }}
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6" 
                        onClick={(e) => { e.stopPropagation(); setEditingSegmentationType(null); }}
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm capitalize">{type}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingSegmentationType(type); 
                          setEditingSegmentationValue(type); 
                        }}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              
              <div 
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                  segmentationType === 'custom' ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                }`}
                onClick={() => setSegmentationType('custom')}
              >
                <span className="flex-1 text-sm">Outro (personalizado)</span>
              </div>
            </div>

            {segmentationType === 'custom' && (
              <Textarea
                value={customSegmentation}
                onChange={(e) => setCustomSegmentation(e.target.value)}
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