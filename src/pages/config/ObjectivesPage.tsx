import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft, Copy, Target } from 'lucide-react';
import { useMediaObjectives } from '@/hooks/useConfigData';
import { ObjectiveDialog } from '@/components/config/ObjectiveDialog';
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
import { Badge } from '@/components/ui/badge';

export default function ObjectivesPage() {
  const { activeItems: objectives, create, update, remove } = useMediaObjectives();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [duplicatingItem, setDuplicatingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const editingNameLower = editingItem?.name?.trim().toLowerCase();
  const existingNames = (objectives?.map(o => o.name) || []).filter(
    n => n.trim().toLowerCase() !== editingNameLower
  );

  const handleCreate = (data: { name: string; description?: string }) => {
    create.mutate(data);
  };

  const handleUpdate = (data: { name: string; description?: string }) => {
    if (!editingItem) return;
    update.mutate({ id: editingItem.id, ...data });
    setEditingItem(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/media-plans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">Objetivos de Mídia</h1>
            <p className="text-muted-foreground">Gerencie os objetivos de performance para as linhas de mídia</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar novo objetivo
          </Button>
        </div>

        <div className="grid gap-3">
          {objectives?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum objetivo criado ainda. Exemplos: Cliques, Impressões, Conversões, Visualizações.
              </CardContent>
            </Card>
          ) : (
            objectives?.map(objective => (
              <Card key={objective.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">{objective.name}</CardTitle>
                        {objective.slug && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {objective.slug}
                          </Badge>
                        )}
                      </div>
                      {objective.description && (
                        <p className="text-sm text-muted-foreground">{objective.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { 
                          setDuplicatingItem(objective); 
                          setEditingItem(null); 
                          setDialogOpen(true); 
                        }} 
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { 
                          setEditingItem(objective); 
                          setDuplicatingItem(null); 
                          setDialogOpen(true); 
                        }} 
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteId(objective.id)} 
                        className="text-destructive" 
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <ObjectiveDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setDuplicatingItem(null);
            }
          }}
          onSave={(data) => {
            if (editingItem) {
              handleUpdate(data);
            } else {
              handleCreate(data);
            }
            setDuplicatingItem(null);
          }}
          existingNames={existingNames}
          initialData={editingItem ? {
            name: editingItem.name,
            description: editingItem.description || ''
          } : duplicatingItem ? {
            name: `${duplicatingItem.name} - cópia`,
            description: duplicatingItem.description || ''
          } : undefined}
          mode={editingItem ? 'edit' : 'create'}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Se este objetivo estiver vinculado a alguma linha de mídia, a exclusão falhará.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (deleteId) remove.mutate(deleteId); setDeleteId(null); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
