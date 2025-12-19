import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Pencil, Check, X, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrazilianCities, BrazilianCity } from '@/hooks/useBrazilianCities';

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
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [noMaxAge, setNoMaxAge] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [segmentationType, setSegmentationType] = useState('');
  const [customSegmentation, setCustomSegmentation] = useState('');
  
  // City search
  const [citySearch, setCitySearch] = useState('');
  const [showCityResults, setShowCityResults] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<BrazilianCity | null>(null);
  const [pendingRadius, setPendingRadius] = useState('');
  const [pendingRadiusUnit, setPendingRadiusUnit] = useState<'km' | 'miles'>('km');
  
  const { searchCities, loading: loadingCities } = useBrazilianCities();
  const cityResults = searchCities(citySearch);
  
  // Segmentation types management
  const [segmentationTypes, setSegmentationTypes] = useState<string[]>(DEFAULT_SEGMENTATION_TYPES);
  const [editingSegmentationType, setEditingSegmentationType] = useState<string | null>(null);
  const [editingSegmentationValue, setEditingSegmentationValue] = useState('');
  const [showNewSegmentationType, setShowNewSegmentationType] = useState(false);
  const [newSegmentationTypeName, setNewSegmentationTypeName] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      
      // Parse age range
      const ageRangeParts = (initialData?.age_range || '').split('-');
      if (ageRangeParts.length === 2) {
        setAgeMin(ageRangeParts[0].trim());
        if (ageRangeParts[1].trim() === '+' || ageRangeParts[1].trim() === '') {
          setAgeMax('');
          setNoMaxAge(true);
        } else {
          setAgeMax(ageRangeParts[1].trim());
          setNoMaxAge(false);
        }
      } else {
        setAgeMin('');
        setAgeMax('');
        setNoMaxAge(false);
      }
      
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
      
      // Reset city search
      setCitySearch('');
      setShowCityResults(false);
      setPendingLocation(null);
      setPendingRadius('');
      setPendingRadiusUnit('km');
    }
  }, [open, initialData]);

  const handleAgeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value.replace(/\D/g, '').slice(0, 2);
    const numericValue = parseInt(numValue, 10);
    
    if (numValue === '' || (numericValue >= 0 && numericValue <= 99)) {
      if (type === 'min') {
        setAgeMin(numValue);
      } else {
        setAgeMax(numValue);
      }
    }
  };

  const handleSelectCity = (city: BrazilianCity) => {
    setPendingLocation(city);
    setCitySearch(`${city.city}, ${city.stateCode}`);
    setShowCityResults(false);
  };

  const handleAddLocation = () => {
    if (!pendingLocation) {
      toast.error('Selecione uma cidade da lista');
      return;
    }
    
    if (!pendingRadius) {
      toast.error('Informe o raio');
      return;
    }

    if (locations.length >= 100) {
      toast.error('Limite máximo de 100 localizações atingido');
      return;
    }

    const newLocation: Location = {
      city: pendingLocation.city,
      state: pendingLocation.state,
      country: pendingLocation.country,
      radius: pendingRadius,
      radiusUnit: pendingRadiusUnit
    };

    setLocations([...locations, newLocation]);
    setCitySearch('');
    setPendingLocation(null);
    setPendingRadius('');
    setPendingRadiusUnit('km');
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
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

    if (trimmedName.length > 35) {
      toast.error('Nome deve ter no máximo 35 caracteres');
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

    // Build age range string
    let ageRange = '';
    if (ageMin) {
      ageRange = noMaxAge ? `${ageMin}+` : (ageMax ? `${ageMin}-${ageMax}` : ageMin);
    }

    const finalBehavior = segmentationType === 'custom' ? customSegmentation : segmentationType;

    onSave({
      name: trimmedName,
      age_range: ageRange,
      geolocation: locations.filter(l => l.city.trim()),
      behavior: finalBehavior
    });

    setName('');
    setAgeMin('');
    setAgeMax('');
    setNoMaxAge(false);
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
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da segmentação *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 35))}
              placeholder="Ex: Jovens Urbanos"
              maxLength={35}
            />
            <p className="text-xs text-muted-foreground">{name.length}/35 caracteres</p>
          </div>

          {/* Age Field */}
          <div className="space-y-2">
            <Label>Idade</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">De</span>
                <Input
                  value={ageMin}
                  onChange={(e) => handleAgeChange('min', e.target.value)}
                  placeholder="18"
                  className="w-16 text-center"
                  maxLength={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Até</span>
                <Input
                  value={ageMax}
                  onChange={(e) => handleAgeChange('max', e.target.value)}
                  placeholder="65"
                  className="w-16 text-center"
                  maxLength={2}
                  disabled={noMaxAge}
                />
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Checkbox
                  id="noMaxAge"
                  checked={noMaxAge}
                  onCheckedChange={(checked) => {
                    setNoMaxAge(checked === true);
                    if (checked) setAgeMax('');
                  }}
                />
                <Label htmlFor="noMaxAge" className="text-sm font-normal cursor-pointer">
                  Sem máximo
                </Label>
              </div>
            </div>
          </div>

          {/* Location Field */}
          <div className="space-y-3">
            <Label>Localização</Label>
            
            {/* City Search */}
            <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setShowCityResults(true);
                    setPendingLocation(null);
                  }}
                  onFocus={() => setShowCityResults(true)}
                  placeholder="Digite o nome da cidade..."
                  className="pl-9"
                />
                {loadingCities && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              
              {/* City Results Dropdown */}
              {showCityResults && cityResults.length > 0 && !pendingLocation && (
                <div className="max-h-40 overflow-y-auto border rounded-md bg-background">
                  {cityResults.map((city, idx) => (
                    <button
                      key={`${city.city}-${city.stateCode}-${idx}`}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => handleSelectCity(city)}
                    >
                      {city.city}, {city.stateCode} - {city.country}
                    </button>
                  ))}
                </div>
              )}
              
              {citySearch.length >= 2 && cityResults.length === 0 && !pendingLocation && !loadingCities && (
                <p className="text-xs text-muted-foreground">Nenhuma cidade encontrada</p>
              )}

              {/* Radius Selection */}
              {pendingLocation && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Raio:</span>
                  <Input
                    value={pendingRadius}
                    onChange={(e) => setPendingRadius(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="30"
                    className="w-20"
                    maxLength={3}
                  />
                  <Select
                    value={pendingRadiusUnit}
                    onValueChange={(value: 'km' | 'miles') => setPendingRadiusUnit(value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">km</SelectItem>
                      <SelectItem value="miles">milhas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" onClick={handleAddLocation}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              )}
            </div>

            {/* Added Locations */}
            {locations.map((location, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <span className="text-sm">
                  {location.city}, {location.state} - {location.radius} {location.radiusUnit}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLocation(index)}
                  className="h-8 w-8 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {locations.length > 0 && (
              <p className="text-xs text-muted-foreground">{locations.length}/100 localizações</p>
            )}
          </div>

          {/* Segmentation Types */}
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
