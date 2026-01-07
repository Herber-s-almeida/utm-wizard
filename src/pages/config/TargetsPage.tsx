import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft, MapPin, Copy } from 'lucide-react';
import { useTargets } from '@/hooks/useConfigData';
import { TargetDialog } from '@/components/config/TargetDialog';
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

export default function TargetsPage() {
  const { activeItems: targets, data: allTargets, create, update, remove } = useTargets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [duplicatingItem, setDuplicatingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const editingNameLower = editingItem?.name?.trim().toLowerCase();
  const existingNames = (targets?.map(t => t.name) || []).filter(
    n => n.trim().toLowerCase() !== editingNameLower
  );

  const handleCreate = (data: any) => {
    create.mutate(data);
  };

  const handleUpdate = (data: any) => {
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
            <h1 className="text-2xl font-display font-bold">Segmentação e Target</h1>
            <p className="text-muted-foreground">Gerencie as segmentações de público-alvo</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar nova segmentação
          </Button>
        </div>

        <div className="grid gap-3">
          {targets?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma segmentação criada ainda
              </CardContent>
            </Card>
          ) : (
            targets?.map(target => {
              const locations = Array.isArray(target.geolocation) ? target.geolocation : [];
              return (
                <Card key={target.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1 min-w-0">
                        <CardTitle className="text-base">{target.name}</CardTitle>
                        {target.description && (
                          <p className="text-sm text-muted-foreground">{target.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {target.age_range && (
                            <Badge variant="secondary">{target.age_range}</Badge>
                          )}
                          {target.behavior && (
                            <Badge variant="outline">{target.behavior}</Badge>
                          )}
                          {locations.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {locations.length} localização(ões)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => { setDuplicatingItem(target); setEditingItem(null); setDialogOpen(true); }} title="Duplicar">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(target); setDuplicatingItem(null); setDialogOpen(true); }} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(target.id)} className="text-destructive" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>

        <TargetDialog
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
            slug: editingItem.slug,
            age_range: editingItem.age_range || '',
            geolocation: editingItem.geolocation || [],
            behavior: editingItem.behavior || '',
            description: editingItem.description
          } : duplicatingItem ? {
            name: `${duplicatingItem.name} - cópia`,
            slug: '',
            age_range: duplicatingItem.age_range || '',
            geolocation: duplicatingItem.geolocation || [],
            behavior: duplicatingItem.behavior || '',
            description: duplicatingItem.description
          } : undefined}
          mode={editingItem ? 'edit' : 'create'}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir segmentação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Se esta segmentação estiver vinculada a algum plano, a exclusão falhará.
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
