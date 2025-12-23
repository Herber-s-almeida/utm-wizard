import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  useCreativeTypeSpecifications, 
  useSpecificationCopyFields,
  useSpecificationDimensions,
  useFileExtensions,
  useSpecificationExtensions
} from '@/hooks/useFormatsHierarchy';

interface SpecificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creativeTypeId: string;
  initialData?: {
    id?: string;
    name: string;
    has_duration?: boolean;
    duration_value?: number | null;
    duration_unit?: string | null;
    max_weight?: number | null;
    weight_unit?: string | null;
  };
  mode?: 'create' | 'edit';
}

export function SpecificationDialog({
  open,
  onOpenChange,
  creativeTypeId,
  initialData,
  mode = 'create'
}: SpecificationDialogProps) {
  // Basic info
  const [name, setName] = useState('');
  
  // Duration
  const [hasDuration, setHasDuration] = useState(false);
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState<string>('s');
  
  // Weight
  const [hasWeight, setHasWeight] = useState(false);
  const [maxWeight, setMaxWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<string>('MB');

  // Copy fields state
  const [newCopyName, setNewCopyName] = useState('');
  const [newCopyMaxChars, setNewCopyMaxChars] = useState('');
  const [newCopyObservation, setNewCopyObservation] = useState('');

  // Dimensions state
  const [newDimWidth, setNewDimWidth] = useState('');
  const [newDimHeight, setNewDimHeight] = useState('');
  const [newDimUnit, setNewDimUnit] = useState('px');

  // Extensions state
  const [newExtension, setNewExtension] = useState('');
  const [selectedExtensionId, setSelectedExtensionId] = useState('');

  // Hooks
  const { create: createSpec, update: updateSpec } = useCreativeTypeSpecifications(creativeTypeId);
  const { data: copyFields, create: createCopyField, remove: removeCopyField } = useSpecificationCopyFields(initialData?.id);
  const { data: dimensions, create: createDimension, remove: removeDimension } = useSpecificationDimensions(initialData?.id);
  const { data: fileExtensions, create: createExtension } = useFileExtensions();
  const { data: specExtensions, add: addExtension, remove: removeExtension } = useSpecificationExtensions(initialData?.id);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setHasDuration(initialData?.has_duration || false);
      setDurationValue(initialData?.duration_value?.toString() || '');
      setDurationUnit(initialData?.duration_unit || 's');
      setHasWeight(!!initialData?.max_weight);
      setMaxWeight(initialData?.max_weight?.toString() || '');
      setWeightUnit(initialData?.weight_unit || 'MB');
      
      // Reset new item fields
      setNewCopyName('');
      setNewCopyMaxChars('');
      setNewCopyObservation('');
      setNewDimWidth('');
      setNewDimHeight('');
      setNewDimUnit('px');
      setNewExtension('');
      setSelectedExtensionId('');
    }
  }, [open, initialData]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome da especificação é obrigatório');
      return;
    }

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateSpec.mutateAsync({
          id: initialData.id,
          name: trimmedName,
          hasDuration,
          durationValue: hasDuration && durationValue ? parseFloat(durationValue) : null,
          durationUnit: hasDuration ? durationUnit : null,
          maxWeight: hasWeight && maxWeight ? parseFloat(maxWeight) : null,
          weightUnit: hasWeight ? weightUnit : null,
        });
      } else {
        await createSpec.mutateAsync({
          creativeTypeId,
          name: trimmedName,
          hasDuration,
          durationValue: hasDuration && durationValue ? parseFloat(durationValue) : undefined,
          durationUnit: hasDuration ? durationUnit : undefined,
          maxWeight: hasWeight && maxWeight ? parseFloat(maxWeight) : undefined,
          weightUnit: hasWeight ? weightUnit : undefined,
        });
      }
      onOpenChange(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleAddCopyField = async () => {
    if (!newCopyName.trim()) {
      toast.error('Nome do campo é obrigatório');
      return;
    }
    if (!initialData?.id) {
      toast.error('Salve a especificação primeiro');
      return;
    }

    try {
      await createCopyField.mutateAsync({
        specificationId: initialData.id,
        name: newCopyName.trim(),
        maxCharacters: newCopyMaxChars ? parseInt(newCopyMaxChars) : undefined,
        observation: newCopyObservation.trim() || undefined,
      });
      setNewCopyName('');
      setNewCopyMaxChars('');
      setNewCopyObservation('');
    } catch {
      // Error handled in hook
    }
  };

  const handleAddDimension = async () => {
    if (!newDimWidth || !newDimHeight) {
      toast.error('Largura e altura são obrigatórias');
      return;
    }
    if (!initialData?.id) {
      toast.error('Salve a especificação primeiro');
      return;
    }

    try {
      await createDimension.mutateAsync({
        specificationId: initialData.id,
        width: parseFloat(newDimWidth),
        height: parseFloat(newDimHeight),
        unit: newDimUnit,
      });
      setNewDimWidth('');
      setNewDimHeight('');
    } catch {
      // Error handled in hook
    }
  };

  const handleAddExtension = async () => {
    if (!initialData?.id) {
      toast.error('Salve a especificação primeiro');
      return;
    }

    if (selectedExtensionId) {
      try {
        await addExtension.mutateAsync({
          specificationId: initialData.id,
          extensionId: selectedExtensionId,
        });
        setSelectedExtensionId('');
      } catch {
        // Error handled in hook
      }
    } else if (newExtension.trim()) {
      try {
        const created = await createExtension.mutateAsync(newExtension.trim());
        await addExtension.mutateAsync({
          specificationId: initialData.id,
          extensionId: created.id,
        });
        setNewExtension('');
      } catch {
        // Error handled in hook
      }
    } else {
      toast.error('Selecione ou crie uma extensão');
    }
  };

  const isEditMode = mode === 'edit' && initialData?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Especificação' : 'Editar Especificação'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5 py-4">
            {/* Nome da Especificação */}
            <div className="space-y-2">
              <Label htmlFor="spec-name">Nome da Especificação *</Label>
              <Input
                id="spec-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 100))}
                placeholder="Ex: Título Principal, Banner Header, Spot 30s"
                maxLength={100}
              />
            </div>

            {/* Duração */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label>Duração</Label>
                <Switch checked={hasDuration} onCheckedChange={setHasDuration} />
              </div>
              {hasDuration && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    placeholder="Valor"
                    className="w-24"
                  />
                  <Select value={durationUnit} onValueChange={setDurationUnit}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="s">Segundos</SelectItem>
                      <SelectItem value="min">Minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Peso Máximo */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label>Peso Máximo</Label>
                <Switch checked={hasWeight} onCheckedChange={setHasWeight} />
              </div>
              {hasWeight && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={maxWeight}
                    onChange={(e) => setMaxWeight(e.target.value)}
                    placeholder="Valor"
                    className="w-24"
                  />
                  <Select value={weightUnit} onValueChange={setWeightUnit}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KB">KB</SelectItem>
                      <SelectItem value="MB">MB</SelectItem>
                      <SelectItem value="GB">GB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Tabs for Copy, Dimensions, Extensions (only in edit mode) */}
            {isEditMode && (
              <Tabs defaultValue="copy" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="copy">Copy</TabsTrigger>
                  <TabsTrigger value="dimensions">Dimensões</TabsTrigger>
                  <TabsTrigger value="extensions">Extensões</TabsTrigger>
                </TabsList>

                {/* Copy Fields */}
                <TabsContent value="copy" className="space-y-3 mt-3">
                  <p className="text-xs text-muted-foreground">
                    Campos de texto que serão usados no criativo (headline, texto de apoio, CTA, etc.)
                  </p>
                  
                  {/* Existing copy fields */}
                  {copyFields?.map(field => (
                    <div key={field.id} className="flex items-start justify-between p-2 bg-muted/30 rounded-md">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{field.name}</p>
                        {field.max_characters && (
                          <p className="text-xs text-muted-foreground">Máx: {field.max_characters} caracteres</p>
                        )}
                        {field.observation && (
                          <p className="text-xs text-muted-foreground mt-0.5">{field.observation}</p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6 text-destructive shrink-0"
                        onClick={() => removeCopyField.mutate(field.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {/* Add new copy field */}
                  <div className="p-3 border border-dashed rounded-lg space-y-2">
                    <Input
                      value={newCopyName}
                      onChange={(e) => setNewCopyName(e.target.value)}
                      placeholder="Nome do campo (ex: Título, Descrição)"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={newCopyMaxChars}
                        onChange={(e) => setNewCopyMaxChars(e.target.value)}
                        placeholder="Limite de caracteres"
                        className="w-40"
                      />
                    </div>
                    <Textarea
                      value={newCopyObservation}
                      onChange={(e) => setNewCopyObservation(e.target.value.slice(0, 500))}
                      placeholder="Observação (opcional, máx 500 caracteres)"
                      rows={2}
                      maxLength={500}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddCopyField}
                      disabled={createCopyField.isPending}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar Copy
                    </Button>
                  </div>
                </TabsContent>

                {/* Dimensions */}
                <TabsContent value="dimensions" className="space-y-3 mt-3">
                  <p className="text-xs text-muted-foreground">
                    Dimensões do criativo (até 10 proporções)
                  </p>
                  
                  {/* Existing dimensions */}
                  <div className="flex flex-wrap gap-2">
                    {dimensions?.map(dim => (
                      <Badge key={dim.id} variant="secondary" className="gap-1 py-1">
                        {dim.width} x {dim.height} {dim.unit}
                        <button 
                          onClick={() => removeDimension.mutate(dim.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {/* Add new dimension */}
                  {(dimensions?.length || 0) < 10 && (
                    <div className="p-3 border border-dashed rounded-lg space-y-2">
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={newDimWidth}
                          onChange={(e) => setNewDimWidth(e.target.value)}
                          placeholder="Largura"
                          className="w-24"
                        />
                        <span className="text-muted-foreground">x</span>
                        <Input
                          type="number"
                          value={newDimHeight}
                          onChange={(e) => setNewDimHeight(e.target.value)}
                          placeholder="Altura"
                          className="w-24"
                        />
                        <Select value={newDimUnit} onValueChange={setNewDimUnit}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="mm">mm</SelectItem>
                            <SelectItem value="m">m</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleAddDimension}
                        disabled={createDimension.isPending}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Adicionar Dimensão
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Extensions */}
                <TabsContent value="extensions" className="space-y-3 mt-3">
                  <p className="text-xs text-muted-foreground">
                    Extensões de arquivo aceitas (.png, .jpg, .mp4, etc.)
                  </p>
                  
                  {/* Existing extensions */}
                  <div className="flex flex-wrap gap-2">
                    {specExtensions?.map(ext => (
                      <Badge key={ext.id} variant="secondary" className="gap-1 py-1">
                        {ext.extension?.name}
                        <button 
                          onClick={() => removeExtension.mutate(ext.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {/* Add extension */}
                  <div className="p-3 border border-dashed rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <Select value={selectedExtensionId} onValueChange={setSelectedExtensionId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione uma extensão" />
                        </SelectTrigger>
                        <SelectContent>
                          {fileExtensions?.filter(ext => 
                            !specExtensions?.some(se => se.extension_id === ext.id)
                          ).map(ext => (
                            <SelectItem key={ext.id} value={ext.id}>
                              {ext.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>ou crie nova:</span>
                      <Input
                        value={newExtension}
                        onChange={(e) => setNewExtension(e.target.value)}
                        placeholder=".ext"
                        className="w-24 h-7"
                      />
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleAddExtension}
                      disabled={addExtension.isPending || createExtension.isPending}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar Extensão
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {!isEditMode && (
              <p className="text-xs text-muted-foreground text-center p-3 bg-muted/30 rounded-lg">
                Após criar a especificação, edite-a para adicionar campos de Copy, Dimensões e Extensões.
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={handleSave}
            disabled={createSpec.isPending || updateSpec.isPending}
          >
            {mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
