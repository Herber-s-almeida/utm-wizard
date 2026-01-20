import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, Edit, Ban, UserPlus, Wand2, CheckCircle, Info, User } from 'lucide-react';
import { PermissionLevel, EnvironmentSection, useEnvironment } from '@/contexts/EnvironmentContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EnvironmentRole = 'admin' | 'user';

const SECTIONS: { key: EnvironmentSection; label: string }[] = [
  { key: 'executive_dashboard', label: 'Dashboard Gerencial' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'media_plans', label: 'Planos de Mídia' },
  { key: 'media_resources', label: 'Recursos de Mídia' },
  { key: 'taxonomy', label: 'Taxonomia' },
  { key: 'library', label: 'Biblioteca' },
];

// Permission options for members (no 'admin' option - admins get full access automatically)
const PERMISSION_OPTIONS: { value: PermissionLevel; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'Sem acesso', icon: <Ban className="h-3 w-3" /> },
  { value: 'view', label: 'Visualizar', icon: <Eye className="h-3 w-3" /> },
  { value: 'edit', label: 'Editar', icon: <Edit className="h-3 w-3" /> },
];

const ROLE_OPTIONS: { value: EnvironmentRole; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'admin', 
    label: 'Administrador', 
    description: 'Pode convidar outros membros e gerenciar permissões',
    icon: <Shield className="h-5 w-5 text-blue-500" />
  },
  { 
    value: 'user', 
    label: 'Usuário', 
    description: 'Acesso baseado nas permissões granulares abaixo',
    icon: <User className="h-5 w-5 text-muted-foreground" />
  },
];

const PRESETS = {
  viewer: {
    label: 'Visualizador',
    description: 'Pode ver tudo, não pode editar',
    permissions: {
      executive_dashboard: 'view' as PermissionLevel,
      reports: 'view' as PermissionLevel,
      finance: 'view' as PermissionLevel,
      media_plans: 'view' as PermissionLevel,
      media_resources: 'view' as PermissionLevel,
      taxonomy: 'view' as PermissionLevel,
      library: 'view' as PermissionLevel,
    },
  },
  editor: {
    label: 'Editor',
    description: 'Pode editar planos e recursos',
    permissions: {
      executive_dashboard: 'view' as PermissionLevel,
      reports: 'view' as PermissionLevel,
      finance: 'view' as PermissionLevel,
      media_plans: 'edit' as PermissionLevel,
      media_resources: 'edit' as PermissionLevel,
      taxonomy: 'view' as PermissionLevel,
      library: 'view' as PermissionLevel,
    },
  },
  finance_only: {
    label: 'Financeiro',
    description: 'Acesso apenas ao módulo financeiro',
    permissions: {
      executive_dashboard: 'none' as PermissionLevel,
      reports: 'none' as PermissionLevel,
      finance: 'edit' as PermissionLevel,
      media_plans: 'view' as PermissionLevel,
      media_resources: 'none' as PermissionLevel,
      taxonomy: 'none' as PermissionLevel,
      library: 'none' as PermissionLevel,
    },
  },
  full_access: {
    label: 'Acesso Total',
    description: 'Pode editar tudo em todas as seções',
    permissions: {
      executive_dashboard: 'edit' as PermissionLevel,
      reports: 'edit' as PermissionLevel,
      finance: 'edit' as PermissionLevel,
      media_plans: 'edit' as PermissionLevel,
      media_resources: 'edit' as PermissionLevel,
      taxonomy: 'edit' as PermissionLevel,
      library: 'edit' as PermissionLevel,
    },
  },
};

