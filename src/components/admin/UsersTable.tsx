import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Pencil, Trash2, Shield, FolderOpen, ShieldOff, Building2, Users } from "lucide-react";
import { AdminUser, useDeleteUser, useUpdateSystemRole, usePromoteToSystemUser } from "@/hooks/useAdminUsers";
import { EditUserDialog } from "./EditUserDialog";
import { UserEnvironmentDialog } from "./UserEnvironmentDialog";
import { useAuth } from "@/hooks/useAuth";

interface UsersTableProps {
  users: AdminUser[];
}

export function UsersTable({ users }: UsersTableProps) {
  const { user: currentUser } = useAuth();
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [envUser, setEnvUser] = useState<AdminUser | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  
  const deleteUserMutation = useDeleteUser();
  const updateRoleMutation = useUpdateSystemRole();
  const promoteToSystemUserMutation = usePromoteToSystemUser();

  const handleDelete = () => {
    if (deleteUserId) {
      deleteUserMutation.mutate(deleteUserId);
      setDeleteUserId(null);
    }
  };

  const handleToggleAdmin = (user: AdminUser) => {
    const newRole = user.system_role === "system_admin" ? "user" : "system_admin";
    updateRoleMutation.mutate({ userId: user.id, role: newRole });
  };

  const handlePromoteToSystemUser = (user: AdminUser) => {
    promoteToSystemUserMutation.mutate(user.id);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Ambiente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Permissão</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user.full_name || "Sem nome"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {user.company || (
                    <span className="text-muted-foreground text-xs italic">Não configurado</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.is_system_user ? "default" : "outline"}
                    className={user.is_system_user ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}
                  >
                    {user.is_system_user ? (
                      <><Building2 className="h-3 w-3 mr-1" />Owner</>
                    ) : (
                      <><Users className="h-3 w-3 mr-1" />Membro</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(user.created_at), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell>
                  {user.last_sign_in_at
                    ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })
                    : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.system_role === "system_admin" ? "default" : "secondary"}
                  >
                    {user.system_role === "system_admin" ? "Administrador" : "Usuário"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditUser(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEnvUser(user)}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Ver ambiente
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!user.is_system_user && (
                        <DropdownMenuItem
                          onClick={() => handlePromoteToSystemUser(user)}
                        >
                          <Building2 className="mr-2 h-4 w-4" />
                          Promover a Owner de Ambiente
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleToggleAdmin(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.system_role === "system_admin" ? (
                          <>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Remover admin do sistema
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Promover a admin do sistema
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteUserId(user.id)}
                        disabled={user.id === currentUser?.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      />

      <UserEnvironmentDialog
        user={envUser}
        open={!!envUser}
        onOpenChange={(open) => !open && setEnvUser(null)}
      />

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados do usuário serão
              permanentemente excluídos, incluindo planos de mídia e configurações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
