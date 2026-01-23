import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Building2, Settings, Loader2, Save, FileText, MapPin, ImageIcon } from 'lucide-react';
import { useEnvironmentSettings } from '@/hooks/useEnvironmentSettings';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { EnvironmentLogoUpload } from '@/components/settings/EnvironmentLogoUpload';

const settingsSchema = z.object({
  name: z.string().min(2, 'Nome do ambiente deve ter no mínimo 2 caracteres').max(100),
  company_name: z.string().max(150).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function EnvironmentSettingsPage() {
  const navigate = useNavigate();
  const { settings, isLoading, canEdit, updateSettings, isUpdating } = useEnvironmentSettings();
  const { isEnvironmentAdmin, isSystemAdmin, currentEnvironmentId } = useEnvironment();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      company_name: '',
      cnpj: '',
      address: '',
    },
  });

  // Update form values when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        name: settings.name || '',
        company_name: settings.company_name || '',
        cnpj: settings.cnpj || '',
        address: settings.address || '',
      });
    }
  }, [settings, form]);

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (!isLoading && !canEdit) {
      navigate('/media-plan-dashboard');
    }
  }, [isLoading, canEdit, navigate]);

  const handleSubmit = async (values: SettingsFormValues) => {
    await updateSettings({
      name: values.name,
      company_name: values.company_name || null,
      cnpj: values.cnpj || null,
      address: values.address || null,
    });
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-display font-bold">Configurações do Ambiente</h1>
          <p className="text-muted-foreground">Configure as informações do seu ambiente e empresa</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Environment Name */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Nome do Ambiente
                </CardTitle>
                <CardDescription>
                  Este nome aparece no menu lateral e na troca de ambientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de exibição</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Settings className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Ex: Minha Empresa" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Este é o nome que será exibido para todos os membros do ambiente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Environment Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Logo do Ambiente
                </CardTitle>
                <CardDescription>
                  O logo aparece no topo do menu lateral e ajuda a identificar o ambiente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentEnvironmentId && (
                  <EnvironmentLogoUpload
                    currentLogoUrl={settings?.logo_url}
                    environmentId={currentEnvironmentId}
                    onUploadComplete={async (url) => {
                      await updateSettings({ logo_url: url });
                    }}
                    disabled={!canEdit || isUpdating}
                  />
                )}
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informações da Empresa
                </CardTitle>
                <CardDescription>
                  Dados cadastrais da empresa vinculada a este ambiente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social / Nome da Empresa</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Ex: Empresa Exemplo Ltda" 
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
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="00.000.000/0000-00" 
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
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea 
                            placeholder="Rua, número, bairro, cidade - UF, CEP" 
                            className="pl-10 min-h-[80px]" 
                            {...field} 
                            value={field.value || ''} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating || !form.formState.isDirty}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
