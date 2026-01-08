import { useState } from "react";
import { CircleDot } from "lucide-react";
import { FinanceLibraryPage } from "./FinanceLibraryPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFinanceStatuses,
  useCreateFinanceStatus,
  useUpdateFinanceStatus,
  useDeleteFinanceStatus,
  FinanceStatus,
} from "@/hooks/finance/useFinanceLibraryExtended";

function StatusForm({
  item,
  onClose,
}: {
  item: FinanceStatus | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [color, setColor] = useState(item?.color || "#22c55e");
  
  const createMutation = useCreateFinanceStatus();
  const updateMutation = useUpdateFinanceStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, name, color });
    } else {
      await createMutation.mutateAsync({ name, color });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Status</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="color">Cor</Label>
        <div className="flex gap-2">
          <Input 
            id="color" 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            className="w-16 h-10 p-1 cursor-pointer"
          />
          <Input 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            className="flex-1"
          />
        </div>
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

export default function StatusesPage() {
  const { data: items = [], isLoading } = useFinanceStatuses();
  const deleteMutation = useDeleteFinanceStatus();

  // Transform items to display color as a badge
  const itemsWithColorDisplay = items.map(item => ({
    ...item,
    color_display: item.color || "-"
  }));

  return (
    <FinanceLibraryPage<FinanceStatus & { color_display: string }>
      title="Status"
      description="Status exclusivos do financeiro"
      icon={CircleDot}
      items={itemsWithColorDisplay}
      isLoading={isLoading}
      columns={[
        { key: "name", label: "Nome" },
        { key: "color_display", label: "Cor" },
      ]}
      dialogTitle="Status"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <StatusForm item={item ? { ...item } as FinanceStatus : null} onClose={onClose} />
      )}
    />
  );
}
