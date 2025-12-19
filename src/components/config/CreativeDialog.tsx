import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Dimension {
  width: string;
  height: string;
  unit: 'px' | 'cm' | 'mm' | 'm';
}

const FORMAT_OPTIONS = ['video', 'estático', 'motion', 'audio', 'texto'];

interface CreativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    format: string;
    dimensions: Dimension[];
    duration: string;
    message: string;
    objective: string;
  }) => void;
  existingNames?: string[];
  initialData?: {
    name: string;
    format: string;
    dimensions: Dimension[];
    duration: string;
    message: string;
    objective: string;
  };
  mode?: 'create' | 'edit';
}

export function CreativeDialog({
  open,
  onOpenChange,
  onSave,
  existingNames = [],
  initialData,
  mode = 'create'
}: CreativeDialogProps) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('');
  const [customFormat, setCustomFormat] = useState('');
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [duration, setDuration] = useState('');
  const [message, setMessage] = useState('');
  const [objective, setObjective] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      const formatValue = initialData?.format || '';
      if (FORMAT_OPTIONS.includes(formatValue.toLowerCase())) {
        setFormat(formatValue.toLowerCase());
        setCustomFormat('');
      } else if (formatValue) {
        setFormat('custom');
        setCustomFormat(formatValue);
      } else {
        setFormat('');
        setCustomFormat('');
      }
      setDimensions(initialData?.dimensions || []);
      setDuration(initialData?.duration || '');
      setMessage(initialData?.message || '');
      setObjective(initialData?.objective || '');
    }
  }, [open, initialData]);

  const handleAddDimension = () => {
    if (dimensions.length >= 25) {
      toast.error('Limite máximo de 25 dimensões atingido');
      return;
    }
    setDimensions([...dimensions, { width: '', height: '', unit: 'px' }]);
  };

  const handleRemoveDimension = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
  };

  const handleDimensionChange = (index: number, field: keyof Dimension, value: string) => {
    const newDimensions = [...dimensions];
    if (field === 'width' || field === 'height') {
      // Only allow numbers up to 6 digits
      const numValue = value.replace(/\D/g, '').slice(0, 6);
      newDimensions[index][field] = numValue;
    } else {
      newDimensions[index][field] = value as any;
    }
    setDimensions(newDimensions);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      toast.error('Nome do criativo é obrigatório');
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
      toast.error('Já existe um criativo com este nome');
      return;
    }

    const finalFormat = format === 'custom' ? customFormat : format;
    if (!finalFormat) {
      toast.error('Formato é obrigatório');
      return;
    }

    if (!message.trim()) {
      toast.error('Mensagem é obrigatória');
      return;
    }

    if (!objective.trim()) {
      toast.error('Objetivo é obrigatório');
      return;
    }

    onSave({
      name: trimmedName,
      format: finalFormat,
      dimensions: dimensions.filter(d => d.width || d.height),
      duration,
      message: message.trim(),
      objective: objective.trim()
    });

    setName('');
    setFormat('');
    setCustomFormat('');
    setDimensions([]);
    setDuration('');
    setMessage('');
    setObjective('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Criar novo criativo' : 'Editar criativo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do criativo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 25))}
              placeholder="Ex: Video YouTube"
              maxLength={25}
            />
            <p className="text-xs text-muted-foreground">{name.length}/25 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label>Formato *</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o formato" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Outro (personalizado)</SelectItem>
              </SelectContent>
            </Select>
            {format === 'custom' && (
              <Input
                value={customFormat}
                onChange={(e) => setCustomFormat(e.target.value)}
                placeholder="Nome do formato personalizado"
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Dimensões</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddDimension}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar dimensão
              </Button>
            </div>

            {dimensions.map((dim, index) => (
              <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                <Input
                  value={dim.width}
                  onChange={(e) => handleDimensionChange(index, 'width', e.target.value)}
                  placeholder="Largura"
                  className="w-24"
                  maxLength={6}
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  value={dim.height}
                  onChange={(e) => handleDimensionChange(index, 'height', e.target.value)}
                  placeholder="Altura"
                  className="w-24"
                  maxLength={6}
                />
                <Select
                  value={dim.unit}
                  onValueChange={(value) => handleDimensionChange(index, 'unit', value)}
                >
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveDimension(index)}
                  className="h-8 w-8 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {dimensions.length > 0 && (
              <p className="text-xs text-muted-foreground">{dimensions.length}/25 dimensões</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Secundagem</Label>
            <Input
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 30s, 15s"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mensagem principal do criativo..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">Objetivo *</Label>
            <Textarea
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Objetivo do criativo..."
              rows={2}
            />
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
