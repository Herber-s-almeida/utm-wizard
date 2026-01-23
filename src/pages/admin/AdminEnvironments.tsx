import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Building2, 
  Plus, 
  ClipboardList, 
  ChevronDown, 
  ChevronRight,
  Shield,
  User,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
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
import { 
  useAdminEnvironments, 
  useDeleteEnvironment,
  useRemoveEnvironmentMember,
  useUpdateEnvironmentMember,
  AdminEnvironment,
  EnvironmentMember,
} from "@/hooks/useAdminEnvironments";
import { useAccessRequests } from "@/hooks/useAccessRequests";
import { AccessRequestsTable } from "@/components/admin/AccessRequestsTable";
import { CreateEnvironmentDialog } from "@/components/admin/CreateEnvironmentDialog";
import { EditEnvironmentDialog } from "@/components/admin/EditEnvironmentDialog";
import { AddMemberToEnvironmentDialog } from "@/components/admin/AddMemberToEnvironmentDialog";
import { cn } from "@/lib/utils";

export default function AdminEnvironments() {
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editEnv, setEditEnv] = useState<AdminEnvironment | null>(null);
  const [addMemberEnv, setAddMemberEnv] = useState<AdminEnvironment | null>(null);
  const [deleteEnvId, setDeleteEnvId] = useState<string | null>(null);
  const [removeMember, setRemoveMember] = useState<{
    environmentId: string;
    userId: string;
    name: string;
  } | null>(null);
  const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());

  const { data: environments, isLoading: envsLoading } = useAdminEnvironments();
  const { data: requests, isLoading: requestsLoading } = useAccessRequests();
  const deleteEnvironment = useDeleteEnvironment();
  const removeEnvironmentMember = useRemoveEnvironmentMember();
  const updateEnvironmentMember = useUpdateEnvironmentMember();

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];

  const filteredEnvironments = environments?.filter((env) => {
    const searchLower = search.toLowerCase();
    return (
      env.name?.toLowerCase().includes(searchLower) ||
      env.company_name?.toLowerCase().includes(searchLower) ||
      env.members?.some(m => 
        m.full_name?.toLowerCase().includes(searchLower) ||
        m.email?.toLowerCase().includes(searchLower)
      )
    );
  });

  const filteredRequests = requests?.filter((request) => {
    const searchLower = search.toLowerCase();
    return (
      request.email?.toLowerCase().includes(searchLower) ||
      request.full_name?.toLowerCase().includes(searchLower) ||
      request.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const toggleExpand = (envId: string) => {
    setExpandedEnvs(prev => {
      const next = new Set(prev);
      if (next.has(envId)) {
        next.delete(envId);
      } else {
        next.add(envId);
      }
      return next;
    });
  };

  const handleDeleteEnvironment = () => {
    if (deleteEnvId) {
      deleteEnvironment.mutate(deleteEnvId);
      setDeleteEnvId(null);
    }
  };

  const handleRemoveMember = () => {
    if (removeMember) {
      removeEnvironmentMember.mutate({
        environmentId: removeMember.environmentId,
        userId: removeMember.userId,
      });
      setRemoveMember(null);
    }
  };

  const handleToggleAdmin = (env: AdminEnvironment, member: EnvironmentMember) => {
    updateEnvironmentMember.mutate({
      environmentId: env.id,
      userId: member.user_id,
      isAdmin: !member.is_environment_admin,
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Ambientes do Sistema</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os ambientes e seus membros
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Ambiente
          </Button>
        </div>

        <Tabs defaultValue="environments" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="environments" className="gap-2">
                <Building2 className="h-4 w-4" />
                Ambientes
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Solicitações
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="environments">
            {envsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : filteredEnvironments && filteredEnvironments.length > 0 ? (
              <div className="space-y-3">
                {filteredEnvironments.map((env) => (
                  <EnvironmentCard
                    key={env.id}
                    environment={env}
                    isExpanded={expandedEnvs.has(env.id)}
                    onToggleExpand={() => toggleExpand(env.id)}
                    onEdit={() => setEditEnv(env)}
                    onDelete={() => setDeleteEnvId(env.id)}
                    onAddMember={() => setAddMemberEnv(env)}
                    onRemoveMember={(member) => setRemoveMember({
                      environmentId: env.id,
                      userId: member.user_id,
                      name: member.full_name || member.email || "usuário",
                    })}
                    onToggleAdmin={(member) => handleToggleAdmin(env, member)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum ambiente encontrado</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {requestsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredRequests && filteredRequests.length > 0 ? (
              <AccessRequestsTable requests={filteredRequests} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma solicitação de acesso</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CreateEnvironmentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {editEnv && (
          <EditEnvironmentDialog
            environment={editEnv}
            open={!!editEnv}
            onOpenChange={(open) => !open && setEditEnv(null)}
          />
        )}

        {addMemberEnv && (
          <AddMemberToEnvironmentDialog
            environment={addMemberEnv}
            open={!!addMemberEnv}
            onOpenChange={(open) => !open && setAddMemberEnv(null)}
          />
        )}

        {/* Delete Environment Confirmation */}
        <AlertDialog open={!!deleteEnvId} onOpenChange={(open) => !open && setDeleteEnvId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir ambiente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os membros perderão acesso a este ambiente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEnvironment}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Member Confirmation */}
        <AlertDialog open={!!removeMember} onOpenChange={(open) => !open && setRemoveMember(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover membro?</AlertDialogTitle>
              <AlertDialogDescription>
                Remover {removeMember?.name} deste ambiente? O usuário perderá todo acesso aos dados do ambiente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

interface EnvironmentCardProps {
  environment: AdminEnvironment;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddMember: () => void;
  onRemoveMember: (member: EnvironmentMember) => void;
  onToggleAdmin: (member: EnvironmentMember) => void;
}

function EnvironmentCard({
  environment,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
  onToggleAdmin,
}: EnvironmentCardProps) {
  const admins = environment.members.filter(m => m.is_environment_admin);
  const regularMembers = environment.members.filter(m => !m.is_environment_admin);

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{environment.name}</h3>
                  {environment.company_name && (
                    <p className="text-sm text-muted-foreground">{environment.company_name}</p>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {environment.admin_count}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <User className="h-3 w-3" />
                  {environment.member_count}
                </Badge>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar ambiente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAddMember}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar membro
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir ambiente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="border-t pt-4 space-y-4">
              {/* Admins Section */}
              {admins.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Administradores ({admins.length})
                  </h4>
                  <div className="space-y-2">
                    {admins.map((member) => (
                      <MemberRow
                        key={member.user_id}
                        member={member}
                        onToggleAdmin={() => onToggleAdmin(member)}
                        onRemove={() => onRemoveMember(member)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Members Section */}
              {regularMembers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Membros ({regularMembers.length})
                  </h4>
                  <div className="space-y-2">
                    {regularMembers.map((member) => (
                      <MemberRow
                        key={member.user_id}
                        member={member}
                        onToggleAdmin={() => onToggleAdmin(member)}
                        onRemove={() => onRemoveMember(member)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {environment.members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum membro neste ambiente
                </p>
              )}

              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={onAddMember}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar membro
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface MemberRowProps {
  member: EnvironmentMember;
  onToggleAdmin: () => void;
  onRemove: () => void;
}

function MemberRow({ member, onToggleAdmin, onRemove }: MemberRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          member.is_environment_admin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {member.is_environment_admin ? (
            <Shield className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {member.full_name || member.email || "Usuário"}
          </p>
          {member.full_name && member.email && (
            <p className="text-xs text-muted-foreground">{member.email}</p>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onToggleAdmin}>
            <Shield className="h-4 w-4 mr-2" />
            {member.is_environment_admin ? "Remover admin" : "Tornar admin"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={onRemove}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover do ambiente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
