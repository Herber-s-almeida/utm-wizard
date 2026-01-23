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
import { Switch } from "@/components/ui/switch";
import { useAddEnvironmentMember, AdminEnvironment } from "@/hooks/useAdminEnvironments";

interface AddMemberToEnvironmentDialogProps {
  environment: AdminEnvironment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberToEnvironmentDialog({
  environment,
  open,
  onOpenChange,
}: AddMemberToEnvironmentDialogProps) {
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const addMember = useAddEnvironmentMember();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addMember.mutate(
      {
        environmentId: environment.id,
        email: email.trim(),
        isAdmin,
      },
      {
        onSuccess: () => {
          setEmail("");
          setIsAdmin(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Membro ao {environment.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-email">Email *</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Se o email já existir no sistema, o usuário será adicionado diretamente. 
              Caso contrário, um convite será criado.
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="is-admin" className="text-sm font-medium">
                Administrador do Ambiente
              </Label>
              <p className="text-xs text-muted-foreground">
                Administradores podem gerenciar membros e configurações
              </p>
            </div>
            <Switch
              id="is-admin"
              checked={isAdmin}
              onCheckedChange={setIsAdmin}
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
              disabled={!email.trim() || addMember.isPending}
            >
              {addMember.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
