import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  Search, 
  FileText,
  ArrowRight,
  Loader2,
  Database,
  AlertCircle
} from 'lucide-react';
import { MediaPlan, STATUS_LABELS, STATUS_COLORS } from '@/types/media';
import { getPlanUrl } from '@/hooks/usePlanBySlug';

interface PlanWithReportStats extends MediaPlan {
  importCount?: number;
  lastImportAt?: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanWithReportStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchPlansWithReportStats();
    }
  }, [user]);

  const fetchPlansWithReportStats = async () => {
    try {
      // Fetch active plans
      const { data: plansData, error: plansError } = await supabase
        .from('media_plans')
        .select('*')
        .is('deleted_at', null)
        .in('status', ['active', 'completed'])
        .order('updated_at', { ascending: false });

      if (plansError) throw plansError;

      // Fetch report import stats for each plan
      const planIds = (plansData || []).map(p => p.id);
      const { data: importsData } = await supabase
        .from('report_imports')
        .select('media_plan_id, last_import_at')
        .in('media_plan_id', planIds);

      // Count imports per plan
      const importStats = (importsData || []).reduce((acc, imp) => {
        if (!acc[imp.media_plan_id]) {
          acc[imp.media_plan_id] = { count: 0, lastImport: null };
        }
        acc[imp.media_plan_id].count++;
        if (!acc[imp.media_plan_id].lastImport || imp.last_import_at > acc[imp.media_plan_id].lastImport) {
          acc[imp.media_plan_id].lastImport = imp.last_import_at;
        }
        return acc;
      }, {} as Record<string, { count: number; lastImport: string | null }>);

      const plansWithStats = (plansData || []).map(plan => ({
        ...plan,
        importCount: importStats[plan.id]?.count || 0,
        lastImportAt: importStats[plan.id]?.lastImport,
      })) as PlanWithReportStats[];

      setPlans(plansWithStats);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.campaign?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Relatórios
            </h1>
            <p className="text-muted-foreground">
              Dashboard de performance por plano de mídia
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar planos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Plans Grid */}
        {filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">
                  {searchQuery ? 'Nenhum plano encontrado' : 'Nenhum plano ativo'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? 'Tente uma busca diferente'
                    : 'Ative um plano para ver seus relatórios'}
                </p>
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
                <Card 
                  className="group hover:shadow-lg transition-all hover:border-primary/20 cursor-pointer"
                  onClick={() => navigate(`${getPlanUrl(plan)}/reports`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-primary" />
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status]}`}>
                        {STATUS_LABELS[plan.status]}
                      </span>
                    </div>

                    <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {plan.client || 'Sem cliente'} • {plan.campaign || 'Sem campanha'}
                    </p>

                    <div className="flex items-center justify-between text-sm border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {plan.importCount === 0 
                            ? 'Sem dados' 
                            : `${plan.importCount} fonte${plan.importCount > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {plan.lastImportAt 
                          ? `Atualizado: ${formatDate(plan.lastImportAt)}`
                          : 'Nunca importado'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Como funciona?</h4>
                <p className="text-sm text-muted-foreground">
                  Clique em um plano para acessar seu dashboard de performance. Você pode importar dados 
                  do Google Sheets (publicado como XLSX) e visualizar métricas de mídia, conversão e analytics 
                  comparando planejado vs realizado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
