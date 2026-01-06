import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { MediaPlan } from '@/types/media';
import { StatusSelector } from '@/components/media-plan/StatusSelector';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [plans, setPlans] = useState<MediaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    totalBudget: 0,
    totalLines: 0,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch media plans
      const { data: plansData, error: plansError } = await supabase
        .from('media_plans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (plansError) throw plansError;

      // Fetch stats
      const { data: allPlans } = await supabase
        .from('media_plans')
        .select('id, status, total_budget')
        .eq('user_id', user?.id);

      const { count: linesCount } = await supabase
        .from('media_lines')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      const typedPlans = (plansData || []) as MediaPlan[];
      setPlans(typedPlans);

      const typedAllPlans = (allPlans || []) as Pick<MediaPlan, 'id' | 'status' | 'total_budget'>[];
      setStats({
        totalPlans: typedAllPlans.length,
        activePlans: typedAllPlans.filter(p => p.status === 'active').length,
        totalBudget: typedAllPlans.reduce((acc, p) => acc + Number(p.total_budget || 0), 0),
        totalLines: linesCount || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Gerencie seus planos de mídia e acompanhe métricas
            </p>
          </div>
          <Link to="/media-plans/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Plano
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { 
              title: 'Total de Planos', 
              value: stats.totalPlans, 
              icon: FileText,
              color: 'text-primary'
            },
            { 
              title: 'Planos Ativos', 
              value: stats.activePlans, 
              icon: TrendingUp,
              color: 'text-success'
            },
            { 
              title: 'Investimento Total', 
              value: formatCurrency(stats.totalBudget), 
              icon: DollarSign,
              color: 'text-warning'
            },
            { 
              title: 'Linhas de Mídia', 
              value: stats.totalLines, 
              icon: BarChart3,
              color: 'text-primary'
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-display">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent Plans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Planos Recentes</CardTitle>
              <CardDescription>
                Seus últimos planos de mídia criados
              </CardDescription>
            </div>
            <Link to="/media-plans">
              <Button variant="ghost" size="sm" className="gap-2">
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">Nenhum plano criado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando seu primeiro plano de mídia
                </p>
                <Link to="/media-plans/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Plano
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`/media-plans/${plan.id}`}>
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{plan.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {plan.client || 'Sem cliente'} • {plan.campaign || 'Sem campanha'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusSelector
                            status={plan.status}
                            onStatusChange={(newStatus) => handleStatusChange(plan.id, newStatus)}
                            size="sm"
                          />
                          <span className="text-sm font-medium">
                            {formatCurrency(Number(plan.total_budget))}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
