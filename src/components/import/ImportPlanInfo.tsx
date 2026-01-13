import { useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientDialog } from '@/components/config/ClientDialog';
import { useClients, Client } from '@/hooks/useClients';
import { PlanInfo } from '@/hooks/useImportPlan';
import { format } from 'date-fns';

interface ImportPlanInfoProps {
  planInfo: PlanInfo;
  onUpdatePlanInfo: (updates: Partial<PlanInfo>) => void;
  calculatedBudget: number;
  calculatedStartDate: Date | null;
  calculatedEndDate: Date | null;
}

export function ImportPlanInfo({
  planInfo,
  onUpdatePlanInfo,
  calculatedBudget,
  calculatedStartDate,
  calculatedEndDate,
}: ImportPlanInfoProps) {
  const { visibleForMediaPlans, create: createClient } = useClients();
  const [showClientDialog, setShowClientDialog] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(date, 'dd/MM/yyyy');
  };

  const handleClientCreated = async (data: { name: string; description: string; visible_for_media_plans: boolean }) => {
    const result = await createClient.mutateAsync(data);
    if (result) {
      onUpdatePlanInfo({ clientId: result.id, clientName: result.name });
    }
  };

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'new') {
      setShowClientDialog(true);
      return;
    }
    
    // Se "none" foi selecionado, limpar o cliente
    if (clientId === 'none') {
      onUpdatePlanInfo({ clientId: '', clientName: '' });
      return;
    }
    
    const client = visibleForMediaPlans.find(c => c.id === clientId);
    onUpdatePlanInfo({ 
      clientId, 
      clientName: client?.name || '' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Informações do Plano</h2>
        <p className="text-muted-foreground text-sm">
          Defina os dados básicos do plano de mídia
        </p>
      </div>

      <div className="space-y-6 max-w-xl mx-auto">
        {/* Plan Name */}
        <div className="space-y-2">
          <Label htmlFor="plan-name">Nome do Plano *</Label>
          <Input
            id="plan-name"
            value={planInfo.name}
            onChange={(e) => onUpdatePlanInfo({ name: e.target.value })}
            placeholder="Ex: Campanha Verão 2026"
          />
        </div>

        {/* Client */}
        <div className="space-y-2">
          <Label>Cliente</Label>
          <div className="flex gap-2">
            <Select 
              value={planInfo.clientId || ''} 
              onValueChange={handleClientSelect}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-muted-foreground">
                  Sem cliente
                </SelectItem>
                {visibleForMediaPlans.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClientDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>
        </div>

        {/* Campaign */}
        <div className="space-y-2">
          <Label htmlFor="campaign">Campanha</Label>
          <Input
            id="campaign"
            value={planInfo.campaign}
            onChange={(e) => onUpdatePlanInfo({ campaign: e.target.value })}
            placeholder="Ex: Verão 2026"
          />
        </div>

        {/* Budget */}
        <div className="space-y-3">
          <Label>Orçamento Total</Label>
          <RadioGroup
            value={planInfo.useBudgetFromFile ? 'file' : 'manual'}
            onValueChange={(v) => onUpdatePlanInfo({ useBudgetFromFile: v === 'file' })}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="file" id="budget-file" />
              <Label htmlFor="budget-file" className="font-normal cursor-pointer">
                Usar soma do arquivo: <strong>{formatCurrency(calculatedBudget)}</strong>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="budget-manual" />
              <Label htmlFor="budget-manual" className="font-normal cursor-pointer">
                Informar manualmente
              </Label>
            </div>
          </RadioGroup>
          
          {!planInfo.useBudgetFromFile && (
            <Input
              type="number"
              value={planInfo.totalBudget || ''}
              onChange={(e) => onUpdatePlanInfo({ totalBudget: parseFloat(e.target.value) || 0 })}
              placeholder="R$ 0,00"
              className="mt-2"
            />
          )}
        </div>

        {/* Dates */}
        <div className="space-y-3">
          <Label>Período do Plano</Label>
          <RadioGroup
            value={planInfo.useDatesFromFile ? 'file' : 'manual'}
            onValueChange={(v) => onUpdatePlanInfo({ useDatesFromFile: v === 'file' })}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="file" id="dates-file" />
              <Label htmlFor="dates-file" className="font-normal cursor-pointer">
                Usar período do arquivo: <strong>{formatDate(calculatedStartDate)} a {formatDate(calculatedEndDate)}</strong>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="dates-manual" />
              <Label htmlFor="dates-manual" className="font-normal cursor-pointer">
                Informar manualmente
              </Label>
            </div>
          </RadioGroup>
          
          {!planInfo.useDatesFromFile && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-xs">Data Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={planInfo.startDate ? format(planInfo.startDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => onUpdatePlanInfo({ 
                    startDate: e.target.value ? new Date(e.target.value) : null 
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-xs">Data Fim</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={planInfo.endDate ? format(planInfo.endDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => onUpdatePlanInfo({ 
                    endDate: e.target.value ? new Date(e.target.value) : null 
                  })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ClientDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        onSave={handleClientCreated}
        existingNames={visibleForMediaPlans.map(c => c.name)}
      />
    </div>
  );
}
