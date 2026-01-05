import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_LABELS } from '@/types/media';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';

const planSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  client: z.string().max(100).optional(),
  campaign: z.string().min(1, 'Campanha é obrigatório para geração de UTM').max(100),
  default_url: z.string().url('URL inválida').min(1, 'URL padrão é obrigatória'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  total_budget: z.number().min(0).optional(),
  status: z.enum(['draft', 'active', 'completed', 'paused']),
});

export default function NewMediaPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    campaign: '',
    default_url: '',
    start_date: '',
    end_date: '',
    total_budget: '',
    status: 'draft' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = planSchema.safeParse({
        ...formData,
        default_url: formData.default_url.trim(),
        total_budget: formData.total_budget ? parseFloat(formData.total_budget) : 0,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('media_plans')
        .insert({
          user_id: user?.id,
          name: formData.name,
          client: formData.client || null,
          campaign: formData.campaign || null,
          default_url: formData.default_url.trim(),
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          total_budget: formData.total_budget ? parseFloat(formData.total_budget) : 0,
          status: formData.status,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Plano criado com sucesso!');
      navigate(`/media-plans/${data.id}`);
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Erro ao criar plano');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Novo Plano de Mídia</h1>
            <p className="text-muted-foreground">
              Preencha as informações básicas do plano
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Plano</CardTitle>
            <CardDescription>
              Defina o nome, cliente e período do plano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <LabelWithTooltip 
                  htmlFor="name" 
                  tooltip="Nome interno para identificar o plano. Aparecerá na listagem e relatórios."
                  required
                >
                  Nome do Plano
                </LabelWithTooltip>
                <Input
                  id="name"
                  placeholder="Ex: Campanha de Verão 2025"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <LabelWithTooltip 
                    htmlFor="client" 
                    tooltip="Empresa ou marca para a qual o plano foi criado. Opcional, mas ajuda na organização."
                  >
                    Cliente
                  </LabelWithTooltip>
                  <Input
                    id="client"
                    placeholder="Nome do cliente"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <LabelWithTooltip 
                    htmlFor="campaign" 
                    tooltip="Será usado como utm_campaign nas URLs de rastreamento. Use um nome descritivo e único."
                    required
                  >
                    Campanha
                  </LabelWithTooltip>
                  <Input
                    id="campaign"
                    placeholder="Nome da campanha (usado para UTM)"
                    value={formData.campaign}
                    onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <LabelWithTooltip 
                  htmlFor="default_url" 
                  tooltip="URL para onde os usuários serão direcionados. Será usada em todas as linhas, mas pode ser substituída individualmente."
                  required
                >
                  URL Padrão de Destino
                </LabelWithTooltip>
                <Input
                  id="default_url"
                  type="url"
                  placeholder="https://seusite.com.br/landing-page"
                  value={formData.default_url}
                  onChange={(e) => setFormData({ ...formData, default_url: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <LabelWithTooltip 
                    htmlFor="start_date" 
                    tooltip="As linhas de mídia deverão estar dentro deste período."
                  >
                    Data de Início
                  </LabelWithTooltip>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <LabelWithTooltip 
                    htmlFor="end_date" 
                    tooltip="As linhas de mídia deverão estar dentro deste período."
                  >
                    Data de Término
                  </LabelWithTooltip>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <LabelWithTooltip 
                    htmlFor="total_budget" 
                    tooltip="Valor total planejado para a campanha. O sistema alertará se as linhas ultrapassarem este valor."
                  >
                    Orçamento Total (R$)
                  </LabelWithTooltip>
                  <Input
                    id="total_budget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <LabelWithTooltip 
                    htmlFor="status" 
                    tooltip="Rascunho: em construção. Ativo: campanha em veiculação. Finalizado: campanha encerrada."
                  >
                    Status
                  </LabelWithTooltip>
                  <Select
                    value={formData.status}
                    onValueChange={(value: typeof formData.status) => 
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Criar Plano
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
