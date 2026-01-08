import { useState } from "react";
import { FileType } from "lucide-react";
import { FinanceLibraryPage } from "./FinanceLibraryPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useFinanceExpenseClassifications,
  useCreateExpenseClassification,
  useUpdateExpenseClassification,
  useDeleteExpenseClassification,
  useFinanceMacroClassifications,
  FinanceExpenseClassification,
} from "@/hooks/finance/useFinanceLibrary";

function ExpenseClassificationForm({
  item,
  onClose,
}: {
  item: FinanceExpenseClassification | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [macroId, setMacroId] = useState(item?.macro_classification_id || "none");
  
  const { data: macroClassifications = [] } = useFinanceMacroClassifications();
  const createMutation = useCreateExpenseClassification();
  const updateMutation = useUpdateExpenseClassification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { 
      name, 
      macro_classification_id: macroId === "none" ? undefined : macroId 
    };
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Classificação</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="macro">Classificação Macro (opcional)</Label>
        <Select value={macroId} onValueChange={setMacroId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {macroClassifications.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {item ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}

export default function ExpenseClassificationsPage() {
  const { data: items = [], isLoading } = useFinanceExpenseClassifications();
  const deleteMutation = useDeleteExpenseClassification();

  // Add macro name to items for display
  const itemsWithMacro = items.map(item => ({
    ...item,
    macro_name: item.macro_classification?.name || "-"
  }));

  return (
    <FinanceLibraryPage<FinanceExpenseClassification & { macro_name: string }>
      title="Classificação da Despesa"
      description="Subcategoria da classificação macro"
      icon={FileType}
      items={itemsWithMacro}
      isLoading={isLoading}
      columns={[
        { key: "name", label: "Nome" },
        { key: "macro_name", label: "Classificação Macro" },
      ]}
      dialogTitle="Classificação da Despesa"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <ExpenseClassificationForm 
          item={item ? { ...item, macro_classification: undefined } as FinanceExpenseClassification : null} 
          onClose={onClose} 
        />
      )}
    />
  );
}
