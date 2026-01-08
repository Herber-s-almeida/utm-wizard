import { useState } from "react";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Installment {
  id: string;
  date: Date;
  amount: number;
}

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentAmount: number;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  documentId,
  documentAmount,
}: AddPaymentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [installments, setInstallments] = useState<Installment[]>([
    { id: crypto.randomUUID(), date: new Date(), amount: documentAmount },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addInstallment = () => {
    const lastDate = installments[installments.length - 1]?.date || new Date();
    const remainingAmount = documentAmount - installments.reduce((sum, i) => sum + i.amount, 0);
    
    setInstallments([
      ...installments,
      { 
        id: crypto.randomUUID(), 
        date: addMonths(lastDate, 1), 
        amount: Math.max(0, remainingAmount) 
      },
    ]);
  };

  const removeInstallment = (id: string) => {
    if (installments.length > 1) {
      setInstallments(installments.filter((i) => i.id !== id));
    }
  };

  const updateInstallment = (id: string, field: "date" | "amount", value: Date | number) => {
    setInstallments(
      installments.map((i) =>
        i.id === id ? { ...i, [field]: value } : i
      )
    );
  };

  const distributeEvenly = () => {
    const count = installments.length;
    const amountPerInstallment = documentAmount / count;
    
    setInstallments(
      installments.map((i, index) => ({
        ...i,
        amount: index === count - 1 
          ? documentAmount - amountPerInstallment * (count - 1) // Last gets remainder
          : amountPerInstallment,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const payments = installments.map((inst, index) => ({
        financial_document_id: documentId,
        user_id: user.id,
        installment_number: index + 1,
        planned_payment_date: format(inst.date, "yyyy-MM-dd"),
        planned_amount: inst.amount,
        status: "pending",
      }));

      const { error } = await supabase
        .from("financial_payments")
        .insert(payments);

      if (error) throw error;

      // Audit log
      await supabase.from("financial_audit_log").insert({
        user_id: user.id,
        entity_type: "payment",
        entity_id: documentId,
        action: "create",
        after_json: { installments: payments.length },
        reason: `${payments.length} parcela(s) criada(s)`,
      });

      queryClient.invalidateQueries({ queryKey: ["financial-document"] });
      queryClient.invalidateQueries({ queryKey: ["financial-payments"] });
      
      toast.success(`${payments.length} parcela(s) criada(s)!`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao criar parcelas: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalInstallments = installments.reduce((sum, i) => sum + i.amount, 0);
  const difference = documentAmount - totalInstallments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Parcelas</DialogTitle>
            <DialogDescription>
              Valor do documento: R$ {documentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Parcelas ({installments.length})</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={distributeEvenly}>
                  Distribuir igual
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {installments.map((inst, index) => (
                <div key={inst.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium w-8">{index + 1}ª</span>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-32"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {format(inst.date, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={inst.date}
                        onSelect={(date) => date && updateInstallment(inst.id, "date", date)}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={inst.amount}
                      onChange={(e) => updateInstallment(inst.id, "amount", parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeInstallment(inst.id)}
                    disabled={installments.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total and difference */}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span>Total das parcelas:</span>
              <span className={cn("font-medium", difference !== 0 && "text-orange-600")}>
                R$ {totalInstallments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                {difference !== 0 && (
                  <span className="ml-2">
                    ({difference > 0 ? "faltam" : "excede"} R$ {Math.abs(difference).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                  </span>
                )}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || difference !== 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? "Salvando..." : "Criar Parcelas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
