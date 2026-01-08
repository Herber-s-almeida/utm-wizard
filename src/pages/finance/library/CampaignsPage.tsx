import { useState } from "react";
import { FolderKanban } from "lucide-react";
import { FinanceLibraryPage, SimpleNameForm } from "./FinanceLibraryPage";
import {
  useFinanceCampaignProjects,
  useCreateCampaignProject,
  useUpdateCampaignProject,
  useDeleteCampaignProject,
  FinanceCampaignProject,
} from "@/hooks/finance/useFinanceLibraryExtended";

export default function CampaignsPage() {
  const { data: items = [], isLoading } = useFinanceCampaignProjects();
  const createMutation = useCreateCampaignProject();
  const updateMutation = useUpdateCampaignProject();
  const deleteMutation = useDeleteCampaignProject();

  return (
    <FinanceLibraryPage<FinanceCampaignProject>
      title="Campanha/Projeto"
      description="Planos cadastrados e outras campanhas/projetos"
      icon={FolderKanban}
      items={items}
      isLoading={isLoading}
      columns={[
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
      ]}
      dialogTitle="Campanha/Projeto"
      onEdit={() => {}}
      onDelete={(id) => deleteMutation.mutate(id)}
      renderDialog={(item, onClose) => (
        <SimpleNameForm
          item={item}
          onClose={onClose}
          label="Nome da Campanha/Projeto"
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
