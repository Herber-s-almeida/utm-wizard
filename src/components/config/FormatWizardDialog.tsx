import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFormats, useFormatCreativeTypes, useCreativeTypeSpecifications, useSpecificationCopyFields, useSpecificationDimensions, useFileExtensions, useSpecificationExtensions } from '@/hooks/useFormatsHierarchy';
import { cn } from '@/lib/utils';

interface FormatWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface CopyField {
  name: string;
  maxCharacters: number | null;
  observation: string;
}

interface Dimension {
  width: number;
  height: number;
  unit: string;
}

export function FormatWizardDialog({ open, onOpenChange, onComplete }: FormatWizardDialogProps) {
  const [step, setStep] = useState(1);
  
  // Step 1: Format
  const [formatName, setFormatName] = useState('');
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [isNewFormat, setIsNewFormat] = useState(true);
  
  // Step 2: Creative Type
  const [creativeTypeName, setCreativeTypeName] = useState('');
  
  // Step 3: Specifications
  const [specName, setSpecName] = useState('');
  
  // Copy fields
  const [copyFields, setCopyFields] = useState<CopyField[]>([]);
  const [newCopyName, setNewCopyName] = useState('');
  const [newCopyMaxChars, setNewCopyMaxChars] = useState<string>('');
  const [newCopyObservation, setNewCopyObservation] = useState('');
  
  // Dimensions
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [newDimWidth, setNewDimWidth] = useState('');
  const [newDimHeight, setNewDimHeight] = useState('');
  const [newDimUnit, setNewDimUnit] = useState('px');
  
  // Extensions
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);
  const [newExtension, setNewExtension] = useState('');
  
  // Duration
  const [hasDuration, setHasDuration] = useState(false);
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('s');
  
  // Weight
  const [hasWeight, setHasWeight] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState('MB');
  
  // Hooks
  const formats = useFormats();
  const creativeTypes = useFormatCreativeTypes(selectedFormatId || undefined);
  const fileExtensions = useFileExtensions();
  
  // Created IDs for later use
  const [createdFormatId, setCreatedFormatId] = useState<string | null>(null);
  const [createdCreativeTypeId, setCreatedCreativeTypeId] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFormatName('');
      setSelectedFormatId(null);
      setIsNewFormat(true);
      setCreativeTypeName('');
      setSpecName('');
      setCopyFields([]);
      setNewCopyName('');
      setNewCopyMaxChars('');
      setNewCopyObservation('');
      setDimensions([]);
      setNewDimWidth('');
      setNewDimHeight('');
      setNewDimUnit('px');
      setSelectedExtensions([]);
      setNewExtension('');
      setHasDuration(false);
      setDurationValue('');
      setDurationUnit('s');
      setHasWeight(false);
      setWeightValue('');
      setWeightUnit('MB');
      setCreatedFormatId(null);
      setCreatedCreativeTypeId(null);
    }
  }, [open]);

  const handleAddCopyField = () => {
    if (!newCopyName.trim()) {
      toast.error('Nome do campo é obrigatório');
      return;
    }
    setCopyFields([...copyFields, {
      name: newCopyName.trim(),
      maxCharacters: newCopyMaxChars ? parseInt(newCopyMaxChars) : null,
      observation: newCopyObservation.trim()
    }]);
    setNewCopyName('');
    setNewCopyMaxChars('');
    setNewCopyObservation('');
  };

  const handleRemoveCopyField = (index: number) => {
    setCopyFields(copyFields.filter((_, i) => i !== index));
  };

  const handleAddDimension = () => {
    const width = parseInt(newDimWidth);
    const height = parseInt(newDimHeight);
    if (!width || !height || width <= 0 || height <= 0) {
      toast.error('Largura e altura devem ser números positivos');
      return;
    }
    if (dimensions.length >= 10) {
      toast.error('Máximo de 10 dimensões');
      return;
    }
    setDimensions([...dimensions, { width, height, unit: newDimUnit }]);
    setNewDimWidth('');
    setNewDimHeight('');
  };

  const handleRemoveDimension = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
  };

  const handleAddExtension = async () => {
    if (!newExtension.trim()) return;
    const ext = newExtension.startsWith('.') ? newExtension.toLowerCase() : `.${newExtension.toLowerCase()}`;
    
    // Check if exists
    const existing = fileExtensions.data?.find(e => e.name === ext);
    if (existing) {
      if (!selectedExtensions.includes(existing.id)) {
        setSelectedExtensions([...selectedExtensions, existing.id]);
      }
    } else {
      try {
        const created = await fileExtensions.create.mutateAsync(ext);
        setSelectedExtensions([...selectedExtensions, created.id]);
      } catch (err) {
        toast.error('Erro ao criar extensão');
      }
    }
    setNewExtension('');
  };

  const toggleExtension = (extId: string) => {
    if (selectedExtensions.includes(extId)) {
      setSelectedExtensions(selectedExtensions.filter(id => id !== extId));
    } else {
      setSelectedExtensions([...selectedExtensions, extId]);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      // Validate format
      if (isNewFormat) {
        if (!formatName.trim()) {
          toast.error('Nome do formato é obrigatório');
          return;
        }
        try {
          const created = await formats.create.mutateAsync(formatName.trim());
          setCreatedFormatId(created.id);
          setSelectedFormatId(created.id);
          setStep(2);
        } catch (err) {
          toast.error('Erro ao criar formato');
        }
      } else {
        if (!selectedFormatId) {
          toast.error('Selecione um formato');
          return;
        }
        setStep(2);
      }
    } else if (step === 2) {
      // Validate creative type
      if (!creativeTypeName.trim()) {
        toast.error('Nome do tipo de criativo é obrigatório');
        return;
      }
      try {
        const formatId = createdFormatId || selectedFormatId;
        if (!formatId) {
          toast.error('Formato não encontrado');
          return;
        }
        const created = await creativeTypes.create.mutateAsync({
          formatId,
          name: creativeTypeName.trim()
        });
        setCreatedCreativeTypeId(created.id);
        setStep(3);
      } catch (err) {
        toast.error('Erro ao criar tipo de criativo');
      }
    }
  };

  const handleFinish = async () => {
    // Validate specification name
    if (!specName.trim()) {
      toast.error('Nome da especificação é obrigatório');
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      // Create specification
      const { data: spec, error: specError } = await supabase
        .from('creative_type_specifications')
        .insert({
          creative_type_id: createdCreativeTypeId,
          name: specName.trim(),
          has_duration: hasDuration,
          duration_value: hasDuration && durationValue ? parseFloat(durationValue) : null,
          duration_unit: hasDuration ? durationUnit : null,
          max_weight: hasWeight && weightValue ? parseFloat(weightValue) : null,
          weight_unit: hasWeight ? weightUnit : null,
          user_id: userId,
        })
        .select()
        .single();
      
      if (specError) throw specError;
      
      // Create copy fields
      for (const copy of copyFields) {
        await supabase.from('specification_copy_fields').insert({
          specification_id: spec.id,
          name: copy.name,
          max_characters: copy.maxCharacters,
          observation: copy.observation || null,
          user_id: userId,
        });
      }
      
      // Create dimensions
      for (const dim of dimensions) {
        await supabase.from('specification_dimensions').insert({
          specification_id: spec.id,
          width: dim.width,
          height: dim.height,
          unit: dim.unit,
          user_id: userId,
        });
      }
      
      // Create extension associations
      for (const extId of selectedExtensions) {
        await supabase.from('specification_extensions').insert({
          specification_id: spec.id,
          extension_id: extId,
          user_id: userId,
        });
      }
      
      toast.success('Formato criado com sucesso!');
      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar especificação');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
              <Badge variant={step === 1 ? 'default' : 'secondary'} className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">1</Badge>
              <span className={cn(step === 1 ? 'text-foreground font-medium' : '')}>Formato</span>
              <ChevronRight className="h-3 w-3" />
              <Badge variant={step === 2 ? 'default' : 'secondary'} className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">2</Badge>
              <span className={cn(step === 2 ? 'text-foreground font-medium' : '')}>Tipo de Criativo</span>
              <ChevronRight className="h-3 w-3" />
              <Badge variant={step === 3 ? 'default' : 'secondary'} className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">3</Badge>
              <span className={cn(step === 3 ? 'text-foreground font-medium' : '')}>Especificações</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant={isNewFormat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsNewFormat(true)}
                >
                  Criar novo formato
                </Button>
                <Button
                  type="button"
                  variant={!isNewFormat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsNewFormat(false)}
                >
                  Usar existente
                </Button>
              </div>

              {isNewFormat ? (
                <div className="space-y-2">
                  <Label htmlFor="formatName">Nome do Formato *</Label>
                  <Input
                    id="formatName"
                    value={formatName}
                    onChange={(e) => setFormatName(e.target.value.slice(0, 50))}
                    placeholder="Ex: Display, Vídeo, Áudio, Social Feed"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">{formatName.length}/50 caracteres</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Selecione um formato</Label>
                  <Select value={selectedFormatId || ''} onValueChange={setSelectedFormatId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um formato..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formats.data?.map((format) => (
                        <SelectItem key={format.id} value={format.id}>
                          {format.name} {format.is_system && <Badge variant="secondary" className="ml-2 text-xs">Sistema</Badge>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Formatos representam o conceito geral do criativo (ex: Display, Vídeo, Áudio).
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="creativeTypeName">Nome do Tipo de Criativo *</Label>
                <Input
                  id="creativeTypeName"
                  value={creativeTypeName}
                  onChange={(e) => setCreativeTypeName(e.target.value.slice(0, 100))}
                  placeholder="Ex: Anúncio Search, OOH Lonado Simples, Rádio Spot 30s"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">{creativeTypeName.length}/100 caracteres</p>
              </div>

              <p className="text-xs text-muted-foreground">
                Tipos de criativo definem o comportamento criativo do formato e indicam quais campos serão usados.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 py-4">
              {/* Specification Name */}
              <div className="space-y-2">
                <Label htmlFor="specName">Nome da Especificação *</Label>
                <Input
                  id="specName"
                  value={specName}
                  onChange={(e) => setSpecName(e.target.value.slice(0, 100))}
                  placeholder="Ex: 300×250, 1080×1080, 6s vertical"
                  maxLength={100}
                />
              </div>

              {/* Copy Fields */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Copy (campos de texto)</Label>
                
                {copyFields.length > 0 && (
                  <div className="space-y-2">
                    {copyFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <span className="text-sm flex-1">
                          {field.name}
                          {field.maxCharacters && <span className="text-muted-foreground ml-1">({field.maxCharacters} chars)</span>}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCopyField(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 p-3 border rounded-md">
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
                      placeholder="Máx. caracteres"
                      className="w-32"
                    />
                    <Textarea
                      value={newCopyObservation}
                      onChange={(e) => setNewCopyObservation(e.target.value.slice(0, 500))}
                      placeholder="Observação (opcional)"
                      className="flex-1 min-h-[60px]"
                      maxLength={500}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCopyField}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Copy
                  </Button>
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Dimensões</Label>
                
                {dimensions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dimensions.map((dim, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {dim.width} × {dim.height} {dim.unit}
                        <button onClick={() => handleRemoveDimension(index)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={newDimWidth}
                    onChange={(e) => setNewDimWidth(e.target.value)}
                    placeholder="Largura"
                    className="w-24"
                  />
                  <span>×</span>
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
                  <Button type="button" variant="outline" size="icon" onClick={handleAddDimension}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Máximo de 10 dimensões</p>
              </div>

              {/* Extensions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Extensões de arquivo</Label>
                
                {fileExtensions.data && fileExtensions.data.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {fileExtensions.data.map((ext) => (
                      <Badge
                        key={ext.id}
                        variant={selectedExtensions.includes(ext.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleExtension(ext.id)}
                      >
                        {ext.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    value={newExtension}
                    onChange={(e) => setNewExtension(e.target.value)}
                    placeholder="Nova extensão (ex: .pdf)"
                    className="w-40"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExtension()}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddExtension}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasDuration"
                    checked={hasDuration}
                    onCheckedChange={(checked) => setHasDuration(checked === true)}
                  />
                  <Label htmlFor="hasDuration" className="text-sm font-medium cursor-pointer">Tem duração</Label>
                </div>
                
                {hasDuration && (
                  <div className="flex items-center gap-2 ml-6">
                    <Input
                      type="number"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      placeholder="Valor"
                      className="w-24"
                    />
                    <Select value={durationUnit} onValueChange={setDurationUnit}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s">segundos</SelectItem>
                        <SelectItem value="min">minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Weight */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasWeight"
                    checked={hasWeight}
                    onCheckedChange={(checked) => setHasWeight(checked === true)}
                  />
                  <Label htmlFor="hasWeight" className="text-sm font-medium cursor-pointer">Peso máximo</Label>
                </div>
                
                {hasWeight && (
                  <div className="flex items-center gap-2 ml-6">
                    <Input
                      type="number"
                      value={weightValue}
                      onChange={(e) => setWeightValue(e.target.value)}
                      placeholder="Valor"
                      className="w-24"
                    />
                    <Select value={weightUnit} onValueChange={setWeightUnit}>
                      <SelectTrigger className="w-24">
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
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {step < 3 ? (
              <Button onClick={handleNext}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish}>
                Concluir
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
