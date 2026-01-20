import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Crown, ChevronRight, LayoutDashboard, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserEnvironment {
  environment_id: string;
  environment_name: string;
  environment_owner_id: string;
  is_own_environment: boolean;
  role_read: boolean;
  role_edit: boolean;
  role_delete: boolean;
  role_invite: boolean;
}

export default function EnvironmentSelectPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [environments, setEnvironments] = useState<UserEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchEnvironments();
  }, [user, navigate]);

  const fetchEnvironments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_environments_v2', {
        _user_id: user.id,
      });

      if (error) {
        console.error('Error fetching environments:', error);
        return;
      }

      if (data && data.length === 1) {
        // Only one environment, redirect directly
        handleSelectEnvironment(data[0].environment_id);
        return;
      }

      setEnvironments(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEnvironment = async (environmentId: string) => {
    setSelecting(environmentId);
    
    // Store selected environment in localStorage for EnvironmentContext to pick up
    localStorage.setItem('selectedEnvironmentId', environmentId);
    
    // Small delay to show selection feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    navigate('/media-plan-dashboard');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRoleBadge = (env: UserEnvironment) => {
    if (env.is_own_environment) {
      return (
        <Badge variant="default" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Crown className="h-3 w-3 mr-1" />
          Proprietário
        </Badge>
      );
    }
    if (env.role_invite) {
      return (
        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
          Administrador
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Membro
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="grid gap-4 mt-8">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (environments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <CardTitle>Sem acesso a ambientes</CardTitle>
            <CardDescription>
              Você ainda não possui acesso a nenhum ambiente. Entre em contato com um administrador para receber um convite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ownEnvironments = environments.filter(e => e.is_own_environment);
  const sharedEnvironments = environments.filter(e => !e.is_own_environment);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <LayoutDashboard className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Selecione um ambiente</h1>
            <p className="text-muted-foreground">
              Você possui acesso a {environments.length} ambiente{environments.length > 1 ? 's' : ''}. Escolha qual deseja acessar.
            </p>
          </div>

          <div className="space-y-6">
            {/* Own Environments */}
            {ownEnvironments.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Meu Ambiente
                </h2>
                <div className="space-y-3">
                  {ownEnvironments.map((env, index) => (
                    <motion.div
                      key={env.environment_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
                          selecting === env.environment_id ? 'border-primary ring-2 ring-primary/20' : ''
                        }`}
                        onClick={() => handleSelectEnvironment(env.environment_id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-amber-500" />
                              </div>
                              <div>
                                <h3 className="font-medium">{env.environment_name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Ambiente principal
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getRoleBadge(env)}
                              <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                                selecting === env.environment_id ? 'translate-x-1' : ''
                              }`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Shared Environments */}
            {sharedEnvironments.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ambientes Compartilhados
                </h2>
                <div className="space-y-3">
                  {sharedEnvironments.map((env, index) => (
                    <motion.div
                      key={env.environment_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (ownEnvironments.length + index) * 0.1 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
                          selecting === env.environment_id ? 'border-primary ring-2 ring-primary/20' : ''
                        }`}
                        onClick={() => handleSelectEnvironment(env.environment_id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Users className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-medium">{env.environment_name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Ambiente compartilhado
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getRoleBadge(env)}
                              <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                                selecting === env.environment_id ? 'translate-x-1' : ''
                              }`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Sair da conta
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
