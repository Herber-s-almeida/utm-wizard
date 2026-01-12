import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Info, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { STATUS_LABELS } from '@/types/media';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toSlug } from '@/utils/utmGenerator';

export default function NewMediaPlanManual() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const clients = useClients();

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    campaign: '',
    utm_campaign_slug: '',
    default_url: '',
    start_date: '',
    end_date: '',
    total_budget: '',
    status: 'draft' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    
    setLoading(true);
    try {
      // Get client name for the legacy field
      const selectedClient = clients.activeItems?.find(c => c.id === formData.client_id);
      
      // Compute effective slug
      const effectiveSlug = formData.utm_campaign_slug || toSlug(formData.campaign);
      
      const { data, error } = await supabase
        .from('media_plans')
        .insert({
          user_id: user?.id,
          name: formData.name,
          client_id: formData.client_id || null,
          client: selectedClient?.name || null,
          campaign: formData.campaign || null,
          utm_campaign_slug: effectiveSlug || null,
          default_url: formData.default_url || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          total_budget: formData.total_budget ? parseFloat(formData.total_budget) : 0,
          status: formData.status,
          hierarchy_order: [], // Empty array - can be configured later via Edit
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Plano criado! Adicione linhas manualmente.');
      navigate(`/media-plans/${data.id}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao criar plano');
    } finally {
      setLoading(false);
    }
  };

  // Generate slug from campaign name
  const handleCampaignChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      campaign: value,
    }));
  };

  const handleSlugChange = (value: string) => {
    // Only allow valid slug characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, utm_campaign_slug: sanitized }));
  };

  const selectedClient = clients.activeItems?.find(c => c.id === formData.client_id);

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    setIsCreatingClient(true);
    try {
      const result = await clients.create.mutateAsync({ name: newClientName.trim() });
      setFormData(prev => ({ ...prev, client_id: result.id }));
      setNewClientName('');
      setClientOpen(false);
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Computed effective slug
  const autoSlug = toSlug(formData.campaign);
  const effectiveSlug = formData.utm_campaign_slug || autoSlug;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/media-plans/new')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Novo Plano - Linha a Linha</h1>
            <p className="text-muted-foreground">Crie o plano e adicione linhas manualmente</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Plano</CardTitle>
            <CardDescription>Dados básicos do plano de mídia</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Nome do Plano *</Label>
                <Input
                  placeholder="Ex: Campanha de Verão 2025"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Cliente</Label>
                    <InfoTooltip content="Selecione um cliente da biblioteca para associar ao plano" />
                  </div>
                  <Popover open={clientOpen} onOpenChange={setClientOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientOpen}
                        className="w-full justify-between"
                      >
                        {selectedClient ? selectedClient.name : 'Selecione o cliente'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {formData.client_id && (
                              <CommandItem
                                value="_clear"
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, client_id: '' }));
                                  setClientOpen(false);
                                }}
                                className="text-muted-foreground"
                              >
                                Limpar seleção
                              </CommandItem>
                            )}
                            {clients.activeItems?.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.name}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, client_id: client.id }));
                                  setClientOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.client_id === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {client.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                        <div className="border-t p-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Criar novo cliente"
                              value={newClientName}
                              onChange={(e) => setNewClientName(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCreateClient();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleCreateClient}
                              disabled={!newClientName.trim() || isCreatingClient}
                              className="gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Criar
                            </Button>
                          </div>
                        </div>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Campanha</Label>
                    <InfoTooltip content="Nome da campanha para organização e geração de UTMs" />
                  </div>
                  <Input
                    placeholder="Nome da campanha"
                    value={formData.campaign}
                    onChange={(e) => handleCampaignChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Slug da Campanha (UTM)</Label>
                    <InfoTooltip content="Identificador usado no utm_campaign. Gerado automaticamente a partir do nome da campanha." />
                  </div>
                  <Input
                    placeholder={autoSlug || "campanha-verao-2025"}
                    value={formData.utm_campaign_slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="font-mono text-sm"
                  />
                  {effectiveSlug && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">utm_campaign:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-foreground">{effectiveSlug}</code>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>URL Padrão</Label>
                    <InfoTooltip content="URL base que será usada para gerar os links com UTM" />
                  </div>
                  <Input
                    type="url"
                    placeholder="https://seusite.com.br"
                    value={formData.default_url}
                    onChange={(e) => setFormData({ ...formData, default_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Término *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Orçamento Total (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: typeof formData.status) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Info about hierarchy */}
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border/50">
                <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Sobre a estrutura hierárquica</p>
                  <p>
                    A hierarquia de visualização (Meio → Veículo → Canal, etc.) pode ser configurada 
                    posteriormente através do botão "Editar Plano" na página do plano.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/media-plans/new')}>
                  Voltar
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Criar e Adicionar Linhas
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}
