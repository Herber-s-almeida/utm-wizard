import { useState } from 'react';
import { Users, Crown, Pencil, Eye, CheckCircle, UserPlus, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePlanRoles, AppRole, PlanMember } from '@/hooks/usePlanRoles';

interface TeamManagementTabProps {
  planId: string;
}

const ROLE_ICONS: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  editor: Pencil,
  viewer: Eye,
  approver: CheckCircle,
};

const ROLE_COLORS: Record<AppRole, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  approver: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export function TeamManagementTab({ planId }: TeamManagementTabProps) {
  const {
    members,
    isLoading,
    canManageTeam,
    updateRole,
    removeMember,
    roleLabels,
    roleDescriptions,
  } = usePlanRoles(planId);

  const [memberToRemove, setMemberToRemove] = useState<PlanMember | null>(null);

  const handleRoleChange = (member: PlanMember, newRole: AppRole) => {
    if (member.isOwner) return;
    updateRole.mutate({ roleId: member.id, newRole });
  };

  const handleRemoveMember = () => {
    if (!memberToRemove) return;
    removeMember.mutate(memberToRemove.id);
    setMemberToRemove(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Carregando equipe...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Equipe do Plano</h3>
        <Badge variant="secondary" className="ml-auto">
          {members.length} {members.length === 1 ? 'membro' : 'membros'}
        </Badge>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {(Object.keys(roleLabels) as AppRole[]).map((role) => {
          const Icon = ROLE_ICONS[role];
          return (
            <div key={role} className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-3 w-3" />
              <span className="font-medium">{roleLabels[role]}:</span>
              <span className="truncate">{roleDescriptions[role].split(',')[0]}</span>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Members List */}
      <div className="space-y-3">
        {members.map((member) => {
          const Icon = ROLE_ICONS[member.role];
          const initials = member.name
            ? member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{member.name}</span>
                  {member.isOwner && (
                    <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                {member.email && (
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                )}
              </div>

              {/* Role Badge/Dropdown */}
              {member.isOwner ? (
                <Badge className={ROLE_COLORS[member.role]}>
                  <Icon className="h-3 w-3 mr-1" />
                  {roleLabels[member.role]}
                </Badge>
              ) : canManageTeam ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Icon className="h-3 w-3" />
                      {roleLabels[member.role]}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(['editor', 'viewer', 'approver'] as AppRole[]).map((role) => {
                      const RoleIcon = ROLE_ICONS[role];
                      return (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => handleRoleChange(member, role)}
                          className={member.role === role ? 'bg-accent' : ''}
                        >
                          <RoleIcon className="h-4 w-4 mr-2" />
                          {roleLabels[role]}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Badge variant="secondary" className={ROLE_COLORS[member.role]}>
                  <Icon className="h-3 w-3 mr-1" />
                  {roleLabels[member.role]}
                </Badge>
              )}

              {/* Remove Button (only for non-owners, if user can manage) */}
              {!member.isOwner && canManageTeam && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setMemberToRemove(member)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Member Section - placeholder for future */}
      {canManageTeam && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Membro
            </Label>
            <p className="text-xs text-muted-foreground">
              Funcionalidade de convite por email em desenvolvimento. Por enquanto, membros devem ser adicionados 
              diretamente no banco de dados.
            </p>
          </div>
        </>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.name} será removido do plano e perderá acesso a todos os dados.
              Esta ação pode ser desfeita adicionando o membro novamente.
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
  );
}
