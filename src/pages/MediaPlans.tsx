import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  FileText,
  Calendar,
  Trash2,
  MoreVertical,
  Settings2,
  List,
  Users,
  Copy,
  Building2,
  X
} from 'lucide-react';
import { LoadingPage } from '@/components/ui/loading-dots';
import { MediaPlan } from '@/types/media';
import { StatusSelector } from '@/components/media-plan/StatusSelector';
import { RoleBadgeCompact } from '@/components/media-plan/RoleBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { DuplicatePlanDialog } from '@/components/media-plan/DuplicatePlanDialog';
import { useClients } from '@/hooks/useClients';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function MediaPlans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeItems: clients } = useClients();
  const [plans, setPlans] = useState<MediaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<MediaPlan | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [planToDuplicate, setPlanToDuplicate] = useState<MediaPlan | null>(null);

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      // Fetch plans where user is owner OR has a role assigned
      // The RLS policy already handles this, so we just need to query
      const { data, error } = await supabase
        .from('media_plans')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans((data || []) as MediaPlan[]);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      const { error } = await supabase
        .from('media_plans')
        .delete()
        .eq('id', planToDelete.id);

      if (error) throw error;

      setPlans(plans.filter(p => p.id !== planToDelete.id));
      queryClient.invalidateQueries({ queryKey: ['media_plans'] });
      toast.success('Plano excluído com sucesso');
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erro ao excluir plano');
    } finally {
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const handleStatusChange = async (planId: string, newStatus: MediaPlan['status']) => {
    try {
      const { error } = await supabase
        .from('media_plans')
        .update({ status: newStatus })
        .eq('id', planId);

      if (error) throw error;

      setPlans(plans.map(p => p.id === planId ? { ...p, status: newStatus } : p));
      queryClient.invalidateQueries({ queryKey: ['media_plans'] });
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    // Parse date as local time to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const matchesSearch = 
        plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.campaign?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClient = !selectedClientId || plan.client_id === selectedClientId;
      
      return matchesSearch && matchesClient;
    });
  }, [plans, searchQuery, selectedClientId]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingPage message="Carregando planos..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Planos de Mídia</h1>
            <p className="text-muted-foreground">
              {plans.length} {plans.length === 1 ? 'plano' : 'planos'} criados
            </p>
          </div>
          <Link to="/media-plans/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Plano
            </Button>
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar planos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={selectedClientId || "all"}
              onValueChange={(value) => setSelectedClientId(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[200px]">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedClientId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedClientId(null)}
                className="h-9 w-9"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        {filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">
                  {searchQuery ? 'Nenhum plano encontrado' : 'Nenhum plano criado'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? 'Tente uma busca diferente'
                    : 'Comece criando seu primeiro plano de mídia'}
                </p>
                {!searchQuery && (
                  <Link to="/media-plans/new">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Criar Plano
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:shadow-lg transition-all hover:border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusSelector
                          status={plan.status}
                          onStatusChange={(newStatus) => handleStatusChange(plan.id, newStatus)}
                          size="sm"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/media-plans/${plan.slug || plan.id}/edit`)}
                            >
                              <Settings2 className="w-4 h-4 mr-2" />
                              Editar Plano
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/media-plans/${plan.slug || plan.id}?openWizard=true`)}
                            >
                              <List className="w-4 h-4 mr-2" />
                              Criar Linhas
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPlanToDuplicate(plan);
                                setDuplicateDialogOpen(true);
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicar Plano
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setPlanToDelete(plan);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <Link to={`/media-plans/${plan.slug || plan.id}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors">
                          {plan.name}
                        </h3>
                        <RoleBadgeCompact planId={plan.id} />
                        {plan.user_id !== user?.id && (
                          <Badge variant="outline" className="text-xs gap-1 bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
                            <Users className="h-3 w-3" />
                            Compartilhado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {plan.client || 'Sem cliente'} • {plan.campaign || 'Sem campanha'}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {formatDate(plan.start_date)}
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(Number(plan.total_budget))}
                        </span>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano de mídia</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{planToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <DuplicatePlanDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        plan={planToDuplicate}
        onSuccess={(result) => {
          toast.success('Plano duplicado com sucesso!');
          fetchPlans();
          navigate(`/media-plans/${result.slug || result.id}`);
        }}
      />
    </DashboardLayout>
  );
}