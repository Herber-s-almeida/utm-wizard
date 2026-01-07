import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useMediums } from '@/hooks/useConfigData';
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

export default function MediumsPage() {
  const { activeItems: mediums, create, update, remove } = useMediums();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const existingNames = mediums?.map(m => m.name) || [];

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
            <h1 className="text-2xl font-display font-bold">Meios</h1>
            <p className="text-muted-foreground">Gerencie os meios de comunicação</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar novo meio
          </Button>
        </div>

        <div className="grid gap-3">
          {mediums?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum meio criado ainda
              </CardContent>
            </Card>
          ) : (
            mediums?.map(medium => (
              <Card key={medium.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{medium.name}</CardTitle>
                      {(medium as any).description && (
                        <p className="text-sm text-muted-foreground">{(medium as any).description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(medium); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(medium.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
          title={editingItem ? 'Editar meio' : 'Criar novo meio'}
          nameLabel="Nome do meio"
          namePlaceholder="Ex: Digital"
          existingNames={existingNames}
          initialData={editingItem}
          mode={editingItem ? 'edit' : 'create'}
          helpText="Meio é a categoria geral de comunicação utilizada (ex: Digital, TV, Rádio, OOH). Define o tipo de canal onde os anúncios serão veiculados. Cada meio pode ter vários veículos associados."
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir meio?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Se este meio estiver vinculado a algum plano, a exclusão falhará.
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
