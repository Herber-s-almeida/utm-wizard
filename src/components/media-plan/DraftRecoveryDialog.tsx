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
import { FileText, Clock } from 'lucide-react';
import { DraftData, formatDraftTimestamp } from '@/hooks/useWizardDraft';

interface DraftRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: DraftData | null;
  onContinue: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryDialog({
  open,
  onOpenChange,
  draft,
  onContinue,
  onDiscard,
}: DraftRecoveryDialogProps) {
  if (!draft) return null;

  const planName = draft.state.planData.name || 'Plano sem nome';
  const budget = draft.state.planData.total_budget;
  const step = draft.state.step;
  const timestamp = formatDraftTimestamp(draft.timestamp);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-left">
              Rascunho encontrado
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              Você tem um rascunho de plano de mídia salvo. Deseja continuar de onde parou?
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{planName}</span>
              </div>
              {budget > 0 && (
                <div className="text-sm text-muted-foreground">
                  Orçamento: {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(budget)}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Salvo {timestamp}</span>
                <span className="mx-1">•</span>
                <span>Etapa {step} de 5</span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onDiscard}>
            Começar novo
          </AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Continuar rascunho
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
