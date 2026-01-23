import { useState } from "react";
import { useAdminUsers, useUpdateSystemRole, AdminUser } from "@/hooks/useAdminUsers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Shield, User, Search, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SystemSettingsPage() {
  const { user } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const updateSystemRole = useUpdateSystemRole();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
    action: "promote" | "demote";
  }>({ open: false, user: null, action: "promote" });

  const filteredUsers = users?.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  ) || [];

  const systemAdmins = filteredUsers.filter(u => u.system_role === "system_admin");
  const regularUsers = filteredUsers.filter(u => u.system_role !== "system_admin");

  const handleToggleRole = (targetUser: AdminUser) => {
    const isCurrentlyAdmin = targetUser.system_role === "system_admin";
    setConfirmDialog({
      open: true,
      user: targetUser,
      action: isCurrentlyAdmin ? "demote" : "promote",
    });
  };

  const confirmRoleChange = () => {
    if (!confirmDialog.user) return;
    
    const newRole = confirmDialog.action === "promote" ? "system_admin" : "user";
    updateSystemRole.mutate({
      userId: confirmDialog.user.id,
      role: newRole,
    });
    
    setConfirmDialog({ open: false, user: null, action: "promote" });
  };

  const isSelf = (userId: string) => userId === user?.id;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Configurações do Sistema</h1>
        <p className="text-muted-foreground">
          Gerencie os administradores do sistema que têm acesso às configurações globais.
        </p>
      </div>

      <Alert className="mb-6 border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          <strong>Atenção:</strong> Administradores do sistema têm acesso total a todos os ambientes e podem gerenciar configurações globais. Conceda essa permissão com cuidado.
        </AlertDescription>
      </Alert>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* System Admins */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Administradores do Sistema</CardTitle>
          </div>
          <CardDescription>
            Usuários com acesso total às configurações do sistema ({systemAdmins.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemAdmins.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhum administrador encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemAdmins.map((adminUser) => (
                  <UserRow
                    key={adminUser.id}
                    user={adminUser}
                    isSelf={isSelf(adminUser.id)}
                    onToggleRole={() => handleToggleRole(adminUser)}
                    isLoading={updateSystemRole.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Regular Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Usuários</CardTitle>
          </div>
          <CardDescription>
            Usuários sem permissões administrativas do sistema ({regularUsers.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {regularUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhum usuário encontrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regularUsers.map((regularUser) => (
                  <UserRow
                    key={regularUser.id}
                    user={regularUser}
                    isSelf={isSelf(regularUser.id)}
                    onToggleRole={() => handleToggleRole(regularUser)}
                    isLoading={updateSystemRole.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, user: null, action: "promote" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "promote" 
                ? "Promover a Administrador do Sistema?" 
                : "Remover permissão de Administrador?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "promote" ? (
                <>
                  <strong>{confirmDialog.user?.email}</strong> terá acesso total a todos os 
                  ambientes e configurações do sistema. Esta ação pode ser revertida.
                </>
              ) : (
                <>
                  <strong>{confirmDialog.user?.email}</strong> perderá acesso às configurações 
                  do sistema e só poderá acessar seus próprios ambientes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              {confirmDialog.action === "promote" ? "Promover" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface UserRowProps {
  user: AdminUser;
  isSelf: boolean;
  onToggleRole: () => void;
  isLoading: boolean;
}

function UserRow({ user, isSelf, onToggleRole, isLoading }: UserRowProps) {
  const isAdmin = user.system_role === "system_admin";
  
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.full_name || "Sem nome"}</span>
            {isSelf && (
              <Badge variant="outline" className="text-xs">
                Você
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>
      </TableCell>
      <TableCell>
        {user.last_sign_in_at ? (
          <span className="text-sm text-muted-foreground">
            {format(new Date(user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Nunca acessou</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isSelf ? (
          <span className="text-xs text-muted-foreground">
            Não é possível alterar o próprio papel
          </span>
        ) : (
          <Button
            variant={isAdmin ? "outline" : "default"}
            size="sm"
            onClick={onToggleRole}
            disabled={isLoading}
          >
            {isAdmin ? (
              <>
                <User className="h-3 w-3 mr-1" />
                Remover Admin
              </>
            ) : (
              <>
                <Shield className="h-3 w-3 mr-1" />
                Promover a Admin
              </>
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
