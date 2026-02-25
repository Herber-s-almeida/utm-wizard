import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLineDetailTypes, LineDetailType } from '@/hooks/useLineDetailTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Grid3X3, FileText, ListChecks, Settings2, Copy, Monitor, Radio, Tv, MapPin } from 'lucide-react';
import { DetailTypeDialog } from '@/components/config/DetailTypeDialog';
import { detailTypeSchemas, DetailCategory } from '@/utils/detailSchemas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'list': <ListChecks className="h-5 w-5" />,
  'grid': <Grid3X3 className="h-5 w-5" />,
  'file': <FileText className="h-5 w-5" />,
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'ooh': <MapPin className="h-5 w-5" />,
  'radio': <Radio className="h-5 w-5" />,
  'tv': <Tv className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  'ooh': 'bg-warning/10 text-warning',
  'radio': 'bg-primary/10 text-primary',
  'tv': 'bg-accent/10 text-accent',
};

function isPredefined(type: LineDetailType): boolean {
  return !!type.detail_category && type.detail_category !== 'custom';
}

export default function DetailTypesPage() {
  const { types, isLoading, create, update, delete: deleteType } = useLineDetailTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LineDetailType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<LineDetailType | null>(null);

  const predefinedTypes = types.filter(isPredefined);
  const customTypes = types.filter(t => !isPredefined(t));

  const handleCreate = () => {
    setEditingType(null);
    setDialogOpen(true);
  };

  const handleEdit = (type: LineDetailType) => {
    setEditingType(type);
    setDialogOpen(true);
  };

  const handleDuplicate = async (type: LineDetailType) => {
    await create({
      name: `${type.name} (cópia)`,
      slug: type.slug ? `${type.slug}-copia` : null,
      description: type.description,
      icon: type.icon,
      detail_category: null,
      field_schema: type.field_schema,
      metadata_schema: type.metadata_schema,
      has_insertion_grid: type.has_insertion_grid,
      insertion_grid_type: type.insertion_grid_type,
      is_system: false,
      is_active: true,
    });
  };

  const handleDelete = (type: LineDetailType) => {
    if (type.is_system || isPredefined(type)) return;
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (typeToDelete) {
      await deleteType(typeToDelete.id);
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    }
  };

  const handleSave = async (data: Omit<LineDetailType, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
    if (editingType) {
      await update({ id: editingType.id, ...data });
    } else {
      await create(data);
    }
    setDialogOpen(false);
  };

  const renderPredefinedCard = (type: LineDetailType) => {
    const cat = type.detail_category as DetailCategory;
    const schema = detailTypeSchemas[cat];
    const blockNames = schema?.blocks.map(b => b.label) || [];
    const totalCols = schema?.blocks.reduce((s, b) => s + b.columns.length, 0) || 0;

    return (
      <Card key={type.id} className="group relative border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${CATEGORY_COLORS[cat] || 'bg-primary/10 text-primary'}`}>
                {CATEGORY_ICONS[cat] || <Monitor className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {type.name}
                  <Badge variant="secondary" className="text-xs">Pré-definido</Badge>
                </CardTitle>
                {type.description && (
                  <CardDescription className="text-xs mt-1">{type.description}</CardDescription>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Block structure preview */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Blocos ({blockNames.length}) · {totalCols} campos
            </p>
            <div className="flex flex-wrap gap-1">
              {blockNames.map(name => (
                <Badge key={name} variant="outline" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Grid support */}
          {schema?.supportsGrid && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>Suporta grade de inserções</span>
            </div>
          )}

          {/* Type-specific fields */}
          {cat === 'ooh' && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Campos exclusivos:</span> Ponto OOH, Tipo de Ponto, Localização
            </div>
          )}
          {(cat === 'radio' || cat === 'tv') && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Campos exclusivos:</span> Programa, Faixa Horária
            </div>
          )}

          {/* Actions - limited for predefined */}
          <div className="flex items-center gap-1 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(type)} className="flex-1">
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Visualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCustomCard = (type: LineDetailType) => (
    <Card key={type.id} className="group relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              {TYPE_ICONS[type.icon || 'list'] || <ListChecks className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {type.name}
                {type.is_system && <Badge variant="secondary" className="text-xs">Sistema</Badge>}
              </CardTitle>
              {type.description && (
                <CardDescription className="text-xs mt-1">{type.description}</CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Campos ({type.field_schema.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {type.field_schema.slice(0, 5).map(field => (
              <Badge key={field.key} variant="outline" className="text-xs">
                {field.label}
              </Badge>
            ))}
            {type.field_schema.length > 5 && (
              <Badge variant="outline" className="text-xs">+{type.field_schema.length - 5}</Badge>
            )}
          </div>
        </div>

        {type.has_insertion_grid && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>Grade de inserções: {type.insertion_grid_type === 'daily' ? 'Diária' : 'Mensal'}</span>
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(type)} className="flex-1">
            <Edit2 className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDuplicate(type)} className="flex-1">
            <Copy className="h-3.5 w-3.5 mr-1" />
            Duplicar
          </Button>
          {!type.is_system && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(type)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configurar Linhas de Mídia</h1>
            <p className="text-muted-foreground">
              Configure os tipos de detalhamento disponíveis para as linhas de mídia
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo Personalizado
          </Button>
        </div>

        {/* Explanatory Card */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Os tipos <strong>pré-definidos</strong> (OOH, Rádio, TV) possuem uma estrutura otimizada 
              com blocos de Campanha, Formato e Mensagem, Financeiro e Período, incluindo cálculos 
              automáticos e grade de inserções. Tipos <strong>personalizados</strong> permitem criar 
              schemas livres para outros meios.
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted rounded" />
                </CardHeader>
                <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Pre-defined types */}
            {predefinedTypes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Tipos Pré-definidos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {predefinedTypes.map(renderPredefinedCard)}
                </div>
              </div>
            )}

            {/* Custom types */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Tipos Personalizados</h2>
              {customTypes.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum tipo personalizado</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Crie um tipo personalizado para meios que não sejam OOH, Rádio ou TV
                    </p>
                    <Button onClick={handleCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Tipo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTypes.map(renderCustomCard)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <DetailTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={editingType}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo de detalhamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Detalhamentos existentes que usam este tipo
              continuarão funcionando, mas novos não poderão ser criados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
