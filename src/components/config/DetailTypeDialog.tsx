import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineDetailType, FieldSchemaItem, MetadataSchemaItem } from '@/hooks/useLineDetailTypes';
import { FieldSchemaEditor } from './FieldSchemaEditor';
import { Settings2, Grid3X3, ListChecks, FileText } from 'lucide-react';

interface DetailTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: LineDetailType | null;
  onSave: (data: Omit<LineDetailType, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<void>;
}

const ICON_OPTIONS = [
  { value: 'list', label: 'Lista', icon: ListChecks },
  { value: 'grid', label: 'Grade', icon: Grid3X3 },
  { value: 'file', label: 'Arquivo', icon: FileText },
];

const DEFAULT_FIELD_SCHEMA: FieldSchemaItem[] = [
  { key: 'name', label: 'Nome', type: 'text', required: true, width: 200 },
  { key: 'quantity', label: 'Quantidade', type: 'number', width: 100 },
  { key: 'unit_price', label: 'Preço Unitário', type: 'currency', width: 120 },
  { key: 'total', label: 'Total', type: 'currency', width: 120, computed: 'quantity * unit_price' },
];

export function DetailTypeDialog({ open, onOpenChange, type, onSave }: DetailTypeDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('list');
  const [hasInsertionGrid, setHasInsertionGrid] = useState(false);
  const [insertionGridType, setInsertionGridType] = useState('monthly');
  const [fieldSchema, setFieldSchema] = useState<FieldSchemaItem[]>(DEFAULT_FIELD_SCHEMA);
  const [metadataSchema, setMetadataSchema] = useState<MetadataSchemaItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (type) {
      setName(type.name);
      setDescription(type.description || '');
      setIcon(type.icon || 'list');
      setHasInsertionGrid(type.has_insertion_grid);
      setInsertionGridType(type.insertion_grid_type || 'monthly');
      setFieldSchema(type.field_schema.length > 0 ? type.field_schema : DEFAULT_FIELD_SCHEMA);
      setMetadataSchema(type.metadata_schema);
    } else {
      setName('');
      setDescription('');
      setIcon('list');
      setHasInsertionGrid(false);
      setInsertionGridType('monthly');
      setFieldSchema(DEFAULT_FIELD_SCHEMA);
      setMetadataSchema([]);
    }
  }, [type, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        slug: null,
        description: description.trim() || null,
        icon,
        field_schema: fieldSchema,
        metadata_schema: metadataSchema,
        has_insertion_grid: hasInsertionGrid,
        insertion_grid_type: insertionGridType,
        is_system: false,
        is_active: true,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {type ? 'Editar Tipo de Detalhamento' : 'Novo Tipo de Detalhamento'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="fields">Campos</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mídia Programática"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Ícone</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste tipo de detalhamento..."
                rows={3}
              />
            </div>

            {/* Inherited fields warning */}
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm font-medium text-warning mb-2">
                ⚠️ Campos Herdados Automaticamente
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Os seguintes campos <strong>NÃO devem ser incluídos</strong> no schema porque são 
                herdados automaticamente da linha de mídia:
              </p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                <li>Veículo / Emissora / Rádio (vem da linha)</li>
                <li>Meio (vem da linha)</li>
                <li>Canal (vem da linha)</li>
                <li>Praça / Subdivisão (vem da linha)</li>
                <li>Formato (selecionado da biblioteca)</li>
                <li>Duração / Secundagem (vem das especificações do formato)</li>
              </ul>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Grade de Inserções</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite registrar datas de veiculação em um calendário
                  </p>
                </div>
                <Switch
                  checked={hasInsertionGrid}
                  onCheckedChange={setHasInsertionGrid}
                />
              </div>

              {hasInsertionGrid && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Label>Tipo de Grade</Label>
                  <Select value={insertionGridType} onValueChange={setInsertionGridType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="daily">Diária</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fields" className="mt-4">
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground">
                <strong>Dica:</strong> Configure apenas os campos específicos para este tipo de detalhamento. 
                Veículo, Praça, Formato e Duração são exibidos automaticamente a partir da linha de mídia.
              </p>
            </div>
            <FieldSchemaEditor
              fields={fieldSchema}
              onChange={setFieldSchema}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
