import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCustomKpis, CustomKpi } from '@/hooks/useCustomKpis';
import { toast } from 'sonner';

const UNIT_OPTIONS = [
  { value: 'R$', label: 'R$ (Reais)' },
  { value: '%', label: '% (Percentual)' },
  { value: 'x', label: 'x (Multiplicador)' },
  { value: '_none', label: 'Número simples' },
];

export default function KpisPage() {
  const { customKpis, isLoading, createKpi, updateKpi, deleteKpi, canCreateMore, maxKpis } = useCustomKpis();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<CustomKpi | null>(null);
  const [deleteConfirmKpi, setDeleteConfirmKpi] = useState<CustomKpi | null>(null);
  
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('R$');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setUnit('R$');
    setDescription('');
    setEditingKpi(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (kpi: CustomKpi) => {
    setEditingKpi(kpi);
    setName(kpi.name);
    setUnit(kpi.unit || '_none');
    setDescription(kpi.description || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingKpi) {
        await updateKpi.mutateAsync({
          id: editingKpi.id,
          name: name.trim(),
          unit: unit === '_none' ? '' : unit,
          description: description.trim() || undefined,
        });
      } else {
        await createKpi.mutateAsync({
          name: name.trim(),
          unit: unit === '_none' ? '' : unit,
          description: description.trim() || undefined,
        });
      }
      
      setDialogOpen(false);
      resetForm();
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmKpi) return;
    
    try {
      await deleteKpi.mutateAsync(deleteConfirmKpi.id);
      setDeleteConfirmKpi(null);
    } catch {
      // Error handled by mutation
    }
  };

  const getUnitLabel = (unit: string) => {
    const option = UNIT_OPTIONS.find(o => o.value === unit || (o.value === '_none' && !unit));
    return option?.label || 'Número simples';
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">KPIs Personalizados</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie e gerencie seus KPIs customizados. {customKpis.length} de {maxKpis} criados.
            </p>
          </div>
          <Button onClick={openCreateDialog} disabled={!canCreateMore} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo KPI
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Seus KPIs
            </CardTitle>
            <CardDescription>
              KPIs personalizados para acompanhar métricas específicas dos seus planos de mídia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : customKpis.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum KPI personalizado criado ainda.</p>
                <Button onClick={openCreateDialog} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Criar primeiro KPI
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Chave</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customKpis.map(kpi => (
                    <TableRow key={kpi.id}>
                      <TableCell className="font-medium">{kpi.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{kpi.key}</TableCell>
                      <TableCell>{getUnitLabel(kpi.unit)}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {kpi.description || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(kpi)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmKpi(kpi)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKpi ? 'Editar KPI' : 'Criar KPI Personalizado'}</DialogTitle>
            <DialogDescription>
              {editingKpi 
                ? 'Atualize as informações do KPI personalizado.'
                : 'Crie um KPI customizado para acompanhar métricas específicas do seu plano.'
              }
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
                    <SelectItem key={opt.value} value={opt.value}>
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
                maxLength={220}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/220
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={!name.trim() || createKpi.isPending || updateKpi.isPending}
              >
                {(createKpi.isPending || updateKpi.isPending) 
                  ? 'Salvando...' 
                  : editingKpi ? 'Salvar' : 'Criar KPI'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmKpi} onOpenChange={(open) => !open && setDeleteConfirmKpi(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir KPI?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o KPI "{deleteConfirmKpi?.name}"? 
              Esta ação não pode ser desfeita e o KPI será removido de todos os planos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
