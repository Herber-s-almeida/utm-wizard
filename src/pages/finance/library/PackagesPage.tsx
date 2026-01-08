import { Package } from "lucide-react";
import { FinanceLibraryPage, SimpleNameForm } from "./FinanceLibraryPage";
import {
  useFinancePackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  FinancePackage,
} from "@/hooks/finance/useFinanceLibrary";

export default function PackagesPage() {
  const { data: items = [], isLoading } = useFinancePackages();
  const createMutation = useCreatePackage();
  const updateMutation = useUpdatePackage();
  const deleteMutation = useDeletePackage();

  return (
    <FinanceLibraryPage<FinancePackage>
      title="Pacotes"
      description="Subdivisões do orçamento"
      icon={Package}
      items={items}
      isLoading={isLoading}
      columns={[{ key: "name", label: "Nome do Pacote" }]}
      dialogTitle="Pacote"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <SimpleNameForm
          item={item}
          onClose={onClose}
          label="Nome do Pacote"
          isPending={createMutation.isPending || updateMutation.isPending}
          onSubmit={async (data) => {
            if (item) {
              await updateMutation.mutateAsync({ id: item.id, ...data });
            } else {
              await createMutation.mutateAsync(data);
            }
          }}
        />
      )}
    />
  );
}
