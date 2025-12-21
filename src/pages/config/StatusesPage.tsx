import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ArrowLeft, Lock } from 'lucide-react';
import { useStatuses } from '@/hooks/useStatuses';
import { SimpleConfigDialog } from '@/components/config/SimpleConfigDialog';
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

export default function StatusesPage() {
  const { data: statuses, create, update, remove, initializeSystemStatuses, isSystemStatus } = useStatuses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Initialize system statuses on first load
  useEffect(() => {
    if (statuses && statuses.length === 0) {
      initializeSystemStatuses.mutate();
    }
  }, [statuses]);

  const existingNames = statuses?.map(s => s.name) || [];

  const handleCreate = (data: { name: string; description: string }) => {
    if (data.name.length > 25) {
      return;
    }
    create.mutate({ name: data.name, description: data.description });
  };

  const handleUpdate = (data: { name: string; description: string }) => {
    if (!editingItem) return;
    if (data.name.length > 25) {
      return;
    }
    update.mutate({ id: editingItem.id, name: data.name, description: data.description });
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
            <h1 className="text-2xl font-display font-bold">Status</h1>
            <p className="text-muted-foreground">Gerencie os status das linhas de mídia (máximo 25 caracteres)</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar novo status
          </Button>
        </div>

        <div className="grid gap-3">
          {statuses?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum status criado ainda
              </CardContent>
            </Card>
          ) : (
            statuses?.map(status => (
              <Card key={status.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{status.name}</CardTitle>
                          {isSystemStatus(status) && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Padrão
                            </Badge>
                          )}
                        </div>
                        {status.description && (
                          <p className="text-sm text-muted-foreground">{status.description}</p>
                        )}
                      </div>
                    </div>
                    {!isSystemStatus(status) && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingItem(status); setDialogOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDeleteId(status.id)} 
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <SimpleConfigDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={editingItem ? handleUpdate : handleCreate}
          title={editingItem ? 'Editar status' : 'Criar novo status'}
          nameLabel="Nome do status (máx. 25 caracteres)"
          namePlaceholder="Ex: Em análise"
          existingNames={existingNames}
          initialData={editingItem}
          mode={editingItem ? 'edit' : 'create'}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir status?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Se este status estiver vinculado a alguma linha de mídia, a exclusão falhará.
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
