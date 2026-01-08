import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { usePlanVersions } from '@/hooks/usePlanVersions';

interface SaveVersionDropdownItemProps {
  planId: string;
  disabled?: boolean;
}

export function SaveVersionDropdownItem({ 
  planId, 
  disabled = false
}: SaveVersionDropdownItemProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [changeLog, setChangeLog] = useState('');
  const { createVersion, isCreating } = usePlanVersions(planId);

  const handleSave = () => {
    createVersion(
      { planId, changeLog: changeLog || undefined },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setChangeLog('');
        }
      }
    );
  };

  return (
    <>
      <DropdownMenuItem 
        onClick={(e) => {
          e.preventDefault();
          setDialogOpen(true);
        }}
        disabled={disabled}
      >
        <Save className="w-4 h-4 mr-2" />
        Salvar Versão
      </DropdownMenuItem>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <Label htmlFor="changeLog">Descrição das alterações (opcional)</Label>
              <Textarea
                id="changeLog"
                placeholder="Ex: Ajustado orçamento para Q2, adicionadas novas linhas de Meta Ads..."
                value={changeLog}
                onChange={(e) => setChangeLog(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isCreating}>
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
