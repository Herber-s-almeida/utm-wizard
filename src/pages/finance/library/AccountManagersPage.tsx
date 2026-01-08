import { useState } from "react";
import { UserCircle } from "lucide-react";
import { FinanceLibraryPage } from "./FinanceLibraryPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFinanceAccountManagers,
  useCreateAccountManager,
  useUpdateAccountManager,
  useDeleteAccountManager,
  FinanceAccountManager,
} from "@/hooks/finance/useFinanceLibraryExtended";

function AccountManagerForm({
  item,
  onClose,
}: {
  item: FinanceAccountManager | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [email, setEmail] = useState(item?.email || "");
  const [phone, setPhone] = useState(item?.phone || "");
  
  const createMutation = useCreateAccountManager();
  const updateMutation = useUpdateAccountManager();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, name, email: email || undefined, phone: phone || undefined });
    } else {
      await createMutation.mutateAsync({ name, email: email || undefined, phone: phone || undefined });
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
        <Label htmlFor="email">E-mail (opcional)</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (opcional)</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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

export default function AccountManagersPage() {
  const { data: items = [], isLoading } = useFinanceAccountManagers();
  const deleteMutation = useDeleteAccountManager();

  return (
    <FinanceLibraryPage<FinanceAccountManager>
      title="Atendimento"
      description="Pessoas que solicitam compras, abrem ordens de compra, etc."
      icon={UserCircle}
      items={items}
      isLoading={isLoading}
      columns={[
        { key: "name", label: "Nome" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Telefone" },
      ]}
      dialogTitle="Atendimento"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <AccountManagerForm item={item} onClose={onClose} />
      )}
    />
  );
}
