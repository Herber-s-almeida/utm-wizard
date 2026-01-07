import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMoments } from '@/hooks/useConfigData';
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

export default function MomentsPage() {
  const { activeItems: moments, data: allMoments, create, update, remove } = useMoments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const existingNames = moments?.map(m => m.name) || [];

  const handleCreate = (data: { name: string; description: string }) => {
    create.mutate({ name: data.name, description: data.description });
  };

  const handleUpdate = (data: { name: string; description: string }) => {
    if (!editingItem) return;
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
            <h1 className="text-2xl font-display font-bold">Momentos de Campanha</h1>
            <p className="text-muted-foreground">Gerencie os momentos de suas campanhas</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar novo momento de campanha
          </Button>
        </div>

        <div className="grid gap-3">
          {moments?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum momento criado ainda
              </CardContent>
            </Card>
          ) : (
            moments?.map(moment => (
              <Card key={moment.id}>
                <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{moment.name}</CardTitle>
                          {(moment as any).is_system && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Padrão
                            </Badge>
                          )}
                        </div>
                        {(moment as any).description && (
                          <p className="text-sm text-muted-foreground">{(moment as any).description}</p>
                        )}
                      </div>
                      {!(moment as any).is_system && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingItem(moment); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(moment.id)} className="text-destructive">
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
          title={editingItem ? 'Editar momento de campanha' : 'Criar novo momento de campanha'}
          nameLabel="Nome do momento"
          namePlaceholder="Ex: Lançamento"
          existingNames={existingNames}
          initialData={editingItem}
          mode={editingItem ? 'edit' : 'create'}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir momento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Se este momento estiver vinculado a algum plano, a exclusão falhará.
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
