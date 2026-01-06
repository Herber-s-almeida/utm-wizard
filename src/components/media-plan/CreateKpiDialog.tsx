import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomKpis } from '@/hooks/useCustomKpis';

const UNIT_OPTIONS = [
  { value: 'R$', label: 'R$ (Reais)' },
  { value: '%', label: '% (Percentual)' },
  { value: 'x', label: 'x (Multiplicador)' },
  { value: '', label: 'Número simples' },
];

interface CreateKpiDialogProps {
  onKpiCreated?: (kpi: { id: string; key: string; name: string; unit: string }) => void;
}

export function CreateKpiDialog({ onKpiCreated }: CreateKpiDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('R$');
  const [description, setDescription] = useState('');
  
  const { createKpi, canCreateMore, maxKpis, customKpis } = useCustomKpis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      const result = await createKpi.mutateAsync({
        name: name.trim(),
        unit,
        description: description.trim() || undefined,
      });

      onKpiCreated?.({
        id: result.id,
        key: result.key,
        name: result.name,
        unit: result.unit,
      });

      setName('');
      setUnit('R$');
      setDescription('');
      setOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={!canCreateMore}
        >
          <Plus className="h-4 w-4" />
          Criar KPI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar KPI Personalizado</DialogTitle>
          <DialogDescription>
            Crie um KPI customizado para acompanhar métricas específicas do seu plano.
            {customKpis.length > 0 && (
              <span className="block mt-1 text-muted-foreground">
                {customKpis.length} de {maxKpis} KPIs criados
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kpi-name">Nome do KPI *</Label>
            <Input
              id="kpi-name"
              placeholder="Ex: Custo por Matrícula"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kpi-unit">Unidade</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="kpi-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value || '_none'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kpi-description">Descrição (opcional)</Label>
            <Input
              id="kpi-description"
              placeholder="Descrição breve do KPI"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || createKpi.isPending}>
              {createKpi.isPending ? 'Criando...' : 'Criar KPI'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
