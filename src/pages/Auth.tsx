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
import { supabase } from '@/integrations/supabase/client';

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
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_system_user, company')
    .eq('user_id', userId)
    .single();

  if (profile?.is_system_user) {
    // If they don't have company name yet, redirect to setup
    if (!profile.company) {
      return '/settings/setup';
    }
    return '/media-plan-dashboard';
  }

  // 2. Not a system user - check if they're a member of any environment
  const { data: memberships } = await supabase
    .from('environment_members')
    .select('environment_owner_id')
    .eq('member_user_id', userId)
    .limit(1);

  if (memberships && memberships.length > 0) {
    // They have at least one environment membership
    return '/media-plan-dashboard';
  }

  // 3. Not in any environment - show awaiting access page
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
