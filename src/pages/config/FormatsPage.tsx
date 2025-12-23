import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { useFormatsWithSpecs, useFormatSpecifications } from '@/hooks/useFormatsAndSpecs';
import { FormatDialog } from '@/components/config/FormatDialog';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function FormatsPage() {
  const { data: formats, createFormat, updateFormat, removeFormat } = useFormatsWithSpecs();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openFormats, setOpenFormats] = useState<Record<string, boolean>>({});

  const existingNames = formats?.map(f => f.name) || [];

  const handleCreate = (data: { name: string; creativeTypeId?: string }) => {
    createFormat.mutate(data);
  };

  const handleUpdate = (data: { name: string; creativeTypeId?: string }) => {
    if (!editingItem) return;
    updateFormat.mutate({
      id: editingItem.id,
      name: data.name,
      creativeTypeId: data.creativeTypeId,
    });
    setEditingItem(null);
  };

  const toggleFormat = (id: string) => {
    setOpenFormats(prev => ({ ...prev, [id]: !prev[id] }));
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
            <h1 className="text-2xl font-display font-bold">Formatos e Especificações</h1>
            <p className="text-muted-foreground">Gerencie os formatos e suas especificações</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar novo formato
          </Button>
        </div>

        <div className="grid gap-3">
          {formats?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum formato criado ainda
              </CardContent>
            </Card>
          ) : (
            formats?.map(format => (
              <Card key={format.id}>
                <Collapsible open={openFormats[format.id]} onOpenChange={() => toggleFormat(format.id)}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {openFormats[format.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <CardTitle className="text-base">{format.name}</CardTitle>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {format.creative_type && (
                              <Badge variant="secondary">{format.creative_type.name}</Badge>
                            )}
                            <Badge variant="outline">
                              {format.specifications.length} especificação(ões)
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { 
                            setEditingItem({
                              id: format.id,
                              name: format.name,
                              creativeTypeId: format.creative_type_id,
                            }); 
                            setDialogOpen(true); 
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDeleteId(format.id)} 
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      {format.specifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Nenhuma especificação. Edite o formato para adicionar.
                        </p>
                      ) : (
                        <div className="space-y-2 ml-9">
                          {format.specifications.map(spec => (
                            <div key={spec.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{spec.name}</p>
                                {spec.description && (
                                  <p className="text-xs text-muted-foreground">{spec.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>

        <FormatDialog
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
              <AlertDialogTitle>Excluir formato?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todas as especificações deste formato também serão excluídas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (deleteId) removeFormat.mutate(deleteId); setDeleteId(null); }}
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
