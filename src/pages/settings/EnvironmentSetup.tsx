import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const setupSchema = z.object({
  company: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
});

export default function EnvironmentSetup() {
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check if user already has a company set
  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company, is_system_user')
        .eq('user_id', user.id)
        .single();

      // If they already have a company, redirect to dashboard
      if (profile?.company) {
        navigate('/media-plan-dashboard');
        return;
      }

      // If they're not a system user, they shouldn't be here
      if (!profile?.is_system_user) {
        navigate('/awaiting-access');
      }
    };

    checkProfile();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = setupSchema.safeParse({ company });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (!user) {
        toast.error('Usuário não autenticado');
        setLoading(false);
        return;
      }

      // Update the profile with company name
      const { error } = await supabase
        .from('profiles')
        .update({ 
          company: company.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        toast.error('Erro ao configurar ambiente');
        console.error(error);
      } else {
        toast.success('Ambiente configurado com sucesso!');
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['current-profile'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        navigate('/media-plan-dashboard');
      }
    } finally {
      setLoading(false);
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
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">
              Configure seu Ambiente
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Defina o nome da sua empresa ou organização para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Nome da Empresa / Organização</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    type="text"
                    placeholder="Ex: Minha Empresa Ltda"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este nome será exibido como o nome do seu ambiente.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !company.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
