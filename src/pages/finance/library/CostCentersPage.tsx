import { useState } from "react";
import { Building2 } from "lucide-react";
import { FinanceLibraryPage } from "./FinanceLibraryPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFinanceCostCenters,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  FinanceCostCenter,
} from "@/hooks/finance/useFinanceLibrary";

function CostCenterForm({
  item,
  onClose,
}: {
  item: FinanceCostCenter | null;
  onClose: () => void;
}) {
  const [code, setCode] = useState(item?.code || "");
  const [name, setName] = useState(item?.name || "");
  
  const createMutation = useCreateCostCenter();
  const updateMutation = useUpdateCostCenter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, code, name });
    } else {
      await createMutation.mutateAsync({ code, name });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Código (CR)</Label>
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nome do CR</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
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

export default function CostCentersPage() {
  const { data: items = [], isLoading } = useFinanceCostCenters();
  const deleteMutation = useDeleteCostCenter();

  return (
    <FinanceLibraryPage<FinanceCostCenter>
      title="Centro de Custos"
      description="Nome e número do Centro de Custos (CR)"
      icon={Building2}
      items={items}
      isLoading={isLoading}
      columns={[
        { key: "code", label: "Código (CR)" },
        { key: "name", label: "Nome" },
        { key: "full_name", label: "Nome Completo" },
      ]}
      dialogTitle="Centro de Custos"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <CostCenterForm item={item} onClose={onClose} />
      )}
    />
  );
}
