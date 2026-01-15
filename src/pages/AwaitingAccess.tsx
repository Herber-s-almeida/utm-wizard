import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, Mail } from 'lucide-react';

export default function AwaitingAccess() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
            <div className="mx-auto w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
            <CardTitle className="font-display text-2xl">
              Aguardando Acesso
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sua conta foi criada, mas você ainda não foi adicionado a nenhum ambiente.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <Mail className="h-4 w-4" />
                <span>Conectado como:</span>
              </div>
              <p className="font-medium">{user?.email}</p>
            </div>

            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p>
                Você precisa ser convidado por um administrador de ambiente para ter acesso à plataforma.
              </p>
              <p>
                Entre em contato com o responsável pelo ambiente que deseja acessar.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
