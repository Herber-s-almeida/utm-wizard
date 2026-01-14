import { useState } from "react";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useInviteSystemUser } from "@/hooks/useAdminUsers";

interface InviteSystemUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteSystemUserDialog({ open, onOpenChange }: InviteSystemUserDialogProps) {
  const [email, setEmail] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const { mutate: inviteUser, isPending } = useInviteSystemUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;

    inviteUser(
      { email: email.trim(), makeAdmin },
      {
        onSuccess: () => {
          setEmail("");
          setMakeAdmin(false);
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail("");
      setMakeAdmin(false);
    }
    onOpenChange(newOpen);
  };

  const isValidEmail = email.includes("@") && email.includes(".");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Convidar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Envie um convite por email para que uma nova pessoa crie sua conta na plataforma.
            Ela terá seu próprio ambiente de trabalho.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isPending}
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="make-admin"
              checked={makeAdmin}
              onCheckedChange={(checked) => setMakeAdmin(checked === true)}
              disabled={isPending}
            />
            <Label 
              htmlFor="make-admin" 
              className="text-sm font-normal cursor-pointer"
            >
              Definir como Administrador do Sistema
            </Label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isValidEmail}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Enviar Convite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
