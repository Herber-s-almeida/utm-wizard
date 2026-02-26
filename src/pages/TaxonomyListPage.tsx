import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingPage } from '@/components/ui/loading-dots';
import { Link2, Search, ExternalLink, CheckCircle, XCircle, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PlanStatus = 'draft' | 'active' | 'finished' | 'all';

interface MediaPlan {
  id: string;
  name: string;
  slug: string | null;
  campaign: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number | null;
  created_at: string | null;
  media_lines: { 
    id: string; 
    utm_validated: boolean | null;
  }[];
}

export default function TaxonomyListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get initial tab from URL params
  const initialTab = (searchParams.get('status') as PlanStatus) || 'all';
  const [activeTab, setActiveTab] = useState<PlanStatus>(initialTab);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as PlanStatus;
    setActiveTab(newTab);
    if (newTab === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', newTab);
    }
    setSearchParams(searchParams);
  };
  
  // Sync with URL on initial load
  useEffect(() => {
    const statusFromUrl = searchParams.get('status') as PlanStatus;
    if (statusFromUrl && ['draft', 'active', 'finished'].includes(statusFromUrl)) {
      setActiveTab(statusFromUrl);
    }
  }, []);

  // Fetch media plans with line counts
  // Access is controlled by environment roles, not plan_roles
  const { data: plans, isLoading } = useQuery({
    queryKey: ['taxonomy-plans-list', currentEnvironmentId],
    queryFn: async () => {
      if (!currentEnvironmentId) return [];
      
      const { data: plans, error } = await supabase
        .from('media_plans')
        .select(`
          id,
          name,
          slug,
          campaign,
          status,
          start_date,
          end_date,
          total_budget,
          created_at,
          media_lines (
            id,
            utm_validated
          )
        `)
        .eq('environment_id', currentEnvironmentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (plans || []) as MediaPlan[];
    },
    enabled: !!currentEnvironmentId,
  });

  // Filter plans by status and search
  const filteredPlans = useMemo(() => {
    if (!plans) return [];

    let filtered = plans;

    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(plan => {
        const status = plan.status?.toLowerCase();
        if (activeTab === 'draft') return status === 'draft' || status === 'rascunho';
        if (activeTab === 'active') return status === 'active' || status === 'ativo';
        if (activeTab === 'finished') return status === 'finished' || status === 'finalizado';
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.name.toLowerCase().includes(query) ||
        (plan.campaign && plan.campaign.toLowerCase().includes(query)) ||
        (plan.slug && plan.slug.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [plans, activeTab, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!plans) return { total: 0, draft: 0, active: 0, finished: 0, validated: 0, pending: 0 };

    const counts = { total: 0, draft: 0, active: 0, finished: 0, validated: 0, pending: 0 };
    
    plans.forEach(plan => {
      counts.total++;
      const status = plan.status?.toLowerCase();
      if (status === 'draft' || status === 'rascunho') counts.draft++;
      else if (status === 'active' || status === 'ativo') counts.active++;
      else if (status === 'finished' || status === 'finalizado') counts.finished++;

      // Count UTM validation status
      plan.media_lines?.forEach(line => {
        if (line.utm_validated) counts.validated++;
        else counts.pending++;
      });
    });

    return counts;
  }, [plans]);

  const getStatusBadge = (status: string | null) => {
    const s = status?.toLowerCase();
    if (s === 'draft' || s === 'rascunho') {
      return <Badge variant="secondary">Rascunho</Badge>;
    }
    if (s === 'active' || s === 'ativo') {
      return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
    }
    if (s === 'finished' || s === 'finalizado') {
      return <Badge variant="outline">Finalizado</Badge>;
    }
    return <Badge variant="outline">{status || 'Sem status'}</Badge>;
  };

  const getValidationStats = (lines: { id: string; utm_validated: boolean | null }[]) => {
    if (!lines || lines.length === 0) {
      return { validated: 0, total: 0, percentage: 0 };
    }
    const validated = lines.filter(l => l.utm_validated).length;
    const total = lines.length;
    const percentage = total > 0 ? Math.round((validated / total) * 100) : 0;
    return { validated, total, percentage };
  };

  const handleOpenTaxonomy = (plan: MediaPlan) => {
    const identifier = plan.slug || plan.id;
    navigate(`/media-plans/${identifier}/taxonomy`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Link2 className="h-6 w-6" />
              Taxonomia - UTMs por Plano
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e valide os parâmetros UTM de todos os seus planos de mídia
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Planos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rascunhos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Finalizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.finished}</div>
            </CardContent>
          </Card>
        </div>

        {/* UTM Validation Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resumo de Validação UTM</CardTitle>
            <CardDescription>Status de validação de todas as linhas de mídia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">{stats.validated} validadas</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">{stats.pending} pendentes</span>
              </div>
              <div className="ml-auto">
                <Badge variant="outline" className="text-xs">
                  {stats.validated + stats.pending > 0 
                    ? Math.round((stats.validated / (stats.validated + stats.pending)) * 100)
                    : 0}% validado
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Planos de Mídia</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar plano..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
                <TabsTrigger value="draft">Rascunhos ({stats.draft})</TabsTrigger>
                <TabsTrigger value="active">Ativos ({stats.active})</TabsTrigger>
                <TabsTrigger value="finished">Finalizados ({stats.finished})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {filteredPlans.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum plano encontrado</p>
                    {searchQuery && (
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={() => setSearchQuery('')}
                      >
                        Limpar busca
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Orçamento</TableHead>
                          <TableHead>Linhas de Mídia</TableHead>
                          <TableHead>UTMs Validadas</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlans.map((plan) => {
                          const validation = getValidationStats(plan.media_lines);
                          return (
                            <TableRow key={plan.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{plan.name}</div>
                                  {plan.campaign && (
                                    <div className="text-xs text-muted-foreground">{plan.campaign}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(plan.status)}</TableCell>
                              <TableCell>
                                {plan.start_date && plan.end_date ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {format(new Date(plan.start_date), 'dd/MM/yy', { locale: ptBR })} - {format(new Date(plan.end_date), 'dd/MM/yy', { locale: ptBR })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {plan.total_budget ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{plan.total_budget.toLocaleString('pt-BR')}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{validation.total}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    {validation.percentage === 100 ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : validation.percentage > 0 ? (
                                      <div className="h-4 w-4 rounded-full border-2 border-amber-500 flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-amber-500">{validation.percentage}</span>
                                      </div>
                                    ) : (
                                      <XCircle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm">
                                      {validation.validated}/{validation.total}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenTaxonomy(plan)}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Ver UTMs
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
