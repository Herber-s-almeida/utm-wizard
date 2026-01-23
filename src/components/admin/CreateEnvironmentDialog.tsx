import { useState } from "react";
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
import { useCreateEnvironment } from "@/hooks/useAdminEnvironments";

interface CreateEnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEnvironmentDialog({
  open,
  onOpenChange,
}: CreateEnvironmentDialogProps) {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const createEnvironment = useCreateEnvironment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createEnvironment.mutate(
      {
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        initialAdminEmail: adminEmail.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setCompanyName("");
          setAdminEmail("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Ambiente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Ambiente *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Agência XYZ"
              required
              minLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: XYZ Publicidade Ltda"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email do Administrador Inicial</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@empresa.com"
            />
            <p className="text-xs text-muted-foreground">
              Se o email já existir no sistema, o usuário será adicionado como admin. 
              Caso contrário, um convite será enviado.
            </p>
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
              disabled={!name.trim() || createEnvironment.isPending}
            >
              {createEnvironment.isPending ? "Criando..." : "Criar Ambiente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
