import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { usePlanFollowers } from '@/hooks/usePlanFollowers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, Loader2 } from 'lucide-react';

interface ManageFollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
}

interface EnvironmentMember {
  user_id: string;
  full_name: string | null;
  email?: string;
}

export function ManageFollowersDialog({
  open,
  onOpenChange,
  planId,
  planName,
}: ManageFollowersDialogProps) {
  const { currentEnvironmentId } = useEnvironment();
  const { followers, isLoading: loadingFollowers, toggleFollower, isToggling } = usePlanFollowers(planId);

  // Fetch environment members
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['environment-members-for-followers', currentEnvironmentId],
    queryFn: async () => {
      if (!currentEnvironmentId) return [];

      const { data, error } = await supabase
        .rpc('get_environment_members_with_details', {
          p_environment_id: currentEnvironmentId,
        });

      if (error) throw error;
      return (data || []) as EnvironmentMember[];
    },
    enabled: open && !!currentEnvironmentId,
  });

  const isLoading = loadingFollowers || loadingMembers;
  const followerUserIds = followers.map(f => f.user_id);

  const handleToggle = (userId: string, checked: boolean) => {
    toggleFollower({ userId, enabled: checked });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Seguidores
          </DialogTitle>
          <DialogDescription>
            Selecione quem receberá notificações automáticas sobre mudanças nos recursos de mídia do plano <strong>{planName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum membro encontrado no ambiente.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {members.map((member) => {
                  const isFollower = followerUserIds.includes(member.user_id);
                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {isFollower ? (
                            <UserCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {member.full_name || 'Usuário'}
                          </p>
                          {member.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isFollower && (
                          <Badge variant="secondary" className="text-xs">
                            Seguidor
                          </Badge>
                        )}
                        <Switch
                          checked={isFollower}
                          onCheckedChange={(checked) => handleToggle(member.user_id, checked)}
                          disabled={isToggling}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {followers.length} seguidor(es) ativo(s)
          </p>
          {isToggling && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Salvando...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
