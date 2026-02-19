import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineDetailType, FieldSchemaItem, MetadataSchemaItem } from '@/hooks/useLineDetailTypes';
import { FieldSchemaEditor } from './FieldSchemaEditor';
import { detailTypeSchemas, DetailCategory } from '@/utils/detailSchemas';
import { Settings2, Grid3X3, ListChecks, FileText, Lock, ChevronDown, ChevronRight } from 'lucide-react';

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

const COLUMN_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  number: 'Número',
  currency: 'Moeda',
  percentage: 'Porcentagem',
  date: 'Data',
  url: 'URL',
  select: 'Seleção',
  'multi-select': 'Multi-seleção',
  readonly: 'Somente leitura',
  calculated: 'Calculado',
};

const COLUMN_TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-800',
  number: 'bg-green-100 text-green-800',
  currency: 'bg-yellow-100 text-yellow-800',
  percentage: 'bg-purple-100 text-purple-800',
  date: 'bg-pink-100 text-pink-800',
  url: 'bg-cyan-100 text-cyan-800',
  select: 'bg-indigo-100 text-indigo-800',
  'multi-select': 'bg-orange-100 text-orange-800',
  readonly: 'bg-gray-100 text-gray-500',
  calculated: 'bg-emerald-100 text-emerald-800',
};

function isPredefined(type: LineDetailType | null): boolean {
  return !!type?.detail_category && type.detail_category !== 'custom';
}

export function DetailTypeDialog({ open, onOpenChange, type, onSave }: DetailTypeDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('list');
  const [hasInsertionGrid, setHasInsertionGrid] = useState(false);
  const [insertionGridType, setInsertionGridType] = useState('monthly');
  const [fieldSchema, setFieldSchema] = useState<FieldSchemaItem[]>(DEFAULT_FIELD_SCHEMA);
  const [metadataSchema, setMetadataSchema] = useState<MetadataSchemaItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  const predefined = isPredefined(type);
  const schema = predefined && type?.detail_category
    ? detailTypeSchemas[type.detail_category as DetailCategory]
    : null;

  useEffect(() => {
    if (type) {
      setName(type.name);
      setDescription(type.description || '');
      setIcon(type.icon || 'list');
      setHasInsertionGrid(type.has_insertion_grid);
      setInsertionGridType(type.insertion_grid_type || 'monthly');
      setFieldSchema(type.field_schema.length > 0 ? type.field_schema : DEFAULT_FIELD_SCHEMA);
      setMetadataSchema(type.metadata_schema);
      // Expand all blocks by default for predefined
      if (isPredefined(type) && type.detail_category) {
        const s = detailTypeSchemas[type.detail_category as DetailCategory];
        if (s) {
          const expanded: Record<string, boolean> = {};
          s.blocks.forEach(b => { expanded[b.key] = true; });
          setExpandedBlocks(expanded);
        }
      }
    } else {
      setName('');
      setDescription('');
      setIcon('list');
      setHasInsertionGrid(false);
      setInsertionGridType('monthly');
      setFieldSchema(DEFAULT_FIELD_SCHEMA);
      setMetadataSchema([]);
      setExpandedBlocks({});
    }
  }, [type, open]);

  const toggleBlock = (key: string) => {
    setExpandedBlocks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!name.trim() || predefined) return;
    
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        slug: null,
        description: description.trim() || null,
        icon,
        detail_category: null,
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
            {predefined
              ? `Visualizar: ${type?.name}`
              : type ? 'Editar Tipo de Detalhamento' : 'Novo Tipo de Detalhamento'}
            {predefined && <Lock className="h-4 w-4 text-muted-foreground" />}
          </DialogTitle>
        </DialogHeader>

        {predefined && schema ? (
          /* ── Read-only block visualization for predefined types ── */
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                Este é um tipo pré-definido com estrutura fixa. Os blocos e campos são gerenciados automaticamente pelo sistema.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <p className="font-medium">{type?.name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <p className="font-medium">{schema.label}</p>
              </div>
            </div>

            {type?.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <p className="text-sm">{type.description}</p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Estrutura de Blocos</h3>
              {schema.blocks.map(block => (
                <div key={block.key} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleBlock(block.key)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedBlocks[block.key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="text-sm font-medium">{block.label}</span>
                      <Badge variant="outline" className="text-xs">{block.columns.length} campos</Badge>
                      {block.collapsible && (
                        <Badge variant="secondary" className="text-xs">Colapsável</Badge>
                      )}
                    </div>
                  </button>
                  {expandedBlocks[block.key] && (
                    <div className="p-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-2 font-medium text-muted-foreground">Campo</th>
                            <th className="text-left py-1 px-2 font-medium text-muted-foreground">Tipo</th>
                            <th className="text-left py-1 px-2 font-medium text-muted-foreground">Origem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {block.columns.map(col => (
                            <tr key={col.key} className="border-b last:border-0">
                              <td className="py-1.5 px-2">{col.label}</td>
                              <td className="py-1.5 px-2">
                                <Badge variant="outline" className={`text-xs ${COLUMN_TYPE_COLORS[col.type] || ''}`}>
                                  {COLUMN_TYPE_LABELS[col.type] || col.type}
                                </Badge>
                              </td>
                              <td className="py-1.5 px-2 text-muted-foreground">
                                {col.inherited ? `Herdado (${col.inheritSource})` : col.formula ? `Fórmula: ${col.formula}` : 'Editável'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {schema.supportsGrid && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <Grid3X3 className="h-4 w-4" />
                <span>Este tipo suporta grade de inserções mensal com auto-paint por dias da semana.</span>
              </div>
            )}
          </div>
        ) : (
          /* ── Editable form for custom types ── */
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {predefined ? 'Fechar' : 'Cancelar'}
          </Button>
          {!predefined && (
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
