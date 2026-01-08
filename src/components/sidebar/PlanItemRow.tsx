import { Link } from 'react-router-dom';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
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

interface PlanItemRowProps {
  id: string;
  slug?: string | null;
  name: string;
  onDelete: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  isTrash?: boolean;
  className?: string;
}

export function PlanItemRow({
  id,
  slug,
  name,
  onDelete,
  onRestore,
  onPermanentDelete,
  isTrash = false,
  className,
}: PlanItemRowProps) {
  const planUrl = `/media-plans/${slug || id}`;
  
  return (
    <div className={cn("group flex items-center gap-1 py-1 px-2 rounded-md hover:bg-sidebar-accent/50", className)}>
      <Link 
        to={planUrl} 
        className="flex-1 text-xs truncate hover:text-primary"
      >
        {name}
      </Link>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isTrash ? (
          <>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-5 w-5" 
              onClick={onRestore}
              title="Restaurar"
            >
              <RotateCcw className="h-3 w-3 text-muted-foreground hover:text-success" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-5 w-5">
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">Excluir permanentemente</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p className="font-semibold text-foreground">
                      Atenção: Esta ação é irreversível!
                    </p>
                    <p>
                      O plano "{name}" e todo o seu histórico serão excluídos permanentemente. 
                      Isso inclui todas as linhas de mídia, criativos e dados associados.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={onPermanentDelete} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            <Link to={planUrl}>
              <Button size="icon" variant="ghost" className="h-5 w-5">
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-5 w-5">
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mover para lixeira</AlertDialogTitle>
                  <AlertDialogDescription>
                    O plano "{name}" será movido para a lixeira. Você poderá restaurá-lo depois se necessário.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    Mover para lixeira
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
