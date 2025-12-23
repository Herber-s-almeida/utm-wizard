import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useCreativeTypes, useFormatSpecifications } from '@/hooks/useFormatsAndSpecs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; creativeTypeId?: string }) => void;
  existingNames?: string[];
  initialData?: {
    id?: string;
    name: string;
    creativeTypeId?: string;
  };
  mode?: 'create' | 'edit';
}

export function FormatDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create'
}: FormatDialogProps) {
  const [name, setName] = useState('');
  const [creativeTypeId, setCreativeTypeId] = useState<string>('');
  const [newTypeName, setNewTypeName] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);
  
  // Specifications state
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecDescription, setNewSpecDescription] = useState('');
  const [editingSpec, setEditingSpec] = useState<{ id: string; name: string; description: string } | null>(null);

  const { data: creativeTypes, create: createType } = useCreativeTypes();
  const { data: specifications, create: createSpec, update: updateSpec, remove: removeSpec } = useFormatSpecifications(initialData?.id);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setCreativeTypeId(initialData?.creativeTypeId || '');
      setNewTypeName('');
      setIsAddingType(false);
      setNewSpecName('');
      setNewSpecDescription('');
      setEditingSpec(null);
    }
  }, [open, initialData]);

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Nome do tipo é obrigatório');
      return;
    }
    
    try {
      const result = await createType.mutateAsync(newTypeName.trim());
      setCreativeTypeId(result.id);
      setNewTypeName('');
      setIsAddingType(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleAddSpec = async () => {
    if (!newSpecName.trim()) {
      toast.error('Nome da especificação é obrigatório');
      return;
    }
    
    if (newSpecName.length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }
    
    if (newSpecDescription.length > 180) {
      toast.error('Descrição deve ter no máximo 180 caracteres');
      return;
    }

    if (!initialData?.id) {
      toast.error('Salve o formato antes de adicionar especificações');
      return;
    }

    try {
      await createSpec.mutateAsync({
        formatId: initialData.id,
        name: newSpecName.trim(),
        description: newSpecDescription.trim() || undefined,
      });
      setNewSpecName('');
      setNewSpecDescription('');
    } catch {
      // Error handled in hook
    }
  };

  const handleUpdateSpec = async () => {
    if (!editingSpec) return;
    
    if (editingSpec.name.length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }
    
    if (editingSpec.description.length > 180) {
      toast.error('Descrição deve ter no máximo 180 caracteres');
      return;
    }

    try {
      await updateSpec.mutateAsync({
        id: editingSpec.id,
        name: editingSpec.name,
        description: editingSpec.description || undefined,
      });
      setEditingSpec(null);
    } catch {
      // Error handled in hook
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome do formato é obrigatório');
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
      toast.error('Já existe um formato com este nome');
      return;
    }

    onSave({
      name: trimmedName,
      creativeTypeId: creativeTypeId || undefined,
    });

    setName('');
    setCreativeTypeId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Criar novo Formato' : 'Editar Formato'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5 py-4">
            {/* Nome do Formato */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Formato *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 25))}
                placeholder="Ex: PPL, Search, Spot de Rádio 10s"
                maxLength={25}
              />
              <p className="text-xs text-muted-foreground">{name.length}/25 caracteres</p>
            </div>

            {/* Tipo de Criativo */}
            <div className="space-y-2">
              <Label>Tipo de Criativo</Label>
              {isAddingType ? (
                <div className="flex gap-2">
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Nome do novo tipo"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleAddType} disabled={createType.isPending}>
                    Criar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsAddingType(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={creativeTypeId} onValueChange={setCreativeTypeId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione ou crie um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {creativeTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setIsAddingType(true)}
                    title="Criar novo tipo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tipos de criativo são compartilhados entre todos os formatos
              </p>
            </div>

            {/* Especificações - only show in edit mode */}
            {mode === 'edit' && initialData?.id && (
              <div className="space-y-3 pt-2 border-t">
                <Label>Especificações</Label>
                
                {/* Lista de especificações existentes */}
                <div className="space-y-2">
                  {specifications?.map((spec) => (
                    <div key={spec.id} className="p-3 border rounded-lg bg-muted/30">
                      {editingSpec?.id === spec.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingSpec.name}
                            onChange={(e) => setEditingSpec({ ...editingSpec, name: e.target.value.slice(0, 25) })}
                            placeholder="Nome"
                            maxLength={25}
                          />
                          <Textarea
                            value={editingSpec.description}
                            onChange={(e) => setEditingSpec({ ...editingSpec, description: e.target.value.slice(0, 180) })}
                            placeholder="Descrição (opcional)"
                            rows={2}
                            maxLength={180}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateSpec} disabled={updateSpec.isPending}>
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSpec(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{spec.name}</p>
                            {spec.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{spec.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => setEditingSpec({ 
                                id: spec.id, 
                                name: spec.name, 
                                description: spec.description || '' 
                              })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeSpec.mutate(spec.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {specifications?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Nenhuma especificação criada
                    </p>
                  )}
                </div>

                {/* Adicionar nova especificação */}
                <div className="p-3 border rounded-lg border-dashed space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Nova Especificação</p>
                  <Input
                    value={newSpecName}
                    onChange={(e) => setNewSpecName(e.target.value.slice(0, 25))}
                    placeholder="Nome da especificação"
                    maxLength={25}
                  />
                  <Textarea
                    value={newSpecDescription}
                    onChange={(e) => setNewSpecDescription(e.target.value.slice(0, 180))}
                    placeholder="Descrição (opcional)"
                    rows={2}
                    maxLength={180}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {newSpecName.length}/25 • {newSpecDescription.length}/180
                    </p>
                    <Button 
                      size="sm" 
                      onClick={handleAddSpec}
                      disabled={createSpec.isPending || !newSpecName.trim()}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Criar' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
