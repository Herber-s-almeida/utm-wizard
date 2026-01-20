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
import { LayoutDashboard, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Building2, CheckCircle2, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useCreateAccessRequest } from '@/hooks/useAccessRequests';

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
});

const requestSchema = z.object({
  email: z.string().email('Email inválido'),
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
});

// Centralized error mapping
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
  email?: string;
}

type RegistrationMode = 'checking' | 'invite' | 'request' | 'request_sent';

export default function AuthRegister() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [mode, setMode] = useState<RegistrationMode>('checking');
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const createAccessRequest = useCreateAccessRequest();

  useEffect(() => {
    if (user) {
      navigate('/media-plan-dashboard');
    }
  }, [user, navigate]);

  // Validate token from URL on mount
  useEffect(() => {
    if (tokenFromUrl) {
      validateInviteToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  // Validate invite token from URL
  const validateInviteToken = async (token: string) => {
    setCheckingEmail(true);
    setEmailError(null);
    setInviteInfo(null);
    
    try {
      const { data: invite, error } = await supabase
        .from('pending_environment_invites')
        .select('email, environment_owner_id, environment_id, expires_at, status')
        .eq('invite_token', token)
        .eq('status', 'invited')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('Error validating token:', error);
        setEmailError('Erro ao validar convite. Tente novamente.');
        setEmailChecked(true);
        setMode('request');
        return;
      }

      if (!invite) {
        setEmailError('Convite inválido, expirado ou já utilizado. Você pode solicitar acesso ao sistema.');
        setEmailChecked(true);
        setMode('request');
        return;
      }

      // Pre-fill email from invite
      setEmail(invite.email);
      setTokenValidated(true);
      setMode('invite');

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
        email: invite.email,
      });
      setEmailChecked(true);
    } catch (err) {
      console.error('Error validating token:', err);
      setEmailError('Erro ao validar convite. Tente novamente.');
      setEmailChecked(true);
      setMode('request');
    } finally {
      setCheckingEmail(false);
    }
  };

  // Validate email against pending invites (only if no token in URL)
  const checkEmailInvite = async (emailToCheck: string) => {
    // Skip if already validated via token
    if (tokenValidated) return;
    
    if (!emailToCheck || !emailToCheck.includes('@')) {
      setInviteInfo(null);
      setEmailError(null);
      setEmailChecked(false);
      setMode('checking');
      return;
    }

    setCheckingEmail(true);
    setEmailError(null);
    setInviteInfo(null);
    setEmailChecked(false);

    try {
      // Check if there's a pending invite for this email
      const { data: invite, error } = await supabase
        .from('pending_environment_invites')
        .select('environment_owner_id, environment_id, expires_at, status')
        .eq('email', emailToCheck.toLowerCase())
        .eq('status', 'invited')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('Error checking invite:', error);
        setEmailError('Erro ao verificar convite. Tente novamente.');
        setEmailChecked(true);
        return;
      }

      if (!invite) {
        // No invite found - switch to request mode
        setMode('request');
        setEmailChecked(true);
        return;
      }

      // Invite found
      setMode('invite');

      // Get environment owner name
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('company, full_name')
        .eq('user_id', invite.environment_owner_id)
        .maybeSingle();

      setInviteInfo({
        environmentName: ownerProfile?.company || ownerProfile?.full_name || 'Ambiente',
        environmentOwnerId: invite.environment_owner_id,
      });
      setEmailChecked(true);
    } catch (err) {
      console.error('Error checking email:', err);
      setEmailError('Erro ao verificar convite. Tente novamente.');
      setEmailChecked(true);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailBlur = () => {
    if (email.trim() && !tokenValidated) {
      checkEmailInvite(email.trim());
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
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (inviteError || !invite) {
        toast.error('Você não possui um convite válido para criar conta. Solicite acesso ao sistema.');
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else {
        toast.success('Conta criada com sucesso!');
        // The trigger will automatically process the pending invite
        navigate('/media-plan-dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = requestSchema.safeParse({ email, fullName });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    createAccessRequest.mutate(
      { email, fullName, companyName: companyName || undefined },
      {
        onSuccess: () => {
          setMode('request_sent');
          toast.success('Solicitação enviada com sucesso!');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const canSubmit = mode === 'invite' && emailChecked && inviteInfo && !emailError && !checkingEmail;

  // Request sent confirmation
  if (mode === 'request_sent') {
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
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">
                Solicitação Enviada!
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Sua solicitação de acesso foi enviada com sucesso. Um administrador do sistema irá analisar e você receberá um email quando for aprovada.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="p-4 bg-muted/50 rounded-lg mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{email}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                Voltar para Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

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
              {mode === 'request' ? 'Solicitar Acesso' : 'Crie sua conta'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {mode === 'request' 
                ? 'Preencha seus dados para solicitar acesso ao sistema. Um administrador irá analisar sua solicitação.'
                : 'Para criar uma conta, você precisa ter sido convidado por um administrador'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={mode === 'request' ? handleRequestAccess : handleSubmit} className="space-y-4">
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
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Reset states when email changes
                      if (!tokenValidated) {
                        setEmailChecked(false);
                        setEmailError(null);
                        setInviteInfo(null);
                        setMode('checking');
                      }
                    }}
                    onBlur={handleEmailBlur}
                    className="pl-10"
                    disabled={tokenValidated}
                  />
                  {checkingEmail && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                
                {/* Email validation feedback */}
                {mode === 'invite' && inviteInfo && (
                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Convite válido encontrado!</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Você será membro de:</span>
                      <span className="font-semibold">{inviteInfo.environmentName}</span>
                    </div>
                  </div>
                )}

                {mode === 'request' && emailChecked && !emailError && (
                  <div className="p-3 bg-muted border border-border rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span>Nenhum convite encontrado para este email.</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Você pode solicitar acesso ao sistema preenchendo o formulário abaixo.
                    </p>
                  </div>
                )}
                
                {emailChecked && emailError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {emailError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Company name field - only for request mode */}
              {mode === 'request' && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Empresa (opcional)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Nome da sua empresa"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Password field - only for invite mode */}
              {mode === 'invite' && (
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
              )}

              {mode === 'invite' && (
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || !canSubmit}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Criar conta
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}

              {mode === 'request' && (
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={createAccessRequest.isPending || !email || !fullName}
                >
                  {createAccessRequest.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar Solicitação
                    </>
                  )}
                </Button>
              )}

              {mode === 'checking' && !tokenFromUrl && (
                <p className="text-xs text-muted-foreground text-center">
                  Digite seu email para verificar se você possui um convite
                </p>
              )}
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
