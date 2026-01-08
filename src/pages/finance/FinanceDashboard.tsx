import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFinanceDashboard } from "@/hooks/finance/useFinanceDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FinanceDashboard() {
  const { data, isLoading } = useFinanceDashboard();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const dashboardData = data || {
    plannedThisMonth: 0,
    actualThisMonth: 0,
    variance: 0,
    variancePercentage: 0,
    payableNext30Days: 0,
    paidLast30Days: 0,
    overduePayments: 0,
    pacingData: [],
    alerts: [],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Dashboard Financeiro
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do controle financeiro de mídia
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/finance/forecast">
              <TrendingUp className="w-4 h-4 mr-2" />
              Forecast
            </Link>
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/finance/documents/new">
              <DollarSign className="w-4 h-4 mr-2" />
              Novo Documento
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Planejado do Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planejado (Mês)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.plannedThisMonth)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Previsão de desembolso
            </p>
          </CardContent>
        </Card>

        {/* Executado do Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Executado (Mês)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.actualThisMonth)}
            </div>
            <div className={`flex items-center text-xs mt-1 ${
              dashboardData.variancePercentage > 0 
                ? "text-red-500" 
                : dashboardData.variancePercentage < 0 
                  ? "text-emerald-500" 
                  : "text-muted-foreground"
            }`}>
              {dashboardData.variancePercentage > 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : dashboardData.variancePercentage < 0 ? (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              ) : null}
              {formatPercentage(dashboardData.variancePercentage)} vs planejado
            </div>
          </CardContent>
        </Card>

        {/* A Pagar (30 dias) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Pagar (30 dias)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.payableNext30Days)}
            </div>
            {dashboardData.overduePayments > 0 && (
              <p className="text-xs text-red-500 mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {dashboardData.overduePayments} pagamento(s) atrasado(s)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pago (30 dias) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pago (30 dias)
            </CardTitle>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.paidLast30Days)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pacing Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Pacing Mensal</CardTitle>
          <CardDescription>
            Comparativo entre planejado e executado por período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData.pacingData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.pacingData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      try {
                        return format(new Date(value), "MMM/yy", { locale: ptBR });
                      } catch {
                        return value;
                      }
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => 
                      new Intl.NumberFormat("pt-BR", { 
                        notation: "compact",
                        compactDisplay: "short" 
                      }).format(value)
                    }
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => {
                      try {
                        return format(new Date(label), "MMMM yyyy", { locale: ptBR });
                      } catch {
                        return label;
                      }
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="planned" 
                    stroke="hsl(var(--emerald-500, 160 84% 39%))" 
                    strokeWidth={2}
                    name="Planejado"
                    dot={{ fill: "hsl(var(--emerald-500, 160 84% 39%))" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--blue-500, 217 91% 60%))" 
                    strokeWidth={2}
                    name="Executado"
                    dot={{ fill: "hsl(var(--blue-500, 217 91% 60%))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sem dados de pacing disponíveis</p>
                <p className="text-sm mt-2">
                  Crie forecasts e registre executados para ver o gráfico
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/finance/forecast">Criar Forecast</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {dashboardData.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.level === 'error' 
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' 
                      : alert.level === 'warning'
                        ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900'
                        : 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900'
                  }`}
                >
                  <p className="text-sm font-medium">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/finance/forecast">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Forecasts
              </CardTitle>
              <CardDescription>
                Gerencie previsões de desembolso
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/finance/documents">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                Documentos
              </CardTitle>
              <CardDescription>
                Notas fiscais e faturas
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/finance/payments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-500" />
                Pagamentos
              </CardTitle>
              <CardDescription>
                Agenda de pagamentos
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
