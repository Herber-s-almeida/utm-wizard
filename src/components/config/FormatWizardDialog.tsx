import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useFormats, useFileExtensions } from '@/hooks/useFormatsHierarchy';
import { useQueryClient } from '@tanstack/react-query';
import { useCreativeTypes } from '@/hooks/useCreativeTypes';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useEnvironment } from '@/contexts/EnvironmentContext';

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
  description: string;
  observation: string;
}

export function FormatWizardDialog({ open, onOpenChange, onComplete }: FormatWizardDialogProps) {
  const [step, setStep] = useState(1);
  
  // Step 1: Format Name
  const [formatName, setFormatName] = useState('');
  
  // Step 2: Creative Type
  const [selectedCreativeTypeId, setSelectedCreativeTypeId] = useState<string | null>(null);
  const [isNewCreativeType, setIsNewCreativeType] = useState(false);
  const [newCreativeTypeName, setNewCreativeTypeName] = useState('');
  
  // Step 3: Specifications
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
  const [newDimDescription, setNewDimDescription] = useState('');
  const [newDimObservation, setNewDimObservation] = useState('');
  
  // Edit mode states
  const [editingCopyIndex, setEditingCopyIndex] = useState<number | null>(null);
  const [editingDimIndex, setEditingDimIndex] = useState<number | null>(null);
  
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
  const creativeTypes = useCreativeTypes();
  const fileExtensions = useFileExtensions();
  const queryClient = useQueryClient();
  const { currentEnvironmentId } = useEnvironment();
  
  // Created IDs for later use
  const [createdFormatId, setCreatedFormatId] = useState<string | null>(null);
  const [createdCreativeTypeId, setCreatedCreativeTypeId] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFormatName('');
      setSelectedCreativeTypeId(null);
      setIsNewCreativeType(false);
      setNewCreativeTypeName('');
      setCopyFields([]);
      setNewCopyName('');
      setNewCopyMaxChars('');
      setNewCopyObservation('');
      setDimensions([]);
      setNewDimWidth('');
      setNewDimHeight('');
      setNewDimUnit('px');
      setNewDimDescription('');
      setNewDimObservation('');
      setEditingCopyIndex(null);
      setEditingDimIndex(null);
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

  // Check if format name already exists
  const formatNameExists = formats.data?.some(
    f => f.name.toLowerCase().trim() === formatName.toLowerCase().trim()
  );

  const handleAddCopyField = () => {
    if (!newCopyName.trim()) {
      toast.error('Nome do campo é obrigatório');
      return;
    }
    
    if (editingCopyIndex !== null) {
      // Update existing
      const updated = [...copyFields];
      updated[editingCopyIndex] = {
        name: newCopyName.trim(),
        maxCharacters: newCopyMaxChars ? parseInt(newCopyMaxChars) : null,
        observation: newCopyObservation.trim()
      };
      setCopyFields(updated);
      setEditingCopyIndex(null);
    } else {
      // Add new
      setCopyFields([...copyFields, {
        name: newCopyName.trim(),
        maxCharacters: newCopyMaxChars ? parseInt(newCopyMaxChars) : null,
        observation: newCopyObservation.trim()
      }]);
    }
    setNewCopyName('');
    setNewCopyMaxChars('');
    setNewCopyObservation('');
  };

  const handleEditCopyField = (index: number) => {
    const field = copyFields[index];
    setNewCopyName(field.name);
    setNewCopyMaxChars(field.maxCharacters?.toString() || '');
    setNewCopyObservation(field.observation);
    setEditingCopyIndex(index);
  };

  const handleCancelEditCopy = () => {
    setEditingCopyIndex(null);
    setNewCopyName('');
    setNewCopyMaxChars('');
    setNewCopyObservation('');
  };

  const handleRemoveCopyField = (index: number) => {
    setCopyFields(copyFields.filter((_, i) => i !== index));
    if (editingCopyIndex === index) {
      handleCancelEditCopy();
    }
  };

  const handleAddDimension = () => {
    const width = parseInt(newDimWidth);
    const height = parseInt(newDimHeight);
    if (!width || !height || width <= 0 || height <= 0) {
      toast.error('Largura e altura devem ser números positivos');
      return;
    }
    if (!newDimDescription.trim()) {
      toast.error('Descrição da dimensão é obrigatória');
      return;
    }
    if (editingDimIndex === null && dimensions.length >= 10) {
      toast.error('Máximo de 10 dimensões');
      return;
    }
    
    if (editingDimIndex !== null) {
      // Update existing
      const updated = [...dimensions];
      updated[editingDimIndex] = { 
        width, 
        height, 
        unit: newDimUnit, 
        description: newDimDescription.trim(),
        observation: newDimObservation.trim()
      };
      setDimensions(updated);
      setEditingDimIndex(null);
    } else {
      // Add new
      setDimensions([...dimensions, { 
        width, 
        height, 
        unit: newDimUnit, 
        description: newDimDescription.trim(),
        observation: newDimObservation.trim()
      }]);
    }
    setNewDimWidth('');
    setNewDimHeight('');
    setNewDimDescription('');
    setNewDimObservation('');
  };

  const handleEditDimension = (index: number) => {
    const dim = dimensions[index];
    setNewDimWidth(dim.width.toString());
    setNewDimHeight(dim.height.toString());
    setNewDimUnit(dim.unit);
    setNewDimDescription(dim.description);
    setNewDimObservation(dim.observation || '');
    setEditingDimIndex(index);
  };

  const handleCancelEditDim = () => {
    setEditingDimIndex(null);
    setNewDimWidth('');
    setNewDimHeight('');
    setNewDimDescription('');
    setNewDimObservation('');
  };

  const handleRemoveDimension = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
    if (editingDimIndex === index) {
      handleCancelEditDim();
    }
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
      // Validate format name
      if (!formatName.trim()) {
        toast.error('Nome do formato é obrigatório');
        return;
      }
      if (formatName.trim().length > 50) {
        toast.error('Nome do formato deve ter no máximo 50 caracteres');
        return;
      }
      if (formatNameExists) {
        toast.error('Já existe um formato com este nome');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate creative type
      if (isNewCreativeType) {
        if (!newCreativeTypeName.trim()) {
          toast.error('Nome do tipo de criativo é obrigatório');
          return;
        }
        // Create new creative type
        try {
          const created = await creativeTypes.create.mutateAsync(newCreativeTypeName.trim());
          setCreatedCreativeTypeId(created.id);
          setStep(3);
        } catch (err) {
          // Error already handled in hook
        }
      } else {
        if (!selectedCreativeTypeId) {
          toast.error('Selecione um tipo de criativo');
          return;
        }
        setCreatedCreativeTypeId(selectedCreativeTypeId);
        setStep(3);
      }
    }
  };

  const handleFinish = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        toast.error('Usuário não autenticado');
        return;
      }

      if (!currentEnvironmentId) {
        toast.error('Ambiente não selecionado');
        return;
      }

      // 1. Create the format
      const { data: format, error: formatError } = await supabase
        .from('formats')
        .insert({ 
          name: formatName.trim(), 
          user_id: userId,
          environment_id: currentEnvironmentId
        })
        .select()
        .single();
      
      if (formatError) throw formatError;
      setCreatedFormatId(format.id);

      // 2. Create format_creative_type association
      const creativeTypeId = createdCreativeTypeId!;
      const creativeTypeName = isNewCreativeType 
        ? newCreativeTypeName.trim() 
        : creativeTypes.data?.find(ct => ct.id === creativeTypeId)?.name || '';

      const { data: formatCreativeType, error: fctError } = await supabase
        .from('format_creative_types')
        .insert({ 
          format_id: format.id, 
          name: creativeTypeName,
          user_id: userId,
          environment_id: currentEnvironmentId
        })
        .select()
        .single();
      
      if (fctError) throw fctError;

      // 3. Create specification
      const { data: spec, error: specError } = await supabase
        .from('creative_type_specifications')
        .insert({
          creative_type_id: formatCreativeType.id,
          name: `${formatName.trim()} - ${creativeTypeName}`,
          has_duration: hasDuration,
          duration_value: hasDuration && durationValue ? parseFloat(durationValue) : null,
          duration_unit: hasDuration ? durationUnit : null,
          max_weight: hasWeight && weightValue ? parseFloat(weightValue) : null,
          weight_unit: hasWeight ? weightUnit : null,
          user_id: userId,
          environment_id: currentEnvironmentId,
        })
        .select()
        .single();
      
      if (specError) throw specError;
      
      // 4. Create copy fields
      for (const copy of copyFields) {
        await supabase.from('specification_copy_fields').insert({
          specification_id: spec.id,
          name: copy.name,
          max_characters: copy.maxCharacters,
          observation: copy.observation || null,
          user_id: userId,
          environment_id: currentEnvironmentId,
        });
      }
      
      // 5. Create dimensions
      for (const dim of dimensions) {
        await supabase.from('specification_dimensions').insert({
          specification_id: spec.id,
          width: dim.width,
          height: dim.height,
          unit: dim.unit,
          description: dim.description,
          observation: dim.observation || null,
          user_id: userId,
          environment_id: currentEnvironmentId,
        });
      }
      
      // 6. Create extension associations
      for (const extId of selectedExtensions) {
        await supabase.from('specification_extensions').insert({
          specification_id: spec.id,
          extension_id: extId,
          user_id: userId,
          environment_id: currentEnvironmentId,
        });
      }
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['formats'] });
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      
      toast.success('Formato criado com sucesso!');
      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar formato');
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
          <DialogTitle>Criar novo formato para anúncios</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-sm pt-2">
            <Badge variant={step === 1 ? 'default' : 'secondary'} className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">1</Badge>
            <span className={cn(step === 1 ? 'text-foreground font-medium' : 'text-muted-foreground')}>Formato</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant={step === 2 ? 'default' : 'secondary'} className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">2</Badge>
            <span className={cn(step === 2 ? 'text-foreground font-medium' : 'text-muted-foreground')}>Tipo de Criativo</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant={step === 3 ? 'default' : 'secondary'} className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">3</Badge>
            <span className={cn(step === 3 ? 'text-foreground font-medium' : 'text-muted-foreground')}>Especificações</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Step 1: Format Name */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="formatName">Nome do Formato *</Label>
                <Input
                  id="formatName"
                  value={formatName}
                  onChange={(e) => setFormatName(e.target.value.slice(0, 50))}
                  placeholder="Ex: Anúncios Dinâmicos de Pesquisa, PPL - Meta, OOH Duplo"
                  maxLength={50}
                  className={cn(formatNameExists && 'border-destructive')}
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{formatName.length}/50 caracteres</span>
                  {formatNameExists && (
                    <span className="text-destructive">Já existe um formato com este nome</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Formatos representam o tipo de anúncio, tipo de peça que será criada.
              </p>
            </div>
          )}

          {/* Step 2: Creative Type */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>Tipo de Criativo *</Label>
                
                {!isNewCreativeType ? (
                  <>
                    <Select value={selectedCreativeTypeId || ''} onValueChange={setSelectedCreativeTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tipo de criativo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {creativeTypes.data?.map((ct) => (
                          <SelectItem key={ct.id} value={ct.id}>
                            {ct.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsNewCreativeType(true)}
                      className="w-full"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Criar novo tipo de criativo
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={newCreativeTypeName}
                      onChange={(e) => setNewCreativeTypeName(e.target.value)}
                      placeholder="Ex: imagem estática, vídeo, audio, motion, texto"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsNewCreativeType(false);
                        setNewCreativeTypeName('');
                      }}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                      Voltar para lista
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Tipos de criativo definem a natureza do conteúdo (ex: imagem estática, vídeo, áudio).
              </p>
            </div>
          )}

          {/* Step 3: Specifications */}
          {step === 3 && (
            <div className="space-y-6 py-4">
              {/* Copy Fields */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Copy (campos de texto)</Label>
                
                {copyFields.length > 0 && editingCopyIndex === null && (
                  <div className="space-y-2">
                    {copyFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <span className="text-sm flex-1">
                          {field.name}
                          {field.maxCharacters && <span className="text-muted-foreground ml-1">({field.maxCharacters} chars)</span>}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditCopyField(index)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
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
                      placeholder="Máx. caracter"
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
                  <div className="flex gap-2">
                    {editingCopyIndex !== null && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleCancelEditCopy}>
                        Cancelar
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddCopyField}>
                      <Plus className="h-3 w-3 mr-1" /> {editingCopyIndex !== null ? 'Salvar Copy' : 'Adicionar Copy'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Dimensões (imagens/vídeos)</Label>
                <p className="text-xs text-muted-foreground">Máximo de 10 dimensões</p>
                
                {dimensions.length > 0 && editingDimIndex === null && (
                  <div className="space-y-2">
                    {dimensions.map((dim, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <span className="text-sm flex-1">
                          <span className="font-medium">{dim.description}</span>
                          <span className="text-muted-foreground ml-2">({dim.width} × {dim.height} {dim.unit})</span>
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditDimension(index)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveDimension(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 p-3 border rounded-md">
                  <Input
                    value={newDimDescription}
                    onChange={(e) => setNewDimDescription(e.target.value)}
                    placeholder="Descrição (ex: Logo, Banner, Thumbnail)"
                  />
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Largura</Label>
                      <Input
                        type="number"
                        value={newDimWidth}
                        onChange={(e) => setNewDimWidth(e.target.value)}
                        placeholder="Largura"
                      />
                    </div>
                    <span className="pb-2">×</span>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Altura</Label>
                      <Input
                        type="number"
                        value={newDimHeight}
                        onChange={(e) => setNewDimHeight(e.target.value)}
                        placeholder="Altura"
                      />
                    </div>
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
                  <Textarea
                    value={newDimObservation}
                    onChange={(e) => setNewDimObservation(e.target.value.slice(0, 500))}
                    placeholder="Observações (opcional)"
                    className="min-h-[60px]"
                    maxLength={500}
                  />
                  <div className="flex gap-2">
                    {editingDimIndex !== null && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleCancelEditDim}>
                        Cancelar
                      </Button>
                    )}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddDimension}
                      disabled={editingDimIndex === null && dimensions.length >= 10}
                      className="w-full"
                    >
                      <Plus className="h-3 w-3 mr-1" /> {editingDimIndex !== null ? 'Salvar Dimensão' : 'Adicionar Dimensão'}
                    </Button>
                  </div>
                </div>
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

                <div className="flex gap-2">
                  <Input
                    value={newExtension}
                    onChange={(e) => setNewExtension(e.target.value)}
                    placeholder="Nova extensão (ex: .webp)"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExtension())}
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
                    onCheckedChange={(checked) => setHasDuration(!!checked)}
                  />
                  <Label htmlFor="hasDuration" className="text-sm font-medium cursor-pointer">
                    Tem duração máxima/mínima
                  </Label>
                </div>
                
                {hasDuration && (
                  <div className="flex gap-2 pl-6">
                    <Input
                      type="number"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      placeholder="Valor"
                      className="w-24"
                    />
                    <Select value={durationUnit} onValueChange={setDurationUnit}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s">segundos</SelectItem>
                        <SelectItem value="min">minutos</SelectItem>
                        <SelectItem value="h">horas</SelectItem>
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
                    onCheckedChange={(checked) => setHasWeight(!!checked)}
                  />
                  <Label htmlFor="hasWeight" className="text-sm font-medium cursor-pointer">
                    Peso máximo/mínimo
                  </Label>
                </div>
                
                {hasWeight && (
                  <div className="flex gap-2 pl-6">
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

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {step < 3 ? (
            <Button 
              type="button" 
              onClick={handleNext}
              disabled={step === 1 && (formatNameExists || !formatName.trim())}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" onClick={handleFinish}>
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
