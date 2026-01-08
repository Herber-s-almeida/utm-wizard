import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDuplicatePlan } from '@/hooks/useDuplicatePlan';
import { MediaPlan } from '@/types/media';

interface DuplicatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MediaPlan | null;
  onSuccess: (newPlanId: string) => void;
}

export function DuplicatePlanDialog({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: DuplicatePlanDialogProps) {
  const [newName, setNewName] = useState('');
  const [includeCreatives, setIncludeCreatives] = useState(false);
  const { duplicatePlan, isPending } = useDuplicatePlan();

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open && plan) {
      setNewName(`${plan.name} (cópia)`);
      setIncludeCreatives(false);
    }
    onOpenChange(open);
  };

  const handleDuplicate = async () => {
    if (!plan || !newName.trim()) return;

    try {
      const newPlanId = await duplicatePlan({
        planId: plan.id,
        newName: newName.trim(),
        includeCreatives,
      });
      onOpenChange(false);
      onSuccess(newPlanId);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Duplicar Plano de Mídia
          </DialogTitle>
          <DialogDescription>
            Crie uma cópia completa do plano "{plan.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* New plan name */}
          <div className="space-y-2">
            <Label htmlFor="newName">Nome do novo plano</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Digite o nome do novo plano"
            />
          </div>

          {/* What will be duplicated */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">O que será duplicado:</Label>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Configurações do plano (orçamento, datas, KPIs)</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Distribuições de orçamento</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Linhas de mídia (com códigos originais)</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Orçamentos mensais das linhas</span>
              </div>
            </div>
          </div>

          {/* Optional: include creatives */}
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="includeCreatives"
                checked={includeCreatives}
                onCheckedChange={(checked) => setIncludeCreatives(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="includeCreatives"
                  className="font-medium cursor-pointer"
                >
                  Duplicar criativos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Inclui todos os criativos associados às linhas de mídia
                </p>
              </div>
            </div>
          </div>

          {/* Info notices */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 text-blue-500" />
              <span>O novo plano será criado com status "Rascunho"</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 text-blue-500" />
              <span>Todos os elementos receberão novos IDs únicos</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={isPending || !newName.trim()}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Duplicando...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Duplicar Plano
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
