import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlanFollowers } from '@/hooks/usePlanFollowers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Mail, Users, Loader2, AlertCircle, Check, Clock, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChangeLog {
  id: string;
  change_date: string;
  notes: string | null;
}

interface FollowerNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  recentChangeLogs?: ChangeLog[];
  onManageFollowers: () => void;
}

export function FollowerNotificationDialog({
  open,
  onOpenChange,
  planId,
  planName,
  recentChangeLogs = [],
  onManageFollowers,
}: FollowerNotificationDialogProps) {
  const { user } = useAuth();
  const [customMessage, setCustomMessage] = useState('');
  const { followers, notificationState, updateNotificationState } = usePlanFollowers(planId);

  // Filter change logs since last digest
  const newChangeLogs = useMemo(() => {
    if (!notificationState?.last_digest_sent_at) {
      return recentChangeLogs;
    }
    const lastSent = new Date(notificationState.last_digest_sent_at);
    return recentChangeLogs.filter(log => new Date(log.change_date) > lastSent);
  }, [recentChangeLogs, notificationState]);

  const hasNewChanges = newChangeLogs.length > 0;
  const hasFollowers = followers.length > 0;

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!hasFollowers) {
        throw new Error('Nenhum seguidor cadastrado');
      }

      if (!hasNewChanges) {
        throw new Error('Nenhuma mudança desde o último envio');
      }

      const followerIds = followers.map(f => f.id || f.user_id);

      const { data, error } = await supabase.functions.invoke('send-resource-notification', {
        body: {
          planId,
          recipientIds: followerIds,
          customMessage: customMessage.trim() || undefined,
          isDigest: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update notification state
      if (user?.id) {
        updateNotificationState(user.id);
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Notificação enviada para os seguidores!');
      setCustomMessage('');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar notificação: ${error.message}`);
    },
  });

  const handleSend = () => {
    sendNotificationMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificar Seguidores
          </DialogTitle>
          <DialogDescription>
            Envie uma notificação sobre as mudanças recentes nos recursos de mídia do plano <strong>{planName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Followers Summary */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {followers.length} seguidor(es)
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasFollowers 
                    ? 'Receberão a notificação'
                    : 'Nenhum seguidor cadastrado'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onManageFollowers();
              }}
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              Gerenciar
            </Button>
          </div>

          {/* Last Notification Info */}
          {notificationState?.last_digest_sent_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Última notificação: {formatDistanceToNow(new Date(notificationState.last_digest_sent_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
          )}

          {/* Changes Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Mudanças desde o último envio
                {hasNewChanges && (
                  <Badge variant="secondary" className="text-xs">
                    {newChangeLogs.length} nova(s)
                  </Badge>
                )}
              </Label>
            </div>

            {!hasNewChanges ? (
              <div className="text-center py-6 px-4 bg-muted/30 rounded-lg">
                <Check className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma mudança desde a última notificação.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[120px] border rounded-md p-3">
                <div className="space-y-2">
                  {newChangeLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-xs">
                      <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                      <div>
                        <span className="font-medium">
                          {format(new Date(log.change_date), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                        {log.notes && (
                          <span className="text-muted-foreground ml-1">
                            — {log.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {newChangeLogs.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{newChangeLogs.length - 10} mudança(s) mais
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">Mensagem adicional (opcional)</Label>
            <Textarea
              id="custom-message"
              placeholder="Adicione uma mensagem personalizada para os seguidores..."
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
              !hasFollowers ||
              !hasNewChanges ||
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
                Enviar para {followers.length} Seguidor(es)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
