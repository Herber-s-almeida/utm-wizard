import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Mail, Users, Loader2, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ChangeLog {
  id: string;
  change_date: string;
  notes: string | null;
}

interface EligibleMember {
  id: string;
  member_user_id: string;
  profile: {
    full_name: string | null;
  } | null;
  email?: string;
}

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  recentChangeLogs?: ChangeLog[];
}

export function SendNotificationDialog({
  open,
  onOpenChange,
  planId,
  planName,
  recentChangeLogs = [],
}: SendNotificationDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');

  // Fetch eligible members (those who opted in for notifications)
  const { data: eligibleMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['notification-eligible-members', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get environment members with notify enabled
      const { data: members, error: membersError } = await supabase
        .from('environment_members')
        .select('id, member_user_id')
        .eq('environment_owner_id', user.id)
        .eq('notify_media_resources', true)
        .not('accepted_at', 'is', null);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Get profiles for these members
      const memberUserIds = members.map(m => m.member_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', memberUserIds);

      // Combine the data
      return members.map(m => ({
        id: m.id,
        member_user_id: m.member_user_id,
        profile: profiles?.find(p => p.user_id === m.member_user_id) || null,
      })) as EligibleMember[];
    },
    enabled: open && !!user?.id,
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      if (selectedMembers.length === 0) {
        throw new Error('Selecione ao menos um destinatário');
      }

      const { data, error } = await supabase.functions.invoke('send-resource-notification', {
        body: {
          planId,
          recipientIds: selectedMembers,
          customMessage: customMessage.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Notificação enviada com sucesso!');
      setSelectedMembers([]);
      setCustomMessage('');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar notificação: ${error.message}`);
    },
  });

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMembers.length === eligibleMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(eligibleMembers.map((m) => m.id));
    }
  };

  const handleSend = () => {
    sendNotificationMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enviar Notificação
          </DialogTitle>
          <DialogDescription>
            Notifique os membros do ambiente sobre atualizações nos recursos de mídia do plano <strong>{planName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Destinatários
              </Label>
              {eligibleMembers.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  {selectedMembers.length === eligibleMembers.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </Button>
              )}
            </div>

            {loadingMembers ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando membros...
              </div>
            ) : eligibleMembers.length === 0 ? (
              <div className="text-center py-8 px-4 bg-muted/30 rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum membro optou por receber notificações.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Os membros podem ativar notificações na página de membros do ambiente.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {eligibleMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => handleToggleMember(member.id)}
                    >
                      <Checkbox
                        id={member.id}
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => handleToggleMember(member.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.full_name || 'Usuário'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.member_user_id.slice(0, 8)}...
                        </p>
                      </div>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedMembers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedMembers.length} selecionado(s)
              </Badge>
            )}
          </div>

          {/* Recent Changes Preview */}
          {recentChangeLogs.length > 0 && (
            <div className="space-y-2">
              <Label>Alterações recentes (serão incluídas no email)</Label>
              <div className="bg-muted/30 rounded-md p-3 text-sm space-y-1 max-h-[100px] overflow-y-auto">
                {recentChangeLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {new Date(log.change_date).toLocaleDateString('pt-BR')}
                      {log.notes && ` - ${log.notes}`}
                    </span>
                  </div>
                ))}
                {recentChangeLogs.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{recentChangeLogs.length - 5} alteração(ões) mais
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">Mensagem personalizada (opcional)</Label>
            <Textarea
              id="custom-message"
              placeholder="Adicione uma mensagem personalizada para os destinatários..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              selectedMembers.length === 0 ||
              sendNotificationMutation.isPending
            }
          >
            {sendNotificationMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Notificação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
