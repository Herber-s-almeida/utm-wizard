import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useCreativeTemplates } from '@/hooks/useConfigData';
import { CreativeDialog } from '@/components/config/CreativeDialog';
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

export default function CreativesPage() {
  const { data: creatives, create, update, remove } = useCreativeTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const existingNames = creatives?.map(c => c.name) || [];

  const handleCreate = (data: any) => {
    create.mutate({
      name: data.name,
      format: data.format,
      dimension: data.dimensions.length > 0 ? JSON.stringify(data.dimensions) : null,
      duration: data.duration || null,
      message: data.message,
      objective: data.objective
    });
  };

  const handleUpdate = (data: any) => {
    if (!editingItem) return;
    update.mutate({
      id: editingItem.id,
      name: data.name,
      format: data.format,
      dimension: data.dimensions.length > 0 ? JSON.stringify(data.dimensions) : null,
      duration: data.duration || null,
      message: data.message,
      objective: data.objective
    });
    setEditingItem(null);
  };

  const parseInitialData = (creative: any) => {
    let dimensions = [];
    try {
      if (creative.dimension) {
        dimensions = JSON.parse(creative.dimension);
      }
    } catch {
      dimensions = [];
    }
    return {
      name: creative.name,
      format: creative.format,
      dimensions,
      duration: creative.duration || '',
      message: creative.message || '',
      objective: creative.objective || ''
    };
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
            <h1 className="text-2xl font-display font-bold">Criativos</h1>
            <p className="text-muted-foreground">Gerencie os templates de criativos</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar novo criativo
          </Button>
        </div>

        <div className="grid gap-3">
          {creatives?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum criativo criado ainda
              </CardContent>
            </Card>
          ) : (
            creatives?.map(creative => (
              <Card key={creative.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-base">{creative.name}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{creative.format}</Badge>
                        {creative.duration && (
                          <Badge variant="outline">{creative.duration}</Badge>
                        )}
                      </div>
                      {creative.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{creative.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingItem(creative); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(creative.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <CreativeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={editingItem ? handleUpdate : handleCreate}
          existingNames={existingNames}
          initialData={editingItem ? parseInitialData(editingItem) : undefined}
          mode={editingItem ? 'edit' : 'create'}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir criativo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Se este criativo estiver vinculado a algum plano, a exclusão falhará.
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
