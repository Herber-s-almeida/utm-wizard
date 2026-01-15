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
import { LayoutDashboard, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
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
  if (message.includes('expired')) return 'Link expirado. Solicite um novo convite';
  return 'Erro ao processar solicitação. Tente novamente';
};

interface PendingInvite {
  id: string;
  email: string;
  environment_owner_id: string;
  expires_at: string;
}

export default function AuthRegister() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isValidInvite, setIsValidInvite] = useState<boolean | null>(null);
  const [inviteData, setInviteData] = useState<PendingInvite | null>(null);
  const [environmentName, setEnvironmentName] = useState<string>('');
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // Validate invite token
  useEffect(() => {
    async function validateInvite() {
      const token = searchParams.get('token');
      const emailParam = searchParams.get('email');
      
      // If no token, check if it's a Supabase auth redirect
      if (!token) {
        // Check for Supabase's type=invite or type=signup params (legacy support)
        const type = searchParams.get('type');
        if (type === 'invite' || type === 'signup') {
          setIsValidInvite(true);
          if (emailParam) setEmail(emailParam);
          setValidating(false);
          return;
        }
        
        setIsValidInvite(false);
        setValidating(false);
        return;
      }

      try {
        // Validate our custom invite token
        const { data: invite, error } = await supabase
          .from('pending_environment_invites')
          .select('id, email, environment_owner_id, expires_at')
          .eq('invite_token', token)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (error || !invite) {
          console.error('Invalid or expired invite token:', error);
          setIsValidInvite(false);
          setValidating(false);
          return;
        }

        // Get environment owner name
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('company, full_name')
          .eq('user_id', invite.environment_owner_id)
          .maybeSingle();

        setInviteData(invite);
        setEmail(invite.email);
        setEnvironmentName(ownerProfile?.company || ownerProfile?.full_name || 'Ambiente');
        setIsValidInvite(true);
      } catch (err) {
        console.error('Error validating invite:', err);
        setIsValidInvite(false);
      } finally {
        setValidating(false);
      }
    }

    validateInvite();
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      navigate('/media-plan-dashboard');
    }
  }, [user, navigate]);

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

  // Loading state while validating
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no valid invite
  if (!isValidInvite) {
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
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <CardTitle className="font-display text-2xl">
                Link Inválido ou Expirado
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Este link de convite não é válido ou já expirou.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Solicite um novo convite ao administrador do ambiente que deseja acessar.
                </AlertDescription>
              </Alert>
              
              <Button
                variant="outline"
                className="w-full mt-4"
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
              Crie sua conta
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Complete seu cadastro para acessar a plataforma
            </CardDescription>
            
            {environmentName && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Você foi convidado para:</span>
                </div>
                <p className="font-semibold text-foreground mt-1">{environmentName}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
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
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={!!inviteData}
                  />
                </div>
                {inviteData && (
                  <p className="text-xs text-muted-foreground">
                    O email é pré-definido pelo convite
                  </p>
                )}
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
              </div>

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
                    Criar conta
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