type PresetKey = keyof typeof PRESETS;

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<EnvironmentRole>('user');
  const [permissions, setPermissions] = useState<Record<EnvironmentSection, PermissionLevel>>({
    executive_dashboard: 'view',
    reports: 'view',
    finance: 'none',
    media_plans: 'view',
    media_resources: 'view',
    taxonomy: 'view',
    library: 'view',
  });

  // When admin role is selected, set all permissions to 'edit'
  useEffect(() => {
    if (selectedRole === 'admin') {
      setPermissions({
        executive_dashboard: 'edit',
        reports: 'edit',
        finance: 'edit',
        media_plans: 'edit',
        media_resources: 'edit',
        taxonomy: 'edit',
        library: 'edit',
      });
    }
  }, [selectedRole]);

  const applyPreset = (presetKey: PresetKey) => {
    setPermissions(PRESETS[presetKey].permissions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Digite o email do usuário');
      return;
    }

    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!currentEnvironmentId) {
      toast.error('Nenhum ambiente selecionado');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call edge function with environment_id
      const { data, error } = await supabase.functions.invoke('invite-environment-member', {
        body: {
          email: email.trim(),
          permissions,
          environment_role: selectedRole,
          environment_id: currentEnvironmentId,
        },
      });

      if (error) throw error;

      // Show appropriate message based on result type
      if (data?.type === 'existing_user') {
        toast.success('Membro adicionado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['environment-members'] });
        queryClient.invalidateQueries({ queryKey: ['environment-roles'] });
        queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
        queryClient.invalidateQueries({ queryKey: ['user-environments'] });
        queryClient.invalidateQueries({ queryKey: ['user-environments-v2'] });
        onOpenChange(false);
        resetForm();
      } else if (data?.type === 'invite_sent') {
        // Show success message with instructions
        setSuccessEmail(email);
        setInviteSuccess(true);
        queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      } else {
        toast.success(data?.message || `Convite criado para ${email}`);
        queryClient.invalidateQueries({ queryKey: ['environment-members'] });
        queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
        onOpenChange(false);
        resetForm();
      }
    } catch (error: any) {
      console.error('Invite error:', error);
      toast.error(error.message || 'Erro ao enviar convite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = (section: EnvironmentSection, level: PermissionLevel) => {
    setPermissions(prev => ({ ...prev, [section]: level }));
  };

  const resetForm = () => {
    setEmail('');
    setSelectedRole('user');
    setPermissions({
      executive_dashboard: 'view',
      reports: 'view',
      finance: 'none',
      media_plans: 'view',
      media_resources: 'view',
      taxonomy: 'view',
      library: 'view',
    });
  };

  const handleClose = () => {
    setInviteSuccess(false);
    setSuccessEmail('');
    resetForm();
    onOpenChange(false);
  };

  // If invite was sent successfully, show instructions
  if (inviteSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Convite Criado
            </DialogTitle>
            <DialogDescription>
              O convite foi registrado no sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Email convidado:</strong> {successEmail}
              </AlertDescription>
            </Alert>
            
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <p className="text-sm font-medium">
                Instruções para o usuário:
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Acesse <code className="bg-background px-1 rounded">mediaplab.lovable.app/auth/join</code></li>
                <li>Preencha o formulário com o email <strong>{successEmail}</strong></li>
                <li>Complete o cadastro com nome e senha</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                O convite expira em 7 dias. Você pode enviar estas instruções por email ou WhatsApp.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Membro
          </DialogTitle>
          <DialogDescription>
            Convide um usuário para acessar este ambiente com permissões personalizadas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email do usuário</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              O usuário poderá criar conta em <code>/auth/join</code> usando este email
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label>Papel no Ambiente</Label>
            <RadioGroup
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as EnvironmentRole)}
              className="grid grid-cols-2 gap-4"
            >
              {ROLE_OPTIONS.map((role) => (
                <Card 
                  key={role.value}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedRole === role.value 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-muted-foreground/50"
                  )}
                >
                  <label htmlFor={`role-${role.value}`} className="cursor-pointer block">
                    <CardContent className="p-4 flex items-start gap-3">
                      <RadioGroupItem value={role.value} id={`role-${role.value}`} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {role.icon}
                          <span className="font-medium">{role.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      </div>
                    </CardContent>
                  </label>
                </Card>
              ))}
            </RadioGroup>
          </div>

          {/* Granular permissions - only show for 'user' role */}
          {selectedRole === 'user' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Permissões por seção</Label>
                <div className="flex gap-2 flex-wrap justify-end">
                  {(Object.entries(PRESETS) as [PresetKey, typeof PRESETS.viewer][]).map(([key, preset]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(key)}
                      className="text-xs"
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg divide-y">
                {SECTIONS.map(section => (
                  <div key={section.key} className="flex items-center justify-between p-3">
                    <span className="font-medium">{section.label}</span>
                    <Select
                      value={permissions[section.key]}
                      onValueChange={(value) => 
                        handlePermissionChange(section.key, value as PermissionLevel)
                      }
                    >
                      <SelectTrigger className="w-[140px]">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin role info */}
          {selectedRole === 'admin' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Administradores têm acesso total ao ambiente e podem convidar outros membros.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !currentEnvironmentId}>
              {isSubmitting ? 'Enviando...' : 'Criar Convite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
