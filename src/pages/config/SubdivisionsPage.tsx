import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Archive, ArrowLeft, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSubdivisions } from '@/hooks/useConfigData';
import { SubdivisionDialog } from '@/components/config/SubdivisionDialog';
import { ArchivedSection } from '@/components/config/ArchivedSection';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function SubdivisionsPage() {
  const { data: subdivisions, activeItems, archivedItems, create, update, softDelete, restore, permanentDelete } = useSubdivisions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const parentSubdivisions = activeItems?.filter(s => !s.parent_id) || [];
  const archivedParents = archivedItems?.filter(s => !s.parent_id) || [];

  const getChildSubdivisions = (parentId: string) => 
    subdivisions?.filter(s => s.parent_id === parentId && !s.deleted_at) || [];

  const existingNames = parentSubdivisions.map(s => s.name);

  const handleCreate = (data: { name: string; description: string; details: { name: string; description: string }[] }) => {
    create.mutate({ name: data.name, description: data.description }, {
      onSuccess: (newSub: any) => {
        data.details.forEach(detail => {
          create.mutate({ name: detail.name, description: detail.description, parent_id: newSub.id });
        });
      }
    });
  };

  const handleEdit = (item: any) => {
    const children = getChildSubdivisions(item.id);
    setEditingItem({
      ...item,
      details: children.map(c => ({ name: c.name, description: c.description || '' }))
    });
    setDialogOpen(true);
  };

  const handleUpdate = (data: { name: string; description: string; details: { name: string; description: string }[] }) => {
    if (!editingItem) return;
    update.mutate({ id: editingItem.id, name: data.name, description: data.description });
    setEditingItem(null);
  };

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
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
            <h1 className="text-2xl font-display font-bold">Subdivisões de Plano</h1>
            <p className="text-muted-foreground">Gerencie as subdivisões para organizar seus planos de mídia</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar nova subdivisão de plano
          </Button>
        </div>

        <div className="space-y-3">
          {parentSubdivisions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma subdivisão criada ainda
              </CardContent>
            </Card>
          ) : (
            parentSubdivisions.map(sub => {
              const children = getChildSubdivisions(sub.id);
              return (
                <Card key={sub.id}>
                  <Collapsible open={openItems[sub.id]} onOpenChange={() => toggleItem(sub.id)}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {children.length > 0 && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {openItems[sub.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{sub.name}</CardTitle>
                            {(sub as any).is_system && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Lock className="h-3 w-3" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                          {(sub as any).description && (
                            <p className="text-sm text-muted-foreground">{(sub as any).description}</p>
                          )}
                        </div>
                        {!(sub as any).is_system && (
                          <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setArchiveId(sub.id)} className="text-orange-600">
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    {children.length > 0 && (
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-3">
                          <div className="pl-8 space-y-2">
                            {children.map(child => (
                              <div key={child.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                <div>
                                  <span className="text-sm">{child.name}</span>
                                  {(child as any).description && (
                                    <p className="text-xs text-muted-foreground">{(child as any).description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600" onClick={() => setArchiveId(child.id)}>
                                    <Archive className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </Card>
              );
            })
          )}
        </div>

        <ArchivedSection
          items={archivedParents}
          onRestore={(id) => restore.mutate(id)}
          onPermanentDelete={(id) => permanentDelete.mutate(id)}
          itemLabel="subdivisão"
          isRestoring={restore.isPending}
          isDeleting={permanentDelete.isPending}
        />

        <SubdivisionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={editingItem ? handleUpdate : handleCreate}
          existingNames={existingNames}
          initialData={editingItem}
          mode={editingItem ? 'edit' : 'create'}
        />

        <AlertDialog open={!!archiveId} onOpenChange={() => setArchiveId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar subdivisão?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta subdivisão será arquivada e não poderá ser usada em novos planos, mas permanecerá visível em planos existentes. Você pode restaurá-la a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (archiveId) softDelete.mutate(archiveId);
                  setArchiveId(null);
                }}
                className="bg-orange-600 text-white hover:bg-orange-700"
              >
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
