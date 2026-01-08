import { ShoppingBag } from "lucide-react";
import { FinanceLibraryPage, SimpleNameForm } from "./FinanceLibraryPage";
import { useClients } from "@/hooks/useClients";

export default function ProductsPage() {
  const clients = useClients();
  
  const items = clients.activeItems?.map(client => ({
    id: client.id,
    name: client.name,
    description: client.description || "",
    slug: client.slug || "",
  })) || [];

  return (
    <FinanceLibraryPage
      title="Produto"
      description="Compartilha a mesma base do AdsPlanning Pro (Clientes)"
      icon={ShoppingBag}
      items={items}
      isLoading={clients.isLoading}
      columns={[
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
      ]}
      dialogTitle="Produto"
      onEdit={() => {}}
      onDelete={(id) => clients.softDelete.mutate(id)}
      renderDialog={(item, onClose) => (
        <SimpleNameForm
          item={item}
          onClose={onClose}
          label="Nome do Produto"
          isPending={clients.create.isPending || clients.update.isPending}
          onSubmit={async (data) => {
            if (item) {
              await clients.update.mutateAsync({ id: item.id, ...data });
            } else {
              await clients.create.mutateAsync(data);
            }
          }}
        />
      )}
    />
  );
}
