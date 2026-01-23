import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateEnvironment, AdminEnvironment } from "@/hooks/useAdminEnvironments";

interface EditEnvironmentDialogProps {
  environment: AdminEnvironment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEnvironmentDialog({
  environment,
  open,
  onOpenChange,
}: EditEnvironmentDialogProps) {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");

  const updateEnvironment = useUpdateEnvironment();

  useEffect(() => {
    if (environment) {
      setName(environment.name || "");
      setCompanyName(environment.company_name || "");
      setCnpj(environment.cnpj || "");
    }
  }, [environment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateEnvironment.mutate(
      {
        environmentId: environment.id,
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Ambiente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Ambiente *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Agência XYZ"
              required
              minLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-companyName">Nome da Empresa</Label>
            <Input
              id="edit-companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: XYZ Publicidade Ltda"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cnpj">CNPJ</Label>
            <Input
              id="edit-cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || updateEnvironment.isPending}
            >
              {updateEnvironment.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
