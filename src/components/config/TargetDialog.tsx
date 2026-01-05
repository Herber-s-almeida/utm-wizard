import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrazilianCities, BrazilianCity } from '@/hooks/useBrazilianCities';
import { useBehavioralSegmentations, BehavioralSegmentation } from '@/hooks/useConfigData';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';

interface Location {
  city: string;
  state: string;
  country: string;
  radius: string;
  radiusUnit: 'km' | 'miles';
  exactRegion?: boolean;
  locationType?: 'country' | 'state' | 'city';
}

interface TargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    age_range: string;
    geolocation: Location[];
    behavior: string;
    description: string;
  }) => void;
  existingNames?: string[];
  initialData?: {
    name: string;
    age_range: string;
    geolocation: Location[];
    behavior: string;
    description?: string;
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
  const [description, setDescription] = useState('');
  
  // Country selection
  const [countryType, setCountryType] = useState<'brasil' | 'outros'>('brasil');
  
  // Brazil city search
  const [citySearch, setCitySearch] = useState('');
  const [showCityResults, setShowCityResults] = useState(false);
  const [pendingBrazilCity, setPendingBrazilCity] = useState<BrazilianCity | null>(null);
  
  // Other countries
  const [otherCountryLocation, setOtherCountryLocation] = useState('');
  
  // Radius options
  const [radiusType, setRadiusType] = useState<'radius' | 'exact'>('radius');
  const [pendingRadius, setPendingRadius] = useState('');
  const [pendingRadiusUnit, setPendingRadiusUnit] = useState<'km' | 'miles'>('km');
  
  const { cities, searchCities, loading: loadingCities } = useBrazilianCities();
  const cityResults = cities.length > 0 ? searchCities(citySearch) : [];
  
  // Behavioral Segmentations from database
  const { data: behavioralSegmentations = [], create: createBehavioral } = useBehavioralSegmentations();
  
  // Segmentation state
  const [selectedSegmentation, setSelectedSegmentation] = useState('');
  const [showNewSegmentationType, setShowNewSegmentationType] = useState(false);
  const [newSegmentationName, setNewSegmentationName] = useState('');
  const [newSegmentationDescription, setNewSegmentationDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      
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
      } else if (initialData?.age_range?.endsWith('+')) {
        setAgeMin(initialData.age_range.replace('+', ''));
        setAgeMax('');
        setNoMaxAge(true);
      } else {
        setAgeMin('');
        setAgeMax('');
        setNoMaxAge(false);
      }
      
      setLocations(initialData?.geolocation || []);
      
      // Check if behavior matches existing types
      const behaviorValue = initialData?.behavior || '';
      const existingType = behavioralSegmentations.find(t => t.name === behaviorValue);
      if (existingType) {
        setSelectedSegmentation(behaviorValue);
      } else {
        setSelectedSegmentation('');
      }
      
      // Reset location form
      setCountryType('brasil');
      setCitySearch('');
      setShowCityResults(false);
      setPendingBrazilCity(null);
      setOtherCountryLocation('');
      setRadiusType('radius');
      setPendingRadius('');
      setPendingRadiusUnit('km');
      setShowNewSegmentationType(false);
      setNewSegmentationName('');
      setNewSegmentationDescription('');
    }
  }, [open, initialData, behavioralSegmentations]);

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
    setPendingBrazilCity(city);
    if (city.type === 'country') {
      setCitySearch(city.city);
    } else if (city.type === 'state') {
      setCitySearch(`${city.city}, Brasil`);
    } else {
      setCitySearch(`${city.city}, ${city.stateCode}`);
    }
    setShowCityResults(false);
  };

  const handleAddLocation = () => {
    if (locations.length >= 100) {
      toast.error('Limite máximo de 100 localizações atingido');
      return;
    }

    if (countryType === 'brasil') {
      if (!pendingBrazilCity) {
        toast.error('Selecione uma localização da lista');
        return;
      }
      
      if (radiusType === 'radius' && !pendingRadius) {
        toast.error('Informe o raio');
        return;
      }

      const newLocation: Location = {
        city: pendingBrazilCity.city,
        state: pendingBrazilCity.type === 'city' ? pendingBrazilCity.state : '',
        country: 'Brasil',
        radius: radiusType === 'exact' ? '' : pendingRadius,
        radiusUnit: pendingRadiusUnit,
        exactRegion: radiusType === 'exact',
        locationType: pendingBrazilCity.type
      };

      setLocations([...locations, newLocation]);
      setCitySearch('');
      setPendingBrazilCity(null);
    } else {
      if (!otherCountryLocation.trim()) {
        toast.error('Informe a localização');
        return;
      }

      if (radiusType === 'radius' && !pendingRadius) {
        toast.error('Informe o raio');
        return;
      }

      const newLocation: Location = {
        city: otherCountryLocation.trim(),
        state: '',
        country: 'Outro',
        radius: radiusType === 'exact' ? '' : pendingRadius,
        radiusUnit: pendingRadiusUnit,
        exactRegion: radiusType === 'exact'
      };

      setLocations([...locations, newLocation]);
      setOtherCountryLocation('');
    }

    setRadiusType('radius');
    setPendingRadius('');
    setPendingRadiusUnit('km');
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleAddSegmentationType = async () => {
    const trimmedName = newSegmentationName.trim();
    if (!trimmedName) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (trimmedName.length > 35) {
      toast.error('Nome deve ter no máximo 35 caracteres');
      return;
    }
    if (behavioralSegmentations.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Este tipo de segmentação já existe');
      return;
    }
    
    try {
      await createBehavioral.mutateAsync({
        name: trimmedName.toLowerCase(),
        description: newSegmentationDescription.trim().slice(0, 180) || undefined
      });
      setNewSegmentationName('');
      setNewSegmentationDescription('');
      setShowNewSegmentationType(false);
      setSelectedSegmentation(trimmedName.toLowerCase());
    } catch (error) {
      toast.error('Erro ao criar segmentação comportamental');
    }
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

    const finalBehavior = selectedSegmentation;

    onSave({
      name: trimmedName,
      age_range: ageRange,
      geolocation: locations.filter(l => l.city.trim()),
      behavior: finalBehavior,
      description: description.trim()
    });

    setName('');
    setAgeMin('');
    setAgeMax('');
    setNoMaxAge(false);
    setLocations([]);
    setSelectedSegmentation('');
    setDescription('');
    onOpenChange(false);
  };

  const getLocationDisplay = (location: Location) => {
    let locationStr = '';
    
    if (location.locationType === 'country') {
      locationStr = `${location.city} (País)`;
    } else if (location.locationType === 'state') {
      locationStr = `${location.city}, Brasil (Estado)`;
    } else if (location.country === 'Outro') {
      locationStr = location.city;
    } else {
      const parts = [location.city];
      if (location.state) parts.push(location.state);
      parts.push(location.country);
      locationStr = parts.join(', ');
    }
    
    if (location.exactRegion) {
      return `${locationStr} - Região Exata`;
    }
    if (location.radius) {
      return `${locationStr} - ${location.radius} ${location.radiusUnit}`;
    }
    return locationStr;
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
            <LabelWithTooltip htmlFor="name" tooltip="Nome único para identificar este público-alvo. Será usado na geração de utm_term." required>
              Nome da segmentação
            </LabelWithTooltip>
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
            <LabelWithTooltip tooltip="Faixa etária do público-alvo. Marque 'Sem máximo' para 65+.">
              Idade
            </LabelWithTooltip>
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
            <LabelWithTooltip tooltip="Defina a região geográfica do público: país, estado, cidade ou raio específico.">
              Localização
            </LabelWithTooltip>
            
            {/* Country Type Selection */}
            <RadioGroup
              value={countryType}
              onValueChange={(value: 'brasil' | 'outros') => {
                setCountryType(value);
                setCitySearch('');
                setPendingBrazilCity(null);
                setOtherCountryLocation('');
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="brasil" id="brasil" />
                <Label htmlFor="brasil" className="font-normal cursor-pointer">Brasil</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="outros" id="outros" />
                <Label htmlFor="outros" className="font-normal cursor-pointer">Outros países</Label>
              </div>
            </RadioGroup>
            
            {/* Location Input */}
            <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
              {countryType === 'brasil' ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={citySearch}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setShowCityResults(true);
                        setPendingBrazilCity(null);
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
                  {showCityResults && cityResults.length > 0 && !pendingBrazilCity && (
                    <div className="max-h-40 overflow-y-auto border rounded-md bg-background z-50">
                      {cityResults.map((city, idx) => (
                        <button
                          key={`${city.type}-${city.city}-${city.stateCode}-${idx}`}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                          onClick={() => handleSelectCity(city)}
                        >
                          {city.type === 'country' && (
                            <span className="font-medium">{city.city} (País)</span>
                          )}
                          {city.type === 'state' && (
                            <span>{city.city}, Brasil (Estado)</span>
                          )}
                          {city.type === 'city' && (
                            <span>{city.city}, {city.stateCode} - {city.country}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {citySearch.length >= 2 && cityResults.length === 0 && !pendingBrazilCity && !loadingCities && (
                    <p className="text-xs text-muted-foreground">Nenhuma cidade encontrada</p>
                  )}
                </>
              ) : (
                <Input
                  value={otherCountryLocation}
                  onChange={(e) => setOtherCountryLocation(e.target.value.slice(0, 45))}
                  placeholder="Ex: Miami, FL, Estados Unidos"
                  maxLength={45}
                />
              )}

              {/* Radius Selection */}
              {(pendingBrazilCity || (countryType === 'outros' && otherCountryLocation)) && (
                <div className="space-y-3 pt-2 border-t">
                  <RadioGroup
                    value={radiusType}
                    onValueChange={(value: 'radius' | 'exact') => setRadiusType(value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="radius" id="radius" />
                      <Label htmlFor="radius" className="font-normal cursor-pointer">Com raio</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="exact" id="exact" />
                      <Label htmlFor="exact" className="font-normal cursor-pointer">Região Exata</Label>
                    </div>
                  </RadioGroup>

                  <div className="flex items-center gap-2">
                    {radiusType === 'radius' && (
                      <>
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
                      </>
                    )}
                    <Button type="button" size="sm" onClick={handleAddLocation} className="ml-auto">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Added Locations */}
            {locations.map((location, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <span className="text-sm">{getLocationDisplay(location)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLocation(index)}
                  className="h-8 w-8 text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {locations.length > 0 && (
              <p className="text-xs text-muted-foreground">{locations.length}/100 localizações</p>
            )}
          </div>

          {/* Behavioral Segmentation - Simple Dropdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Segmentação comportamental</Label>
            </div>

            <div className="flex gap-2">
              <Select value={selectedSegmentation} onValueChange={setSelectedSegmentation}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {behavioralSegmentations.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      <span className="capitalize">{type.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowNewSegmentationType(true)}
                className="shrink-0"
              >
                <Plus className="h-3 w-3 mr-1" />
                Novo segmento
              </Button>
            </div>

            {/* New segmentation form - inline */}
            {showNewSegmentationType && (
              <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Nome do novo segmento *</Label>
                  <Input
                    value={newSegmentationName}
                    onChange={(e) => setNewSegmentationName(e.target.value.slice(0, 35))}
                    placeholder="Ex: Remarketing"
                    maxLength={35}
                  />
                  <p className="text-xs text-muted-foreground">{newSegmentationName.length}/35 caracteres</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Textarea
                    value={newSegmentationDescription}
                    onChange={(e) => setNewSegmentationDescription(e.target.value.slice(0, 180))}
                    placeholder="Descrição do segmento"
                    rows={2}
                    maxLength={180}
                  />
                  <p className="text-xs text-muted-foreground">{newSegmentationDescription.length}/180 caracteres</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setShowNewSegmentationType(false);
                      setNewSegmentationName('');
                      setNewSegmentationDescription('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleAddSegmentationType}>
                    Criar segmento
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição da segmentação</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 180))}
              placeholder="Uma descrição curta sobre esta segmentação..."
              rows={2}
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
