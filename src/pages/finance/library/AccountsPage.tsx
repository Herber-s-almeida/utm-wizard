import { useState } from "react";
import { Wallet } from "lucide-react";
import { FinanceLibraryPage } from "./FinanceLibraryPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFinanceAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  FinanceAccount,
} from "@/hooks/finance/useFinanceLibrary";

function AccountForm({
  item,
  onClose,
}: {
  item: FinanceAccount | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || "");
  
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, name, category: category || undefined });
    } else {
      await createMutation.mutateAsync({ name, category: category || undefined });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Conta</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Categoria (opcional)</Label>
        <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
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

export default function AccountsPage() {
  const { data: items = [], isLoading } = useFinanceAccounts();
  const deleteMutation = useDeleteAccount();

  return (
    <FinanceLibraryPage<FinanceAccount>
      title="Conta Financeira"
      description="Cada conta utilizada"
      icon={Wallet}
      items={items}
      isLoading={isLoading}
      columns={[
        { key: "name", label: "Nome" },
        { key: "category", label: "Categoria" },
      ]}
      dialogTitle="Conta Financeira"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <AccountForm item={item} onClose={onClose} />
      )}
    />
  );
}
