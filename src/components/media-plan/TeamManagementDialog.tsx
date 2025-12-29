import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlanRoles, AppRole } from '@/hooks/usePlanRoles';
import { Crown, Pencil, Eye, CheckCircle, UserPlus, Trash2, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface TeamManagementDialogProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_ICONS: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  editor: Pencil,
  viewer: Eye,
  approver: CheckCircle,
};

const ROLE_COLORS: Record<AppRole, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  editor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
  approver: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
};

export function TeamManagementDialog({ planId, open, onOpenChange }: TeamManagementDialogProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('viewer');
  const queryClient = useQueryClient();
  
  const { 
    members, 
    isLoading, 
    canManageTeam,
    updateRole,
    removeMember,
    roleLabels,
    roleDescriptions,
  } = usePlanRoles(planId);

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('invite-to-plan', {
        body: { email, planId, role },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao convidar usuário');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Membro convidado com sucesso!');
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['plan_roles', planId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Digite um email válido');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const handleRoleChange = (memberId: string, newRole: AppRole) => {
    updateRole.mutate({ roleId: memberId, newRole });
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (confirm(`Remover ${memberName} do plano?`)) {
      removeMember.mutate(memberId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Gerenciar Equipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Section */}
          {canManageTeam && (
            <>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Convidar por email</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pl-9"
                        disabled={inviteMutation.isPending}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select 
                      value={inviteRole} 
                      onValueChange={(v) => setInviteRole(v as AppRole)}
                      disabled={inviteMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span>Visualizador</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            <span>Editor</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="approver">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>Aprovador</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    <span className="ml-2">Convidar</span>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {roleDescriptions[inviteRole]}
                </p>
              </form>

              <Separator />
            </>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <Label>Membros da equipe</Label>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-2">
                  {members.map((member) => {
                    const Icon = ROLE_ICONS[member.role];
                    const colorClass = ROLE_COLORS[member.role];

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.name}</p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {member.isOwner ? (
                            <Badge variant="outline" className={colorClass}>
                              {roleLabels[member.role]}
                            </Badge>
                          ) : canManageTeam ? (
                            <>
                              <Select
                                value={member.role}
                                onValueChange={(v) => handleRoleChange(member.id, v as AppRole)}
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewer">Visualizador</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="approver">Aprovador</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveMember(member.id, member.name || 'Membro')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline" className={colorClass}>
                              {roleLabels[member.role]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {members.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum membro na equipe</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Legend */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Permissões por papel:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Crown className="h-3 w-3 text-amber-600" />
                <span>Proprietário: controle total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Pencil className="h-3 w-3 text-blue-600" />
                <span>Editor: criar e editar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-gray-500" />
                <span>Visualizador: somente ver</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Aprovador: ver + status</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
