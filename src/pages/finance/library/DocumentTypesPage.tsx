import { useState } from "react";
import { Receipt } from "lucide-react";
import { FinanceLibraryPage } from "./FinanceLibraryPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFinanceDocumentTypes,
  useCreateDocumentType,
  useUpdateDocumentType,
  useDeleteDocumentType,
  FinanceDocumentType,
} from "@/hooks/finance/useFinanceLibraryExtended";

function DocumentTypeForm({
  item,
  onClose,
}: {
  item: FinanceDocumentType | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, name, description: description || undefined });
    } else {
      await createMutation.mutateAsync({ name, description: description || undefined });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
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

export default function DocumentTypesPage() {
  const { data: items = [], isLoading } = useFinanceDocumentTypes();
  const deleteMutation = useDeleteDocumentType();

  return (
    <FinanceLibraryPage<FinanceDocumentType>
      title="Tipo do Documento"
      description="Boleto, cartão, fatura, recibo, etc."
      icon={Receipt}
      items={items}
      isLoading={isLoading}
      columns={[
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
      ]}
      dialogTitle="Tipo do Documento"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <DocumentTypeForm item={item} onClose={onClose} />
      )}
    />
  );
}
