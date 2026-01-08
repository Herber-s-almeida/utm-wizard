import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ArrowLeft, ChevronDown, ChevronRight, Layers, Type, ImageIcon, FileText, Pencil, Copy } from 'lucide-react';
import { useFormatsHierarchy, useFormats, FormatWithHierarchy, FormatCreativeType, CreativeTypeSpecification } from '@/hooks/useFormatsHierarchy';
import { FormatWizardDialog } from '@/components/config/FormatWizardDialog';
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
  const { data: formatsHierarchy, isLoading } = useFormatsHierarchy();
  const { remove: removeFormat, update: updateFormat, duplicate: duplicateFormat, activeItems } = useFormats();
  
  // Wizard dialog state (for new formats)
  const [wizardOpen, setWizardOpen] = useState(false);
  
  // Edit dialog state (for editing format name)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<{ id: string; name: string } | null>(null);
  
  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  // Collapse states
  const [openFormats, setOpenFormats] = useState<Record<string, boolean>>({});
  const [openCreativeTypes, setOpenCreativeTypes] = useState<Record<string, boolean>>({});
  const [openSpecs, setOpenSpecs] = useState<Record<string, boolean>>({});
  const [openCopySection, setOpenCopySection] = useState<Record<string, boolean>>({});
  const [openDimSection, setOpenDimSection] = useState<Record<string, boolean>>({});

  const toggleFormat = (id: string) => {
    setOpenFormats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCreativeType = (id: string) => {
    setOpenCreativeTypes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSpec = (id: string) => {
    setOpenSpecs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCopySection = (id: string) => {
    setOpenCopySection(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDimSection = (id: string) => {
    setOpenDimSection(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNewFormat = () => {
    setWizardOpen(true);
  };

  const handleEditFormat = (format: { id: string; name: string }) => {
    setEditingFormat(format);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (name: string) => {
    if (!editingFormat) return;
    updateFormat.mutate({ id: editingFormat.id, name });
    setEditingFormat(null);
  };

  const handleDuplicate = (formatId: string) => {
    duplicateFormat.mutate(formatId);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeFormat.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const existingNames = activeItems?.map(f => f.name) || [];

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
          <Button onClick={handleNewFormat}>
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
              <FormatCard
                key={format.id}
                format={format}
                isOpen={openFormats[format.id]}
                onToggle={() => toggleFormat(format.id)}
                onEdit={() => handleEditFormat({ id: format.id, name: format.name })}
                onDuplicate={() => handleDuplicate(format.id)}
                onDelete={() => setDeleteTarget({ id: format.id, name: format.name })}
                openCreativeTypes={openCreativeTypes}
                onToggleCreativeType={toggleCreativeType}
                openSpecs={openSpecs}
                onToggleSpec={toggleSpec}
                openCopySection={openCopySection}
                onToggleCopySection={toggleCopySection}
                openDimSection={openDimSection}
                onToggleDimSection={toggleDimSection}
              />
            ))}
          </div>
        )}

        {/* Format Wizard Dialog (for new formats) */}
        <FormatWizardDialog
          open={wizardOpen}
          onOpenChange={setWizardOpen}
        />

        {/* Edit Format Dialog */}
        <FormatDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingFormat(null);
          }}
          onSave={handleSaveEdit}
          existingNames={existingNames}
          initialData={editingFormat || undefined}
          mode="edit"
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir formato?</AlertDialogTitle>
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

// Format Card Component
interface FormatCardProps {
  format: FormatWithHierarchy;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  openCreativeTypes: Record<string, boolean>;
  onToggleCreativeType: (id: string) => void;
  openSpecs: Record<string, boolean>;
  onToggleSpec: (id: string) => void;
  openCopySection: Record<string, boolean>;
  onToggleCopySection: (id: string) => void;
  openDimSection: Record<string, boolean>;
  onToggleDimSection: (id: string) => void;
}

function FormatCard({
  format,
  isOpen,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
  openCreativeTypes,
  onToggleCreativeType,
  openSpecs,
  onToggleSpec,
  openCopySection,
  onToggleCopySection,
  openDimSection,
  onToggleDimSection,
}: FormatCardProps) {
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isOpen ? (
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
                size="icon" 
                onClick={onDuplicate}
                title="Duplicar formato"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {!format.is_system && (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onEdit}
                    title="Editar nome"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onDelete}
                    className="text-destructive"
                    title="Excluir formato"
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
                Nenhum tipo de criativo
              </p>
            ) : (
              <div className="space-y-2 ml-9">
                {format.creative_types.map(ct => (
                  <CreativeTypeItem
                    key={ct.id}
                    creativeType={ct}
                    isOpen={openCreativeTypes[ct.id]}
                    onToggle={() => onToggleCreativeType(ct.id)}
                    openSpecs={openSpecs}
                    onToggleSpec={onToggleSpec}
                    openCopySection={openCopySection}
                    onToggleCopySection={onToggleCopySection}
                    openDimSection={openDimSection}
                    onToggleDimSection={onToggleDimSection}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Creative Type Item Component
interface CreativeTypeItemProps {
  creativeType: FormatCreativeType;
  isOpen: boolean;
  onToggle: () => void;
  openSpecs: Record<string, boolean>;
  onToggleSpec: (id: string) => void;
  openCopySection: Record<string, boolean>;
  onToggleCopySection: (id: string) => void;
  openDimSection: Record<string, boolean>;
  onToggleDimSection: (id: string) => void;
}

function CreativeTypeItem({
  creativeType,
  isOpen,
  onToggle,
  openSpecs,
  onToggleSpec,
  openCopySection,
  onToggleCopySection,
  openDimSection,
  onToggleDimSection,
}: CreativeTypeItemProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border rounded-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5">
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                <Type className="h-3.5 w-3.5 text-muted-foreground" />
                {creativeType.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {creativeType.specifications?.length || 0} especificação(ões)
              </p>
            </div>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0">
            {creativeType.specifications?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2 ml-6">
                Nenhuma especificação
              </p>
            ) : (
              <div className="space-y-1 ml-6">
                {creativeType.specifications?.map(spec => (
                  <SpecificationItem
                    key={spec.id}
                    spec={spec}
                    isOpen={openSpecs[spec.id]}
                    onToggle={() => onToggleSpec(spec.id)}
                    openCopySection={openCopySection}
                    onToggleCopySection={onToggleCopySection}
                    openDimSection={openDimSection}
                    onToggleDimSection={onToggleDimSection}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Specification Item Component
interface SpecificationItemProps {
  spec: CreativeTypeSpecification;
  isOpen: boolean;
  onToggle: () => void;
  openCopySection: Record<string, boolean>;
  onToggleCopySection: (id: string) => void;
  openDimSection: Record<string, boolean>;
  onToggleDimSection: (id: string) => void;
}

function SpecificationItem({
  spec,
  isOpen,
  onToggle,
  openCopySection,
  onToggleCopySection,
  openDimSection,
  onToggleDimSection,
}: SpecificationItemProps) {
  const copyFields = spec.copy_fields || [];
  const dimensions = spec.dimensions || [];
  const hasCopy = copyFields.length > 0;
  const hasDimensions = dimensions.length > 0;
  const hasChildren = hasCopy || hasDimensions;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="bg-muted/30 rounded-md">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
            ) : (
              <div className="w-5" />
            )}
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{spec.name}</span>
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <div className="px-2 pb-2 pt-0 ml-7 space-y-2">
              {/* Copy Section */}
              {hasCopy && (
                <Collapsible
                  open={openCopySection[spec.id]}
                  onOpenChange={() => onToggleCopySection(spec.id)}
                >
                  <div className="border rounded-md bg-background/50">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50">
                        <Button variant="ghost" size="icon" className="h-4 w-4">
                          {openCopySection[spec.id] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">Copy ({copyFields.length})</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-2 pb-2 ml-6 space-y-1">
                        {copyFields.map((cf, idx) => (
                          <div 
                            key={cf.id} 
                            className="text-xs p-1.5 bg-muted/30 rounded flex items-center justify-between"
                          >
                            <span>{cf.name}</span>
                            {cf.max_characters && (
                              <span className="text-muted-foreground">
                                máx. {cf.max_characters} caracteres
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Dimensions Section */}
              {hasDimensions && (
                <Collapsible
                  open={openDimSection[spec.id]}
                  onOpenChange={() => onToggleDimSection(spec.id)}
                >
                  <div className="border rounded-md bg-background/50">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50">
                        <Button variant="ghost" size="icon" className="h-4 w-4">
                          {openDimSection[spec.id] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">Dimensões (imagem / vídeo) ({dimensions.length})</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-2 pb-2 ml-6 space-y-1">
                        {dimensions.map((dim, idx) => (
                          <div 
                            key={dim.id} 
                            className="text-xs p-1.5 bg-muted/30 rounded"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{dim.description || `${dim.width}x${dim.height}${dim.unit}`}</span>
                              <span className="text-muted-foreground">
                                {dim.width}x{dim.height}{dim.unit}
                              </span>
                            </div>
                            {dim.observation && (
                              <p className="text-muted-foreground mt-0.5">{dim.observation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
