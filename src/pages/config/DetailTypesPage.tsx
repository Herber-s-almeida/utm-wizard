import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLineDetailTypes, LineDetailType, FieldSchemaItem } from '@/hooks/useLineDetailTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Grid3X3, FileText, ListChecks, Settings2, Copy } from 'lucide-react';
import { DetailTypeDialog } from '@/components/config/DetailTypeDialog';
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

function getFieldTypeBadge(type: FieldSchemaItem['type']) {
  const colors: Record<string, string> = {
    text: 'bg-blue-100 text-blue-800',
    number: 'bg-green-100 text-green-800',
    currency: 'bg-yellow-100 text-yellow-800',
    percentage: 'bg-purple-100 text-purple-800',
    date: 'bg-pink-100 text-pink-800',
    time: 'bg-orange-100 text-orange-800',
    select: 'bg-indigo-100 text-indigo-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

export default function DetailTypesPage() {
  const { types, isLoading, create, update, delete: deleteType } = useLineDetailTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LineDetailType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<LineDetailType | null>(null);

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
      field_schema: type.field_schema,
      metadata_schema: type.metadata_schema,
      has_insertion_grid: type.has_insertion_grid,
      insertion_grid_type: type.insertion_grid_type,
      is_system: false,
      is_active: true,
    });
  };

  const handleDelete = (type: LineDetailType) => {
    if (type.is_system) return;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tipos de Detalhamento</h1>
            <p className="text-muted-foreground">
              Configure os tipos de detalhamento disponíveis para as linhas de mídia
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : types.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum tipo configurado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie seu primeiro tipo de detalhamento para começar a usar
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Tipo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map(type => (
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
                          {type.is_system && (
                            <Badge variant="secondary" className="text-xs">Sistema</Badge>
                          )}
                        </CardTitle>
                        {type.description && (
                          <CardDescription className="text-xs mt-1">
                            {type.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Field schema preview */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Campos ({type.field_schema.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {type.field_schema.slice(0, 5).map(field => (
                        <Badge 
                          key={field.key} 
                          variant="outline" 
                          className={`text-xs ${getFieldTypeBadge(field.type)}`}
                        >
                          {field.label}
                        </Badge>
                      ))}
                      {type.field_schema.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{type.field_schema.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Insertion grid info */}
                  {type.has_insertion_grid && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Grid3X3 className="h-3.5 w-3.5" />
                      <span>
                        Grade de inserções: {type.insertion_grid_type === 'daily' ? 'Diária' : 'Mensal'}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(type)}
                      className="flex-1"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(type)}
                      className="flex-1"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Duplicar
                    </Button>
                    {!type.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(type)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
