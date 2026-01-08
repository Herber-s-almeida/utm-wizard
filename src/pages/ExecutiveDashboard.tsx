import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Layers,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(30, 80%, 55%)',
  'hsl(340, 70%, 50%)',
  'hsl(180, 50%, 45%)',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
}

export default function ExecutiveDashboard() {
  const [statusFilter, setStatusFilter] = useState('active');
  const { data, isLoading, error } = useExecutiveDashboard(statusFilter);

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-destructive">Erro ao carregar dashboard: {error.message}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Gerencial</h1>
            <p className="text-muted-foreground text-sm">
              Visão consolidada dos planos de mídia
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
                <SelectItem value="finished">Finalizados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Planos Ativos
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalActivePlans}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.totalMediaLines} linhas de mídia
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Investimento Planejado
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCompactCurrency(data.totalPlannedBudget)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Média: {formatCompactCurrency(data.avgBudgetPerPlan)}/plano
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Investimento Alocado
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCompactCurrency(data.totalAllocatedBudget)}</div>
                  <Progress 
                    value={data.totalPlannedBudget > 0 ? (data.totalAllocatedBudget / data.totalPlannedBudget) * 100 : 0} 
                    className="h-1.5 mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gap de Alocação
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${data.allocationGap > 0 ? 'text-warning' : 'text-success'}`}>
                    {formatCompactCurrency(Math.abs(data.allocationGap))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.allocationGap > 0 ? 'A alocar' : 'Excedente'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Linhas de Mídia
                  </CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalMediaLines}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{data.totalActivePlans > 0 ? Math.round(data.totalMediaLines / data.totalActivePlans) : 0} por plano
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Distribution Chart */}
            {data.monthlyDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Distribuição Mensal do Investimento
                  </CardTitle>
                  <CardDescription>
                    Evolução do orçamento alocado ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.monthlyDistribution}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="monthLabel" 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => formatCompactCurrency(value)}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                          labelFormatter={(label) => `Período: ${label}`}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorTotal)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Media Breakdown */}
              {data.mediaBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Investimento por Veículo</CardTitle>
                    <CardDescription>
                      Distribuição do orçamento entre veículos de mídia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.mediaBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {data.mediaBreakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              formatCurrency(value), 
                              name
                            ]}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend 
                            formatter={(value, entry: any) => (
                              <span className="text-sm text-foreground">
                                {entry.payload.name} ({entry.payload.percentage.toFixed(1)}%)
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Funnel Breakdown */}
              {data.funnelBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Investimento por Fase do Funil</CardTitle>
                    <CardDescription>
                      Distribuição do orçamento por etapa do funil de marketing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.funnelBreakdown} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                          <XAxis 
                            type="number" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatCompactCurrency(value)}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            width={100}
                          />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="hsl(var(--primary))" 
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Plans Summary Table */}
            {data.planSummaries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumo dos Planos</CardTitle>
                  <CardDescription>
                    Detalhamento de cada plano de mídia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plano</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Orçamento</TableHead>
                        <TableHead className="text-right">Alocado</TableHead>
                        <TableHead className="text-center">Alocação</TableHead>
                        <TableHead className="text-center">Linhas</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.planSummaries.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell>{plan.client || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {plan.startDate && plan.endDate ? (
                              <>
                                {format(new Date(plan.startDate), 'dd/MM/yy', { locale: ptBR })}
                                {' - '}
                                {format(new Date(plan.endDate), 'dd/MM/yy', { locale: ptBR })}
                              </>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(plan.totalBudget)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(plan.allocatedBudget)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Progress value={plan.allocationPercentage} className="w-16 h-2" />
                              <span className="text-xs text-muted-foreground w-10">
                                {plan.allocationPercentage.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{plan.lineCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/media-plans/${plan.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {data.totalActivePlans === 0 && (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum plano encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Não há planos de mídia com o status selecionado.
                  </p>
                  <Button asChild>
                    <Link to="/media-plans/new">Criar novo plano</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
