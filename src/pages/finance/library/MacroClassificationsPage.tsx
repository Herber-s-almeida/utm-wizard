import { Tags } from "lucide-react";
import { FinanceLibraryPage, SimpleNameForm } from "./FinanceLibraryPage";
import {
  useFinanceMacroClassifications,
  useCreateMacroClassification,
  useUpdateMacroClassification,
  useDeleteMacroClassification,
  FinanceMacroClassification,
} from "@/hooks/finance/useFinanceLibrary";

export default function MacroClassificationsPage() {
  const { data: items = [], isLoading } = useFinanceMacroClassifications();
  const createMutation = useCreateMacroClassification();
  const updateMutation = useUpdateMacroClassification();
  const deleteMutation = useDeleteMacroClassification();

  return (
    <FinanceLibraryPage<FinanceMacroClassification>
      title="Classificação Macro"
      description="Categorias de classificação das despesas"
      icon={Tags}
      items={items}
      isLoading={isLoading}
      columns={[{ key: "name", label: "Nome" }]}
      dialogTitle="Classificação Macro"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <SimpleNameForm
          item={item}
          onClose={onClose}
          label="Nome da Classificação"
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
