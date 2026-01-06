import { Copy, PlusCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DuplicateLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineCode: string;
  existingMomentName: string;
  targetMomentName: string;
  onDuplicate: () => void;
  onCreateNew: () => void;
}

export function DuplicateLineDialog({
  open,
  onOpenChange,
  lineCode,
  existingMomentName,
  targetMomentName,
  onDuplicate,
  onCreateNew,
}: DuplicateLineDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código já existe em outro momento</DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <p>
              O código <span className="font-mono font-semibold text-foreground">{lineCode}</span> já existe no momento{' '}
              <span className="font-semibold text-foreground">"{existingMomentName}"</span>.
            </p>
            <p>
              Deseja duplicar esta linha para o momento{' '}
              <span className="font-semibold text-foreground">"{targetMomentName}"</span>?
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="default"
            className="justify-start gap-3 h-auto py-3"
            onClick={() => {
              onDuplicate();
              onOpenChange(false);
            }}
          >
            <Copy className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Duplicar para este momento</p>
              <p className="text-xs text-primary-foreground/70">
                Copia toda a configuração da linha existente
              </p>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-3"
            onClick={() => {
              onCreateNew();
              onOpenChange(false);
            }}
          >
            <PlusCircle className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Criar linha diferente</p>
              <p className="text-xs text-muted-foreground">
                Gera um novo código automático
              </p>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
