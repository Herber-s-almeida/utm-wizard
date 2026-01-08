import { useState } from "react";
import { Truck } from "lucide-react";
import { FinanceLibraryPage } from "./FinanceLibraryPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinancialVendors } from "@/hooks/finance/useFinancialVendors";

interface FinancialVendor {
  id: string;
  name: string;
  category: string | null;
  document: string | null;
  payment_terms: string | null;
}

function VendorForm({
  item,
  onClose,
  onCreate,
}: {
  item: FinancialVendor | null;
  onClose: () => void;
  onCreate: (data: { name: string }) => void;
}) {
  const [name, setName] = useState(item?.name || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ name });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Fornecedor</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">
          {item ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}

export default function VendorsPage() {
  const { vendors, isLoading, createVendor, deleteVendor } = useFinancialVendors();

  return (
    <FinanceLibraryPage<FinancialVendor>
      title="Fornecedores"
      description="Cadastro de fornecedores"
      icon={Truck}
      items={vendors as FinancialVendor[]}
      isLoading={isLoading}
      columns={[
        { key: "name", label: "Nome" },
        { key: "category", label: "Categoria" },
      ]}
      dialogTitle="Fornecedor"
      onEdit={() => {}}
      onDelete={(id) => deleteVendor(id)}
      renderDialog={(item, onClose) => (
        <VendorForm item={item} onClose={onClose} onCreate={createVendor} />
      )}
    />
  );
}
