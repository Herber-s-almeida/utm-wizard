import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { User, Mail, Building2, Phone, Lock, Shield, Loader2, Save, KeyRound } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  company: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação deve ter no mínimo 6 caracteres'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, updatePassword } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
  const queryClient = useQueryClient();
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name || '',
      company: profile?.company || '',
      phone: (profile as any)?.phone || '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          company: values.company || null,
          phone: values.phone || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ['current_profile'] });
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    setSavingPassword(true);
    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: values.currentPassword,
      });

      if (signInError) {
        toast.error('Senha atual incorreta');
        setSavingPassword(false);
        return;
      }

      const { error } = await updatePassword(values.newPassword);
      
      if (error) {
        toast.error('Erro ao atualizar senha');
      } else {
        toast.success('Senha atualizada com sucesso!');
        passwordForm.reset();
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Minha Conta</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações de segurança</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Informações da Conta
            </CardTitle>
            <CardDescription>
              Detalhes de autenticação da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado. Entre em contato com o suporte se precisar de ajuda.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Atualize suas informações de perfil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Seu nome" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Nome da empresa" 
                            className="pl-10" 
                            {...field} 
                            value={field.value || ''} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="(11) 99999-9999" 
                            className="pl-10" 
                            {...field} 
                            value={field.value || ''} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Salvar alterações
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Segurança
            </CardTitle>
            <CardDescription>
              Altere sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha atual</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar nova senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" variant="outline" disabled={savingPassword}>
                    {savingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Alterar senha
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}