import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Users, UserPlus, Trash2, Shield, Eye, Edit, Ban } from 'lucide-react';
import { useEnvironmentPermissions, PermissionLevel, EnvironmentSection } from '@/hooks/useEnvironmentPermissions';
import { InviteMemberDialog } from '@/components/admin/InviteMemberDialog';
import { toast } from 'sonner';

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

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

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

  const getPermissionBadgeVariant = (level: PermissionLevel) => {
    switch (level) {
      case 'admin': return 'default';
      case 'edit': return 'secondary';
      case 'view': return 'outline';
      default: return 'destructive';
    }
  };

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
              {memberCount}/30 membros
            </Badge>
            <Button 
              onClick={() => setInviteDialogOpen(true)}
              disabled={!canInviteMore}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Membro
            </Button>
          </div>
        </div>

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
                <h3 className="mt-4 text-lg font-medium">Nenhum membro convidado</h3>
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
                            {!member.accepted_at && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Convite pendente
                              </Badge>
                            )}
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

        {/* Remove Confirmation Dialog */}
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
      </div>
    </DashboardLayout>
  );
}
