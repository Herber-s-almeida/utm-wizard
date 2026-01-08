import { Users } from "lucide-react";
import { FinanceLibraryPage, SimpleNameForm } from "./FinanceLibraryPage";
import {
  useFinanceTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  FinanceTeam,
} from "@/hooks/finance/useFinanceLibrary";

export default function TeamsPage() {
  const { data: items = [], isLoading } = useFinanceTeams();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const deleteMutation = useDeleteTeam();

  return (
    <FinanceLibraryPage<FinanceTeam>
      title="Equipes"
      description="Times abaixo do Centro de Custos"
      icon={Users}
      items={items}
      isLoading={isLoading}
      columns={[{ key: "name", label: "Nome da Equipe" }]}
      dialogTitle="Equipe"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <SimpleNameForm
          item={item}
          onClose={onClose}
          label="Nome da Equipe"
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
