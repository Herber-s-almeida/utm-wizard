import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
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
import { useCustomKpis, CustomKpi } from '@/hooks/useCustomKpis';

const UNIT_OPTIONS = [
  { value: 'R$', label: 'R$ (Reais)' },
  { value: '%', label: '% (Percentual)' },
  { value: 'x', label: 'x (Multiplicador)' },
  { value: '_none', label: 'Número simples' },
];

interface EditKpiDialogProps {
  kpi: CustomKpi;
  trigger?: React.ReactNode;
  onUpdated?: () => void;
}

export function EditKpiDialog({ kpi, trigger, onUpdated }: EditKpiDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(kpi.name);
  const [unit, setUnit] = useState(kpi.unit || '_none');
  const [description, setDescription] = useState(kpi.description || '');
  
  const { updateKpi } = useCustomKpis();

  useEffect(() => {
    if (open) {
      setName(kpi.name);
      setUnit(kpi.unit || '_none');
      setDescription(kpi.description || '');
    }
  }, [open, kpi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    try {
      await updateKpi.mutateAsync({
        id: kpi.id,
        name: name.trim(),
        unit: unit === '_none' ? '' : unit,
        description: description.trim() || undefined,
      });

      onUpdated?.();
      setOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar KPI</DialogTitle>
          <DialogDescription>
            Atualize as informações do KPI personalizado.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-kpi-name">Nome do KPI *</Label>
            <Input
              id="edit-kpi-name"
              placeholder="Ex: Custo por Matrícula"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-kpi-unit">Unidade</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="edit-kpi-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-kpi-description">Descrição (opcional)</Label>
            <Input
              id="edit-kpi-description"
              placeholder="Descrição breve do KPI"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={220}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/220
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || updateKpi.isPending}>
              {updateKpi.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
