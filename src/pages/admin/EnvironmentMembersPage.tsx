import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Users, UserPlus, Trash2, Shield, Eye, Edit, Ban, Bell, Clock, Copy, Mail } from 'lucide-react';
import { useEnvironmentPermissions, PermissionLevel, EnvironmentSection } from '@/hooks/useEnvironmentPermissions';
import { usePendingInvites, PendingInvite } from '@/hooks/usePendingInvites';
import { useResourceNotifications } from '@/hooks/useResourceNotifications';
import { InviteMemberDialog } from '@/components/admin/InviteMemberDialog';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SECTIONS: { key: EnvironmentSection; label: string }[] = [
  { key: 'executive_dashboard', label: 'Dashboard' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'media_plans', label: 'Planos' },
  { key: 'media_resources', label: 'Recursos' },
  { key: 'taxonomy', label: 'Taxonomia' },
  { key: 'library', label: 'Biblioteca' },
];

const PERMISSION_OPTIONS: { value: PermissionLevel; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'Sem acesso', icon: <Ban className="h-3 w-3" /> },
  { value: 'view', label: 'Visualizar', icon: <Eye className="h-3 w-3" /> },
  { value: 'edit', label: 'Editar', icon: <Edit className="h-3 w-3" /> },
  { value: 'admin', label: 'Admin', icon: <Shield className="h-3 w-3" /> },
];

