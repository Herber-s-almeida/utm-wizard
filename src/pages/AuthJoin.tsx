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
import { Users, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Building2, CheckCircle2, LinkIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
});

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
  return 'Erro ao processar solicitação. Tente novamente';
};

interface InviteInfo {
  environmentName: string;
  environmentOwnerId: string;
  environmentId: string | null;
  email: string;
}

type PageState = 'loading' | 'invalid' | 'valid';

export default function AuthJoin() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/media-plan-dashboard');
    }
  }, [user, navigate]);

  // Validate token on mount
  useEffect(() => {
    if (!tokenFromUrl) {
      setPageState('invalid');
      setErrorMessage('Link de convite inválido. Verifique se o link está completo.');
      return;
    }
    validateInviteToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const validateInviteToken = async (token: string) => {
    setPageState('loading');
    setErrorMessage(null);
    
    try {
      const { data: invite, error } = await supabase
        .from('pending_environment_invites')
        .select('email, environment_owner_id, environment_id, expires_at, status, invite_type')
        .eq('invite_token', token)
        .eq('status', 'invited')
        .eq('invite_type', 'environment_member')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('Error validating token:', error);
        setPageState('invalid');
        setErrorMessage('Erro ao validar convite. Tente novamente.');
        return;
      }

      if (!invite) {
        setPageState('invalid');
        setErrorMessage('Convite inválido, expirado ou já utilizado. Solicite um novo convite ao administrador do ambiente.');
        return;
      }

      // Pre-fill email from invite
      setEmail(invite.email);

      // Get environment name
      let environmentName = 'Ambiente';
      
      if (invite.environment_id) {
        const { data: env } = await supabase
          .from('environments')
          .select('name')
          .eq('id', invite.environment_id)
          .maybeSingle();
        
        if (env?.name) {
          environmentName = env.name;
        }
      }
      
      // Fallback to owner profile
      if (environmentName === 'Ambiente') {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('company, full_name')
          .eq('user_id', invite.environment_owner_id)
          .maybeSingle();
        
        environmentName = ownerProfile?.company || ownerProfile?.full_name || 'Ambiente';
      }

      setInviteInfo({
        environmentName,
        environmentOwnerId: invite.environment_owner_id,
        environmentId: invite.environment_id,
        email: invite.email,
      });
      setPageState('valid');
    } catch (err) {
      console.error('Error validating token:', err);
      setPageState('invalid');
      setErrorMessage('Erro ao validar convite. Tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = signupSchema.safeParse({ email, password, fullName });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Re-check if email has a valid invite before creating account
      const { data: invite, error: inviteError } = await supabase
        .from('pending_environment_invites')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('invite_type', 'environment_member')
        .eq('status', 'invited')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (inviteError || !invite) {
        toast.error('O convite não é mais válido. Solicite um novo convite ao administrador.');
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else {
        toast.success('Conta criada com sucesso! Bem-vindo ao ambiente.');
        navigate('/media-plan-dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Validando convite...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid token state
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
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
              <div className="mx-auto w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center mb-4">
                <LinkIcon className="w-7 h-7 text-destructive" />
              </div>
              <CardTitle className="font-display text-2xl">
                Convite Inválido
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  Ir para Login
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Se você já tem uma conta, faça login. Caso contrário, solicite um novo convite ao administrador do ambiente.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Valid invite - show registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
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
              <Users className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">
              Entrar no Ambiente
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Você foi convidado para participar de um ambiente
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Environment info */}
            {inviteInfo && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6">
                <div className="flex items-center gap-2 text-sm text-primary mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Convite válido!</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ambiente:</span>
                  <span className="font-semibold">{inviteInfo.environmentName}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    className="pl-10 bg-muted"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O email é definido pelo convite e não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
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
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !fullName || !password}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Criar conta e entrar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Já tem conta? <span className="text-primary font-medium">Fazer login</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
