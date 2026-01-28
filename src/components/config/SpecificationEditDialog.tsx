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
import { Plus, X, Check, Pencil, Trash2 } from 'lucide-react';
import { useFileExtensions, CreativeTypeSpecification, SpecificationCopyField, SpecificationDimension } from '@/hooks/useFormatsHierarchy';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnvironment } from '@/contexts/EnvironmentContext';

interface SpecificationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specification: CreativeTypeSpecification | null;
  onComplete?: () => void;
}

interface CopyField {
  id?: string;
  name: string;
  maxCharacters: number | null;
  observation: string;
}

interface Dimension {
  id?: string;
  width: number;
  height: number;
  unit: string;
  description: string;
  observation: string;
}

export function SpecificationEditDialog({ open, onOpenChange, specification, onComplete }: SpecificationEditDialogProps) {
  const queryClient = useQueryClient();
  const { currentEnvironmentId } = useEnvironment();
  const fileExtensions = useFileExtensions();
  
  // Specification name
  const [specName, setSpecName] = useState('');
  
  // Copy fields
  const [copyFields, setCopyFields] = useState<CopyField[]>([]);
  const [newCopyName, setNewCopyName] = useState('');
  const [newCopyMaxChars, setNewCopyMaxChars] = useState<string>('');
  const [newCopyObservation, setNewCopyObservation] = useState('');
  const [editingCopyIndex, setEditingCopyIndex] = useState<number | null>(null);
  
  // Dimensions
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [newDimWidth, setNewDimWidth] = useState('');
  const [newDimHeight, setNewDimHeight] = useState('');
  const [newDimUnit, setNewDimUnit] = useState('px');
  const [newDimDescription, setNewDimDescription] = useState('');
  const [newDimObservation, setNewDimObservation] = useState('');
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [existingExtensionIds, setExistingExtensionIds] = useState<string[]>([]);

  // Load existing data when dialog opens
  useEffect(() => {
    if (open && specification) {
      setSpecName(specification.name || '');
      setHasDuration(specification.has_duration || false);
      setDurationValue(specification.duration_value?.toString() || '');
      setDurationUnit(specification.duration_unit || 's');
      setHasWeight(!!specification.max_weight);
      setWeightValue(specification.max_weight?.toString() || '');
      setWeightUnit(specification.weight_unit || 'MB');
      
      // Load copy fields
      const existingCopyFields = (specification.copy_fields || []).map(cf => ({
        id: cf.id,
        name: cf.name,
        maxCharacters: cf.max_characters,
        observation: cf.observation || '',
      }));
      setCopyFields(existingCopyFields);
      
      // Load dimensions
      const existingDimensions = (specification.dimensions || []).map(d => ({
        id: d.id,
        width: d.width,
        height: d.height,
        unit: d.unit,
        description: d.description || '',
        observation: d.observation || '',
      }));
      setDimensions(existingDimensions);
      
      // Load extensions
      loadExtensions();
    }
  }, [open, specification]);

  const loadExtensions = async () => {
    if (!specification) return;
    
    const { data: exts } = await supabase
      .from('specification_extensions')
      .select('extension_id')
      .eq('specification_id', specification.id);
    
    const extIds = exts?.map(e => e.extension_id) || [];
    setSelectedExtensions(extIds);
    setExistingExtensionIds(extIds);
  };

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSpecName('');
      setCopyFields([]);
      setDimensions([]);
      setSelectedExtensions([]);
      setExistingExtensionIds([]);
      setNewCopyName('');
      setNewCopyMaxChars('');
      setNewCopyObservation('');
      setEditingCopyIndex(null);
      setNewDimWidth('');
      setNewDimHeight('');
      setNewDimUnit('px');
      setNewDimDescription('');
      setNewDimObservation('');
      setEditingDimIndex(null);
      setHasDuration(false);
      setDurationValue('');
      setDurationUnit('s');
      setHasWeight(false);
      setWeightValue('');
      setWeightUnit('MB');
      setNewExtension('');
    }
  }, [open]);

  const handleAddCopyField = () => {
    if (!newCopyName.trim()) {
      toast.error('Nome do campo é obrigatório');
      return;
    }
    
    if (editingCopyIndex !== null) {
      const updated = [...copyFields];
      updated[editingCopyIndex] = {
        ...updated[editingCopyIndex],
        name: newCopyName.trim(),
        maxCharacters: newCopyMaxChars ? parseInt(newCopyMaxChars) : null,
        observation: newCopyObservation.trim()
      };
      setCopyFields(updated);
      setEditingCopyIndex(null);
    } else {
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

  const handleRemoveCopyField = (index: number) => {
    setCopyFields(copyFields.filter((_, i) => i !== index));
    if (editingCopyIndex === index) {
      setEditingCopyIndex(null);
      setNewCopyName('');
      setNewCopyMaxChars('');
      setNewCopyObservation('');
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
    
    if (editingDimIndex !== null) {
      const updated = [...dimensions];
      updated[editingDimIndex] = { 
        ...updated[editingDimIndex],
        width, 
        height, 
        unit: newDimUnit, 
        description: newDimDescription.trim(),
        observation: newDimObservation.trim()
      };
      setDimensions(updated);
      setEditingDimIndex(null);
    } else {
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

  const handleRemoveDimension = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
    if (editingDimIndex === index) {
      setEditingDimIndex(null);
      setNewDimWidth('');
      setNewDimHeight('');
      setNewDimDescription('');
      setNewDimObservation('');
    }
  };

  const handleAddExtension = async () => {
    if (!newExtension.trim()) return;
    const ext = newExtension.startsWith('.') ? newExtension.toLowerCase() : `.${newExtension.toLowerCase()}`;
    
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

  const handleSave = async () => {
    if (!specification) return;
    
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        toast.error('Usuário não autenticado');
        return;
      }

      // 1. Update specification
      const { error: specError } = await supabase
        .from('creative_type_specifications')
        .update({
          name: specName.trim(),
          has_duration: hasDuration,
          duration_value: hasDuration && durationValue ? parseFloat(durationValue) : null,
          duration_unit: hasDuration ? durationUnit : null,
          max_weight: hasWeight && weightValue ? parseFloat(weightValue) : null,
          weight_unit: hasWeight ? weightUnit : null,
        })
        .eq('id', specification.id);
      
      if (specError) throw specError;
      
      // 2. Handle copy fields - delete removed, update existing, add new
      const existingCopyIds = (specification.copy_fields || []).map(cf => cf.id);
      const currentCopyIds = copyFields.filter(cf => cf.id).map(cf => cf.id!);
      const deletedCopyIds = existingCopyIds.filter(id => !currentCopyIds.includes(id));
      
      // Soft delete removed copy fields
      for (const id of deletedCopyIds) {
        await supabase.from('specification_copy_fields')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
      }
      
      // Update/create copy fields
      for (const cf of copyFields) {
        if (cf.id) {
          await supabase.from('specification_copy_fields')
            .update({
              name: cf.name,
              max_characters: cf.maxCharacters,
              observation: cf.observation || null,
            })
            .eq('id', cf.id);
        } else {
          await supabase.from('specification_copy_fields').insert({
            specification_id: specification.id,
            name: cf.name,
            max_characters: cf.maxCharacters,
            observation: cf.observation || null,
            user_id: userId,
            environment_id: currentEnvironmentId,
          });
        }
      }
      
      // 3. Handle dimensions
      const existingDimIds = (specification.dimensions || []).map(d => d.id);
      const currentDimIds = dimensions.filter(d => d.id).map(d => d.id!);
      const deletedDimIds = existingDimIds.filter(id => !currentDimIds.includes(id));
      
      // Soft delete removed dimensions
      for (const id of deletedDimIds) {
        await supabase.from('specification_dimensions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
      }
      
      // Update/create dimensions
      for (const dim of dimensions) {
        if (dim.id) {
          await supabase.from('specification_dimensions')
            .update({
              width: dim.width,
              height: dim.height,
              unit: dim.unit,
              description: dim.description,
              observation: dim.observation || null,
            })
            .eq('id', dim.id);
        } else {
          await supabase.from('specification_dimensions').insert({
            specification_id: specification.id,
            width: dim.width,
            height: dim.height,
            unit: dim.unit,
            description: dim.description,
            observation: dim.observation || null,
            user_id: userId,
            environment_id: currentEnvironmentId,
          });
        }
      }
      
      // 4. Handle extensions - add new, remove deleted
      const addedExtensions = selectedExtensions.filter(id => !existingExtensionIds.includes(id));
      const removedExtensions = existingExtensionIds.filter(id => !selectedExtensions.includes(id));
      
      for (const extId of addedExtensions) {
        await supabase.from('specification_extensions').insert({
          specification_id: specification.id,
          extension_id: extId,
          user_id: userId,
          environment_id: currentEnvironmentId,
        });
      }
      
      for (const extId of removedExtensions) {
        await supabase.from('specification_extensions')
          .delete()
          .eq('specification_id', specification.id)
          .eq('extension_id', extId);
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['formats_hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['formats'] });
      
      toast.success('Especificação atualizada!');
      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar especificação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Especificação</DialogTitle>
          <DialogDescription>
            Modifique os campos de texto, dimensões, extensões e outras configurações.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Specification Name */}
            <div className="space-y-2">
              <Label htmlFor="specName">Nome da Especificação</Label>
              <Input
                id="specName"
                value={specName}
                onChange={(e) => setSpecName(e.target.value)}
                placeholder="Nome da especificação"
              />
            </div>
            
            {/* Copy Fields Section */}
            <div className="space-y-3">
              <Label>Campos de Texto (Copy)</Label>
              
              {copyFields.map((cf, idx) => (
                <div key={cf.id || idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{cf.name}</span>
                    {cf.maxCharacters && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (máx. {cf.maxCharacters} caracteres)
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditCopyField(idx)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveCopyField(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do campo"
                  value={newCopyName}
                  onChange={(e) => setNewCopyName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Máx. caracteres"
                  type="number"
                  value={newCopyMaxChars}
                  onChange={(e) => setNewCopyMaxChars(e.target.value)}
                  className="w-32"
                />
                <Button variant="outline" size="sm" onClick={handleAddCopyField}>
                  {editingCopyIndex !== null ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              
              <Textarea
                placeholder="Observação (opcional)"
                value={newCopyObservation}
                onChange={(e) => setNewCopyObservation(e.target.value)}
                rows={2}
              />
            </div>
            
            {/* Dimensions Section */}
            <div className="space-y-3">
              <Label>Dimensões</Label>
              
              {dimensions.map((dim, idx) => (
                <div key={dim.id || idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{dim.description}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({dim.width}x{dim.height}{dim.unit})
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditDimension(idx)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveDimension(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              <div className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="Largura"
                  type="number"
                  value={newDimWidth}
                  onChange={(e) => setNewDimWidth(e.target.value)}
                />
                <Input
                  placeholder="Altura"
                  type="number"
                  value={newDimHeight}
                  onChange={(e) => setNewDimHeight(e.target.value)}
                />
                <Select value={newDimUnit} onValueChange={setNewDimUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="px">px</SelectItem>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="mm">mm</SelectItem>
                    <SelectItem value="in">in</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleAddDimension}>
                  {editingDimIndex !== null ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              
              <Input
                placeholder="Descrição *"
                value={newDimDescription}
                onChange={(e) => setNewDimDescription(e.target.value)}
              />
              
              <Textarea
                placeholder="Observação (opcional)"
                value={newDimObservation}
                onChange={(e) => setNewDimObservation(e.target.value)}
                rows={2}
              />
            </div>
            
            {/* Extensions Section */}
            <div className="space-y-3">
              <Label>Extensões de Arquivo</Label>
              
              <div className="flex flex-wrap gap-1.5">
                {fileExtensions.data?.map(ext => (
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
              
              <div className="flex gap-2">
                <Input
                  placeholder="Nova extensão (ex: .webp)"
                  value={newExtension}
                  onChange={(e) => setNewExtension(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExtension()}
                />
                <Button variant="outline" size="sm" onClick={handleAddExtension}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Duration Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasDuration"
                  checked={hasDuration}
                  onCheckedChange={(checked) => setHasDuration(!!checked)}
                />
                <Label htmlFor="hasDuration">Tem duração</Label>
              </div>
              
              {hasDuration && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Valor"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="w-24"
                  />
                  <Select value={durationUnit} onValueChange={setDurationUnit}>
                    <SelectTrigger className="w-24">
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
            
            {/* Weight Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasWeight"
                  checked={hasWeight}
                  onCheckedChange={(checked) => setHasWeight(!!checked)}
                />
                <Label htmlFor="hasWeight">Peso máximo</Label>
              </div>
              
              {hasWeight && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Valor"
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                    className="w-24"
                  />
                  <Select value={weightUnit} onValueChange={setWeightUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KB">KB</SelectItem>
                      <SelectItem value="MB">MB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
