import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ConfigItemRowProps {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  canDelete?: boolean;
  deleteWarning?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ConfigItemRow({
  name,
  onEdit,
  onDelete,
  canDelete = true,
  deleteWarning,
  className,
  children,
}: ConfigItemRowProps) {
  return (
    <div className={cn("group flex items-center gap-1 py-1 px-2 rounded-md hover:bg-sidebar-accent/50 min-w-0", className)}>
      <span className="flex-1 text-xs truncate min-w-0">
        {name}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-5 w-5" 
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
        
        {canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-5 w-5">
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-5 w-5">
                <Trash2 className="h-3 w-3 text-muted-foreground/50" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Não é possível excluir</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteWarning || 'Este item está vinculado a um plano e não pode ser excluído.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Entendi</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {children}
    </div>
  );
}