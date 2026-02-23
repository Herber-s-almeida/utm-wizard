import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Loader2, AlertTriangle } from 'lucide-react';
import { usePlanVersions } from '@/hooks/usePlanVersions';

interface UnsavedVersionAlertProps {
  open: boolean;
  onDismiss: () => void;
  planId: string;
  onVersionSaved?: () => void;
}

export function UnsavedVersionAlert({
  open,
  onDismiss,
  planId,
  onVersionSaved,
}: UnsavedVersionAlertProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [changeLog, setChangeLog] = useState('');
  const { createVersion, isCreating } = usePlanVersions(planId);

  const handleSaveVersion = () => {
    createVersion(
      { planId, changeLog: changeLog || undefined },
      {
        onSuccess: () => {
          setSaveDialogOpen(false);
          setChangeLog('');
          onVersionSaved?.();
        },
      }
    );
  };

  const handleOpenSaveDialog = () => {
    setSaveDialogOpen(true);
  };

  return (
    <>
      <AlertDialog open={open && !saveDialogOpen} onOpenChange={(v) => !v && onDismiss()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <AlertDialogTitle className="text-lg">Versão não salva</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Este plano possui alterações que ainda não foram salvas em uma versão manual.
              Salvar uma versão garante que você possa restaurar este estado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar sem Salvar</AlertDialogCancel>
            <AlertDialogAction onClick={handleOpenSaveDialog}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Versão Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Versão</DialogTitle>
            <DialogDescription>
              Crie um snapshot do estado atual do plano. Isso permite restaurar
              esta versão posteriormente se necessário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unsavedChangeLog">Descrição das alterações (opcional)</Label>
              <Textarea
                id="unsavedChangeLog"
                placeholder="Ex: Ajustado orçamento para Q2, adicionadas novas linhas..."
                value={changeLog}
                onChange={(e) => setChangeLog(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVersion} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
