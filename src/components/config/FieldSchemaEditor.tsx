import { useState } from 'react';
import { FieldSchemaItem } from '@/hooks/useLineDetailTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface FieldSchemaEditorProps {
  fields: FieldSchemaItem[];
  onChange: (fields: FieldSchemaItem[]) => void;
}

const FIELD_TYPES: { value: FieldSchemaItem['type']; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moeda' },
  { value: 'percentage', label: 'Percentual' },
  { value: 'date', label: 'Data' },
  { value: 'time', label: 'Hora' },
  { value: 'select', label: 'Seleção' },
];

function generateKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function FieldSchemaEditor({ fields, onChange }: FieldSchemaEditorProps) {
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpandedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addField = () => {
    const newField: FieldSchemaItem = {
      key: `field_${Date.now()}`,
      label: 'Novo Campo',
      type: 'text',
      required: false,
      width: 150,
    };
    onChange([...fields, newField]);
    setExpandedFields(prev => ({ ...prev, [newField.key]: true }));
  };

  const updateField = (index: number, updates: Partial<FieldSchemaItem>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    
    // Auto-generate key from label if label changed
    if (updates.label && !updates.key) {
      updated[index].key = generateKey(updates.label);
    }
    
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= fields.length) return;
    const updated = [...fields];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Campos do Formulário</Label>
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Campo
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <Card key={field.key} className="overflow-hidden">
            <Collapsible open={expandedFields[field.key]}>
              <CollapsibleTrigger asChild>
                <div 
                  className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpanded(field.key)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 flex items-center gap-3">
                    <span className="font-medium">{field.label}</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                      {FIELD_TYPES.find(t => t.value === field.type)?.label}
                    </span>
                    {field.required && (
                      <span className="text-xs text-destructive">Obrigatório</span>
                    )}
                    {field.computed && (
                      <span className="text-xs text-primary">Calculado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveField(index, index - 1);
                      }}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveField(index, index + 1);
                      }}
                      disabled={index === fields.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {expandedFields[field.key] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="border-t pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Rótulo *</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="Nome do campo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Chave</Label>
                      <Input
                        value={field.key}
                        onChange={(e) => updateField(index, { key: e.target.value })}
                        placeholder="campo_chave"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={field.type}
                        onValueChange={(value: FieldSchemaItem['type']) => updateField(index, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Largura (px)</Label>
                      <Input
                        type="number"
                        value={field.width || ''}
                        onChange={(e) => updateField(index, { width: parseInt(e.target.value) || undefined })}
                        placeholder="Auto"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <Switch
                        checked={field.required || false}
                        onCheckedChange={(checked) => updateField(index, { required: checked })}
                      />
                      <Label>Obrigatório</Label>
                    </div>
                  </div>

                  {field.type === 'select' && (
                    <div className="space-y-2">
                      <Label>Opções (uma por linha)</Label>
                      <textarea
                        className="w-full min-h-[80px] p-2 border rounded-md text-sm font-mono"
                        value={field.options?.join('\n') || ''}
                        onChange={(e) => updateField(index, { 
                          options: e.target.value.split('\n').filter(Boolean) 
                        })}
                        placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Fórmula de Cálculo</Label>
                    <Input
                      value={field.computed || ''}
                      onChange={(e) => updateField(index, { computed: e.target.value || undefined })}
                      placeholder="Ex: quantity * unit_price"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use as chaves dos campos para criar fórmulas. Ex: quantity * unit_price
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {fields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Nenhum campo configurado</p>
            <Button variant="link" onClick={addField}>
              Adicionar primeiro campo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
