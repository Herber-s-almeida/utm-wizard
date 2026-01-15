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
import { LayoutDashboard, Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

export default function AuthRegister() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isValidInvite, setIsValidInvite] = useState<boolean | null>(null);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // Check if this is a valid invite link
  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    // If there's a token or type=invite, it's coming from an invite link
    if (token || type === 'invite' || type === 'signup') {
      setIsValidInvite(true);
      
      // Try to extract email from URL if present
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
    } else {
      // No invite token - not allowed to register
      setIsValidInvite(false);
    }
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
        navigate('/media-plan-dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // If we're still checking validity
  if (isValidInvite === null) {
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
                Acesso Restrito
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Novas contas só podem ser criadas através de convite.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Se você recebeu um convite, use o link enviado por email. 
                  Caso contrário, solicite um convite ao administrador do sistema.
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
                    disabled={!!searchParams.get('email')}
                  />
                </div>
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
