import { ClipboardList } from "lucide-react";
import { FinanceLibraryPage, SimpleNameForm } from "./FinanceLibraryPage";
import {
  useFinanceRequestTypes,
  useCreateRequestType,
  useUpdateRequestType,
  useDeleteRequestType,
  FinanceRequestType,
} from "@/hooks/finance/useFinanceLibrary";

export default function RequestTypesPage() {
  const { data: items = [], isLoading } = useFinanceRequestTypes();
  const createMutation = useCreateRequestType();
  const updateMutation = useUpdateRequestType();
  const deleteMutation = useDeleteRequestType();

  return (
    <FinanceLibraryPage<FinanceRequestType>
      title="Tipo de Solicitação"
      description="Compra no cartão, contrato, parecer técnico, etc."
      icon={ClipboardList}
      items={items}
      isLoading={isLoading}
      columns={[{ key: "name", label: "Nome" }]}
      dialogTitle="Tipo de Solicitação"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <SimpleNameForm
          item={item}
          onClose={onClose}
          label="Nome do Tipo"
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
