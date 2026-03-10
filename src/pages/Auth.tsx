import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LayoutDashboard, Mail, Lock, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const resetSchema = z.object({
  email: z.string().email('Email inválido'),
});

const newPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação deve ter no mínimo 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

// Centralized error mapping to avoid exposing internal error details
const getAuthErrorMessage = (error: Error): string => {
  const message = error.message.toLowerCase();
  if (message.includes('invalid login')) return 'Email ou senha incorretos';
  if (message.includes('already registered')) return 'Este email já está cadastrado';
  if (message.includes('invalid email')) return 'Email inválido';
  if (message.includes('weak password')) return 'Senha muito fraca';
  if (message.includes('network') || message.includes('fetch')) return 'Erro de conexão. Tente novamente';
  if (message.includes('user not found')) return 'Usuário não encontrado';
  if (message.includes('email not confirmed')) return 'Por favor, confirme seu email';
  if (message.includes('rate limit')) return 'Muitas tentativas. Aguarde um momento';
  if (message.includes('expired')) return 'Link expirado. Solicite um novo';
  return 'Erro ao processar solicitação. Tente novamente';
};

type AuthMode = 'login' | 'forgot' | 'reset';

// Helper function to determine user destination after login
async function getUserDestination(userId: string): Promise<string> {
  // 1. Check if user is a system user (has their own environment)
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('is_system_user, company')
    .eq('user_id', userId)
    .single();

  // 2. Get all environments user has access to
  const { data: environments } = await supabase.rpc('get_user_environments_v2', {
    _user_id: userId,
  });

  const envCount = environments?.length || 0;

  // 3. If user has access to multiple environments, show selection page
  if (envCount > 1) {
    return '/environment-select';
  }

  // 4. If system user without company, go to setup
  if (profile?.is_system_user && !profile.company) {
    return '/settings/setup';
  }

  // 5. If user has exactly one environment, determine best landing page
  if (envCount === 1) {
    const env = environments[0];
    // Store the environment ID for the context to pick up
    localStorage.setItem('selectedEnvironmentId', env.environment_id);
    
    // If user is admin, go to media plan dashboard
    if (env.is_environment_admin) {
      return '/media-plan-dashboard';
    }
    
    // Check if user is system admin
    const { data: isSysAdmin } = await supabase.rpc('is_system_admin', { _user_id: userId });
    if (isSysAdmin) return '/media-plan-dashboard';
    
    // Fetch permissions to find the best landing page
    const { data: role } = await supabase
      .from('environment_roles')
      .select('perm_media_plans, perm_finance, perm_executive_dashboard, perm_reports, perm_media_resources, perm_taxonomy, perm_library')
      .eq('environment_id', env.environment_id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (role) {
      const sectionRoutes: { perm: string | null; path: string }[] = [
        { perm: role.perm_media_plans, path: '/media-plan-dashboard' },
        { perm: role.perm_finance, path: '/finance' },
        { perm: role.perm_executive_dashboard, path: '/executive-dashboard' },
        { perm: role.perm_reports, path: '/reports' },
        { perm: role.perm_media_resources, path: '/media-resources' },
        { perm: role.perm_taxonomy, path: '/taxonomy' },
        { perm: role.perm_library, path: '/config/clients' },
      ];
      
      for (const section of sectionRoutes) {
        if (section.perm && section.perm !== 'none') {
          return section.path;
        }
      }
    }
    
    return '/media-plan-dashboard';
  }

  // 6. No environments - show awaiting access page
  return '/awaiting-access';
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signIn, resetPassword, updatePassword, user, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user came from password reset link
    const modeParam = searchParams.get('mode');
    if (modeParam === 'reset' && session) {
      setMode('reset');
    }
  }, [searchParams, session]);

  useEffect(() => {
    if (user && mode !== 'reset') {
      // Determine where to redirect the user
      getUserDestination(user.id).then(destination => {
        navigate(destination);
      });
    }
  }, [user, navigate, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          toast.error(getAuthErrorMessage(error));
        } else {
          toast.success('Login realizado com sucesso!');
          // Redirect will happen via useEffect
        }
      } else if (mode === 'forgot') {
        const validation = resetSchema.safeParse({ email });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await resetPassword(email);
        if (error) {
          toast.error(getAuthErrorMessage(error));
        } else {
          toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
          setMode('login');
        }
      } else if (mode === 'reset') {
        const validation = newPasswordSchema.safeParse({ password, confirmPassword });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await updatePassword(password);
        if (error) {
          toast.error(getAuthErrorMessage(error));
        } else {
          toast.success('Senha atualizada com sucesso!');
          navigate('/media-plan-dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Bem-vindo de volta';
      case 'forgot': return 'Recuperar senha';
      case 'reset': return 'Nova senha';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Entre para acessar seus planos de mídia';
      case 'forgot': return 'Digite seu email para receber o link de recuperação';
      case 'reset': return 'Digite sua nova senha';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'login': return 'Entrar';
      case 'forgot': return 'Enviar link';
      case 'reset': return 'Atualizar senha';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-border/50 shadow-2xl shadow-primary/5 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <LayoutDashboard className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {getDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {(mode === 'login' || mode === 'forgot') && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'reset') && (
                <div className="space-y-2">
                  <Label htmlFor="password">{mode === 'reset' ? 'Nova senha' : 'Senha'}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {mode === 'reset' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {getButtonText()}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {mode === 'login' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) {
                      toast.error('Erro ao entrar com Google. Tente novamente.');
                    }
                  }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                </Button>
              </>
            )}
            <div className="mt-6 text-center space-y-2">
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar para login
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
