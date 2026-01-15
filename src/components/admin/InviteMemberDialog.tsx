import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Edit, Ban, UserPlus, Wand2 } from 'lucide-react';
import { PermissionLevel, EnvironmentSection } from '@/hooks/useEnvironmentPermissions';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTIONS: { key: EnvironmentSection; label: string }[] = [
  { key: 'executive_dashboard', label: 'Dashboard Gerencial' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'media_plans', label: 'Planos de Mídia' },
  { key: 'media_resources', label: 'Recursos de Mídia' },
  { key: 'taxonomy', label: 'Taxonomia' },
  { key: 'library', label: 'Biblioteca' },
];

const PERMISSION_OPTIONS: { value: PermissionLevel; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'Sem acesso', icon: <Ban className="h-3 w-3" /> },
  { value: 'view', label: 'Visualizar', icon: <Eye className="h-3 w-3" /> },
  { value: 'edit', label: 'Editar', icon: <Edit className="h-3 w-3" /> },
  { value: 'admin', label: 'Admin', icon: <Shield className="h-3 w-3" /> },
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
  admin: {
    label: 'Administrador',
    description: 'Acesso total ao ambiente',
    permissions: {
      executive_dashboard: 'admin' as PermissionLevel,
      reports: 'admin' as PermissionLevel,
      finance: 'admin' as PermissionLevel,
      media_plans: 'admin' as PermissionLevel,
      media_resources: 'admin' as PermissionLevel,
      taxonomy: 'admin' as PermissionLevel,
      library: 'admin' as PermissionLevel,
    },
  },
};

type PresetKey = keyof typeof PRESETS;

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<Record<EnvironmentSection, PermissionLevel>>({
    executive_dashboard: 'view',
    reports: 'view',
    finance: 'none',
    media_plans: 'view',
    media_resources: 'view',
    taxonomy: 'view',
    library: 'view',
  });

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

    setIsSubmitting(true);

    try {
      // Call edge function to invite member
      const { data, error } = await supabase.functions.invoke('invite-environment-member', {
        body: {
          email: email.trim(),
          permissions,
        },
      });

      if (error) throw error;

      // Show appropriate message based on result type
      if (data?.type === 'existing_user') {
        toast.success('Membro adicionado com sucesso!');
      } else if (data?.type === 'invite_sent') {
        toast.success('Convite enviado! O usuário receberá um email para criar conta.');
      } else {
        toast.success(data?.message || `Convite enviado para ${email}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['environment-members'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      onOpenChange(false);
      setEmail('');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Membro
          </DialogTitle>
          <DialogDescription>
            Convide um usuário para acessar seu ambiente com permissões personalizadas
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
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Permissões por seção</Label>
              <div className="flex gap-2">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
