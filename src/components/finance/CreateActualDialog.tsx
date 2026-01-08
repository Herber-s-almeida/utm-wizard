import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, endOfMonth, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CreateActualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  onSubmit: (data: {
    media_plan_id: string;
    period_start: string;
    period_end: string;
    actual_amount: number;
    notes?: string;
  }) => void;
  isSubmitting?: boolean;
}

export function CreateActualDialog({
  open,
  onOpenChange,
  planId,
  onSubmit,
  isSubmitting,
}: CreateActualDialogProps) {
  const [periodDate, setPeriodDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!periodDate || !amount) return;
    
    const periodStart = startOfMonth(periodDate);
    const periodEnd = endOfMonth(periodDate);
    
    onSubmit({
      media_plan_id: planId,
      period_start: format(periodStart, "yyyy-MM-dd"),
      period_end: format(periodEnd, "yyyy-MM-dd"),
      actual_amount: parseFloat(amount.replace(/[^\d,.-]/g, "").replace(",", ".")),
      notes: notes || undefined,
    });
    
    // Reset form
    setAmount("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Valor Executado</DialogTitle>
            <DialogDescription>
              Adicione o valor gasto em um período específico
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Período (Mês)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodDate ? (
                      format(periodDate, "MMMM yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione o mês</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodDate}
                    onSelect={setPeriodDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor Executado (R$)</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Detalhes sobre este valor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!periodDate || !amount || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
