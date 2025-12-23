import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useCreativeTypes } from '@/hooks/useCreativeTypes';
import { CreativeTypeSimpleDialog } from '@/components/config/CreativeTypeSimpleDialog';
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
import { toast } from 'sonner';

export default function CreativeTypesPage() {
  const { data: creativeTypes, isLoading, create, update, remove, checkUsage } = useCreativeTypes();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<{ name: string; usageCount: number } | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);

  const handleCreate = (name: string) => {
    create.mutate(name);
  };

  const handleUpdate = (name: string) => {
    if (!editingType) return;
    update.mutate({ id: editingType.id, name });
    setEditingType(null);
  };

  const handleDeleteClick = async (type: { id: string; name: string }) => {
    setIsCheckingUsage(true);
    try {
      const { inUse, usageCount } = await checkUsage(type.id);
      if (inUse) {
        setDeleteBlocked({ name: type.name, usageCount });
      } else {
        setDeleteTarget(type);
      }
    } catch (err) {
      toast.error('Erro ao verificar uso do tipo de criativo');
    } finally {
      setIsCheckingUsage(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const existingNames = creativeTypes?.map(ct => ct.name) || [];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/config/formats">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">Tipos de Criativo</h1>
            <p className="text-muted-foreground">Gerencie os tipos de criativo disponíveis para seus formatos</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingType(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo de Criativo
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        ) : creativeTypes?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum tipo de criativo criado ainda
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {creativeTypes?.map(type => (
              <Card key={type.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{type.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingType({ id: type.id, name: type.name });
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteClick(type)}
                        disabled={isCheckingUsage}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <CreativeTypeSimpleDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingType(null);
          }}
          onSave={editingType ? handleUpdate : handleCreate}
          existingNames={existingNames}
          initialData={editingType || undefined}
          mode={editingType ? 'edit' : 'create'}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir tipo de criativo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. "{deleteTarget?.name}" será excluído permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Blocked Alert */}
        <AlertDialog open={!!deleteBlocked} onOpenChange={() => setDeleteBlocked(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Não é possível excluir
              </AlertDialogTitle>
              <AlertDialogDescription>
                O tipo de criativo "{deleteBlocked?.name}" está sendo usado em {deleteBlocked?.usageCount} formato(s) ou template(s) de criativo. 
                Remova as associações antes de excluir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setDeleteBlocked(null)}>
                Entendi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
