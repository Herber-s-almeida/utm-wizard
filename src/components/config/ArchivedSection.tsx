import { useState } from 'react';
import { Archive, ChevronDown, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

interface ArchivedItem {
  id: string;
  name: string;
  description?: string | null;
  deleted_at?: string | null;
}

interface ArchivedSectionProps {
  items: ArchivedItem[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  itemLabel: string;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

export function ArchivedSection({
  items,
  onRestore,
  onPermanentDelete,
  itemLabel,
  isRestoring = false,
  isDeleting = false,
}: ArchivedSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  if (items.length === 0) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className="mt-8">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Archive className="h-4 w-4" />
              <span>Arquivados ({items.length})</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className="border-dashed bg-muted/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          <Archive className="h-3 w-3" />
                          Arquivado
                        </Badge>
                        <div>
                          <span className="text-sm text-muted-foreground line-through">{item.name}</span>
                          {item.deleted_at && (
                            <p className="text-xs text-muted-foreground">
                              Arquivado em {formatDate(item.deleted_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setRestoreId(item.id)}
                          disabled={isRestoring}
                          className="text-primary hover:text-primary"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setDeleteId(item.id)}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreId} onOpenChange={() => setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar {itemLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              Este item será restaurado e estará disponível novamente para uso em novos planos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreId) onRestore(restoreId);
                setRestoreId(null);
              }}
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta ação <strong>não pode ser desfeita</strong>.</p>
              <p className="text-destructive">
                ⚠️ Se este item estiver vinculado a planos existentes, a exclusão falhará para manter a integridade dos dados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onPermanentDelete(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
