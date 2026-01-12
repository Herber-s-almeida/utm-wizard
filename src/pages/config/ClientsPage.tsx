import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useClients, Client } from '@/hooks/useClients';
import { ClientDialog } from '@/components/config/ClientDialog';
import { Badge } from '@/components/ui/badge';
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

export default function ClientsPage() {
  const { activeItems: clients, create, update, remove } = useClients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const existingNames = clients?.map(c => c.name) || [];

  const handleCreate = (data: { name: string; description: string; visible_for_media_plans: boolean }) => {
    create.mutate(data);
  };

  const handleUpdate = (data: { name: string; description: string; visible_for_media_plans: boolean }) => {
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
            <h1 className="text-2xl font-display font-bold">Clientes</h1>
            <p className="text-muted-foreground">Gerencie os clientes da sua conta</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar novo cliente
          </Button>
        </div>

        <div className="grid gap-3">
          {clients?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum cliente criado ainda
              </CardContent>
            </Card>
          ) : (
            clients?.map(client => (
              <Card key={client.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{client.name}</CardTitle>
                          {client.visible_for_media_plans !== false ? (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Eye className="h-3 w-3" />
                              Planos
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1 opacity-60">
                              <EyeOff className="h-3 w-3" />
                              Oculto
                            </Badge>
                          )}
                        </div>
                        {client.description && (
                          <p className="text-sm text-muted-foreground">{client.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(client); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(client.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <ClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={editingItem ? handleUpdate : handleCreate}
          existingNames={existingNames}
          initialData={editingItem || undefined}
          mode={editingItem ? 'edit' : 'create'}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação enviará o cliente para a lixeira. Se este cliente estiver vinculado a algum plano, a associação será removida.
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
