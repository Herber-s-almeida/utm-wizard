import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useFormatsHierarchy, useFormats, useFormatCreativeTypes } from '@/hooks/useFormatsHierarchy';
import { FormatDialog } from '@/components/config/FormatDialog';
import { CreativeTypeDialog } from '@/components/config/CreativeTypeDialog';
import { SpecificationDialog } from '@/components/config/SpecificationDialog';
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
  const { data: formatsHierarchy, isLoading } = useFormatsHierarchy();
  const { create: createFormat, update: updateFormat, remove: removeFormat } = useFormats();
  
  // Dialog states
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [creativeTypeDialogOpen, setCreativeTypeDialogOpen] = useState(false);
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  
  // Edit states
  const [editingFormat, setEditingFormat] = useState<{ id: string; name: string } | null>(null);
  const [editingCreativeType, setEditingCreativeType] = useState<{ id: string; name: string; formatId: string } | null>(null);
  const [editingSpec, setEditingSpec] = useState<any>(null);
  
  // Context for creating
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [selectedCreativeTypeId, setSelectedCreativeTypeId] = useState<string | null>(null);
  
  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'format' | 'creativeType' | 'specification'; id: string; name: string } | null>(null);
  
  // Collapse states
  const [openFormats, setOpenFormats] = useState<Record<string, boolean>>({});
  const [openCreativeTypes, setOpenCreativeTypes] = useState<Record<string, boolean>>({});

  const toggleFormat = (id: string) => {
    setOpenFormats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCreativeType = (id: string) => {
    setOpenCreativeTypes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFormat = (name: string) => {
    createFormat.mutate(name);
  };

  const handleUpdateFormat = (name: string) => {
    if (!editingFormat) return;
    updateFormat.mutate({ id: editingFormat.id, name });
    setEditingFormat(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'format') {
      removeFormat.mutate(deleteTarget.id);
    }
    // Creative type and specification deletions are handled in their respective hooks
    setDeleteTarget(null);
  };

  const existingFormatNames = formatsHierarchy?.map(f => f.name) || [];

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
            <p className="text-muted-foreground">Gerencie os formatos padrão para seus criativos</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingFormat(null); setFormatDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Formato
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        ) : formatsHierarchy?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum formato criado ainda
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {formatsHierarchy?.map(format => (
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
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{format.name}</CardTitle>
                            {format.is_system && (
                              <Badge variant="secondary" className="text-xs">Padrão</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format.creative_types.length} tipo(s) de criativo
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { 
                            setSelectedFormatId(format.id);
                            setEditingCreativeType(null);
                            setCreativeTypeDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Tipo de Criativo
                        </Button>
                        {!format.is_system && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { 
                                setEditingFormat({ id: format.id, name: format.name });
                                setFormatDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setDeleteTarget({ type: 'format', id: format.id, name: format.name })} 
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      {format.creative_types.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2 ml-9">
                          Nenhum tipo de criativo. Clique em "+ Tipo de Criativo" para adicionar.
                        </p>
                      ) : (
                        <div className="space-y-2 ml-9">
                          {format.creative_types.map(ct => (
                            <Collapsible 
                              key={ct.id}
                              open={openCreativeTypes[ct.id]} 
                              onOpenChange={() => toggleCreativeType(ct.id)}
                            >
                              <div className="border rounded-lg">
                                <div className="flex items-center justify-between p-3">
                                  <div className="flex items-center gap-2">
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5">
                                        {openCreativeTypes[ct.id] ? (
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </CollapsibleTrigger>
                                    <div>
                                      <p className="font-medium text-sm">{ct.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {ct.specifications?.length || 0} especificação(ões)
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => { 
                                        setSelectedCreativeTypeId(ct.id);
                                        setEditingSpec(null);
                                        setSpecDialogOpen(true);
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Especificação
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => { 
                                        setEditingCreativeType({ id: ct.id, name: ct.name, formatId: format.id });
                                        setSelectedFormatId(format.id);
                                        setCreativeTypeDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => setDeleteTarget({ type: 'creativeType', id: ct.id, name: ct.name })}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <CollapsibleContent>
                                  <div className="px-3 pb-3 pt-0">
                                    {ct.specifications?.length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-2 ml-6">
                                        Nenhuma especificação
                                      </p>
                                    ) : (
                                      <div className="space-y-1 ml-6">
                                        {ct.specifications?.map(spec => (
                                          <div 
                                            key={spec.id} 
                                            className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                              <span className="text-sm">{spec.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => { 
                                                  setEditingSpec(spec);
                                                  setSelectedCreativeTypeId(ct.id);
                                                  setSpecDialogOpen(true);
                                                }}
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                className="h-6 w-6 text-destructive"
                                                onClick={() => setDeleteTarget({ type: 'specification', id: spec.id, name: spec.name })}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}

        {/* Format Dialog */}
        <FormatDialog
          open={formatDialogOpen}
          onOpenChange={setFormatDialogOpen}
          onSave={editingFormat ? handleUpdateFormat : handleCreateFormat}
          existingNames={existingFormatNames}
          initialData={editingFormat || undefined}
          mode={editingFormat ? 'edit' : 'create'}
        />

        {/* Creative Type Dialog */}
        <CreativeTypeDialog
          open={creativeTypeDialogOpen}
          onOpenChange={setCreativeTypeDialogOpen}
          formatId={selectedFormatId || ''}
          initialData={editingCreativeType || undefined}
          mode={editingCreativeType ? 'edit' : 'create'}
        />

        {/* Specification Dialog */}
        <SpecificationDialog
          open={specDialogOpen}
          onOpenChange={setSpecDialogOpen}
          creativeTypeId={selectedCreativeTypeId || ''}
          initialData={editingSpec || undefined}
          mode={editingSpec ? 'edit' : 'create'}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Excluir {deleteTarget?.type === 'format' ? 'formato' : deleteTarget?.type === 'creativeType' ? 'tipo de criativo' : 'especificação'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. "{deleteTarget?.name}" e todos os seus itens relacionados serão excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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