export default function EnvironmentMembersPage() {
  const {
    environmentMembers,
    memberCount,
    canInviteMore,
    isLoadingMembers,
    updateMemberPermissions,
    removeMember,
    isUpdating,
    isRemoving,
  } = useEnvironmentPermissions();

  const {
    pendingInvites,
    pendingInviteCount,
    isLoadingPendingInvites,
    deletePendingInvite,
    regenerateInviteLink,
    isDeletingInvite,
    isRegeneratingLink,
  } = usePendingInvites();

  const { updateNotificationPreference, isUpdatingPreference } = useResourceNotifications();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [inviteToDelete, setInviteToDelete] = useState<string | null>(null);

  const handlePermissionChange = (memberId: string, section: EnvironmentSection, level: PermissionLevel) => {
    updateMemberPermissions(
      { memberId, permissions: { [section]: level } },
      {
        onSuccess: () => toast.success('Permissão atualizada'),
        onError: (error) => toast.error(`Erro ao atualizar: ${error.message}`),
      }
    );
  };

  const handleRemoveMember = () => {
    if (!memberToRemove) return;
    
    removeMember(memberToRemove, {
      onSuccess: () => {
        toast.success('Membro removido do ambiente');
        setMemberToRemove(null);
      },
      onError: (error) => toast.error(`Erro ao remover: ${error.message}`),
    });
  };

  const handleDeleteInvite = () => {
    if (!inviteToDelete) return;
    
    deletePendingInvite(inviteToDelete, {
      onSuccess: () => {
        toast.success('Convite cancelado');
        setInviteToDelete(null);
      },
      onError: (error: any) => toast.error(`Erro ao cancelar: ${error.message}`),
    });
  };

  const handleNotificationToggle = (memberId: string, enabled: boolean) => {
    updateNotificationPreference(
      { memberId, enabled },
      {
        onSuccess: () => toast.success(`Notificações ${enabled ? 'ativadas' : 'desativadas'}`),
        onError: (error) => toast.error(`Erro: ${error.message}`),
      }
    );
  };

  const getPermissionBadgeVariant = (level: PermissionLevel) => {
    switch (level) {
      case 'admin': return 'default';
      case 'edit': return 'secondary';
      case 'view': return 'outline';
      default: return 'destructive';
    }
  };

  const handleCopyInviteLink = async (invite: PendingInvite) => {
    try {
      const result = await regenerateInviteLink(invite);
      if (result?.inviteLink) {
        await navigator.clipboard.writeText(result.inviteLink);
        toast.success('Link copiado!');
      } else {
        toast.error('Não foi possível gerar o link');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar link');
    }
  };

  const totalSlots = memberCount + pendingInviteCount;
  const canInvite = totalSlots < 30;

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Membros do Ambiente
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os usuários que têm acesso ao seu ambiente
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm py-1 px-3">
              {memberCount} ativos {pendingInviteCount > 0 && `+ ${pendingInviteCount} pendentes`} / 30
            </Badge>
            <Button 
              onClick={() => setInviteDialogOpen(true)}
              disabled={!canInvite}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Membro
            </Button>
          </div>
        </div>

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-amber-500" />
                Convites Pendentes
              </CardTitle>
              <CardDescription>
                Usuários que ainda não criaram conta na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {invite.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invite.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invite.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center gap-1 justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopyInviteLink(invite)}
                                  disabled={isRegeneratingLink}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copiar link de convite</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setInviteToDelete(invite.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Cancelar convite</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Active Members Section */}
        <Card>
          <CardHeader>
            <CardTitle>Membros Ativos</CardTitle>
            <CardDescription>
              Configure as permissões de cada membro por seção da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando membros...
              </div>
            ) : environmentMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Nenhum membro ativo</h3>
                <p className="text-muted-foreground mt-2">
                  Convide até 30 pessoas para colaborar no seu ambiente
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convidar Primeiro Membro
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Membro</TableHead>
                      {SECTIONS.map(section => (
                        <TableHead key={section.key} className="text-center min-w-[100px]">
                          {section.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[100px]">
                        <div className="flex items-center justify-center gap-1">
                          <Bell className="h-3 w-3" />
                          Notif.
                        </div>
                      </TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {environmentMembers.map(member => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {member.profile?.full_name || 'Usuário'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email || member.member_user_id.slice(0, 8)}
                            </p>
                          </div>
                        </TableCell>
                        
                        {SECTIONS.map(section => {
                          const columnKey = `perm_${section.key}` as keyof typeof member;
                          const currentLevel = member[columnKey] as PermissionLevel;
                          
                          return (
                            <TableCell key={section.key} className="text-center">
                              <Select
                                value={currentLevel}
                                onValueChange={(value) => 
                                  handlePermissionChange(member.id, section.key, value as PermissionLevel)
                                }
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="w-[110px] mx-auto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PERMISSION_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        {option.icon}
                                        {option.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                        
                        <TableCell className="text-center">
                          <Switch
                            checked={member.notify_media_resources || false}
                            onCheckedChange={(checked) => 
                              handleNotificationToggle(member.id, checked)
                            }
                            disabled={isUpdatingPreference}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setMemberToRemove(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permission Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legenda de Permissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PERMISSION_OPTIONS.map(option => (
                <div key={option.value} className="flex items-center gap-2">
                  <Badge variant={getPermissionBadgeVariant(option.value)} className="w-20 justify-center">
                    {option.icon}
                    <span className="ml-1">{option.label}</span>
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {option.value === 'none' && 'Seção invisível'}
                    {option.value === 'view' && 'Apenas leitura'}
                    {option.value === 'edit' && 'Criar e editar'}
                    {option.value === 'admin' && 'Controle total'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invite Dialog */}
        <InviteMemberDialog 
          open={inviteDialogOpen} 
          onOpenChange={setInviteDialogOpen} 
        />

        {/* Remove Member Confirmation Dialog */}
        <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover membro?</AlertDialogTitle>
              <AlertDialogDescription>
                Este membro perderá todo o acesso ao seu ambiente. 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isRemoving}
              >
                {isRemoving ? 'Removendo...' : 'Remover'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Invite Confirmation Dialog */}
        <AlertDialog open={!!inviteToDelete} onOpenChange={() => setInviteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
              <AlertDialogDescription>
                O link de convite será invalidado e o usuário não poderá mais usá-lo para criar conta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Manter convite</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteInvite}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeletingInvite}
              >
                {isDeletingInvite ? 'Cancelando...' : 'Cancelar convite'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
