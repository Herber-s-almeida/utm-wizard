import { useState } from "react";
import { 
  TrendingUp, 
  Plus, 
  Lock, 
  Unlock,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialForecast } from "@/hooks/finance/useFinancialForecast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ForecastPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("month");
  
  const { 
    forecasts, 
    plans, 
    isLoading, 
    generateForecast, 
    lockForecast,
    isGenerating 
  } = useFinancialForecast(selectedPlanId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (granularity === "month") {
      return format(startDate, "MMMM yyyy", { locale: ptBR });
    }
    return `${format(startDate, "dd/MM", { locale: ptBR })} - ${format(endDate, "dd/MM", { locale: ptBR })}`;
  };

  const handleGenerateForecast = () => {
    if (selectedPlanId) {
      generateForecast({ planId: selectedPlanId, granularity });
    }
  };

  const handleLockForecast = (forecastId: string, isLocked: boolean) => {
    lockForecast({ forecastId, lock: !isLocked });
  };

  // Calculate running total
  let runningTotal = 0;
  const forecastsWithTotal = forecasts.map(f => {
    runningTotal += Number(f.planned_amount);
    return { ...f, runningTotal };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            Forecast
          </h1>
          <p className="text-muted-foreground mt-1">
            Previsão de desembolso por período
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações</CardTitle>
          <CardDescription>
            Selecione o plano e a granularidade do forecast
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                Plano de Mídia
              </label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="text-sm font-medium mb-2 block">
                Granularidade
              </label>
              <Select value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Diário</SelectItem>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="month">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerateForecast}
              disabled={!selectedPlanId || isGenerating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Gerar Forecast
            </Button>

            <Button variant="outline" disabled={forecasts.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Previsão por Período</CardTitle>
              <CardDescription>
                {forecasts.length > 0 
                  ? `${forecasts.length} período(s) - Versão ${forecasts[0]?.version || 1}`
                  : "Nenhum forecast gerado"
                }
              </CardDescription>
            </div>
            {forecasts.length > 0 && forecasts.some(f => !f.is_locked) && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Não travado
              </Badge>
            )}
            {forecasts.length > 0 && forecasts.every(f => f.is_locked) && (
              <Badge className="bg-emerald-100 text-emerald-700">
                <Lock className="w-3 h-3 mr-1" />
                Travado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : forecasts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum forecast encontrado</p>
              <p className="text-sm mt-2">
                Selecione um plano e clique em "Gerar Forecast"
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">Acumulado</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastsWithTotal.map((forecast) => (
                  <TableRow key={forecast.id}>
                    <TableCell className="font-medium">
                      {formatPeriod(forecast.period_start, forecast.period_end)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(forecast.planned_amount))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(forecast.runningTotal)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {forecast.source === 'derived_from_plan' ? 'Do Plano' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {forecast.is_locked ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <Lock className="w-3 h-3 mr-1" />
                          Travado
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Unlock className="w-3 h-3 mr-1" />
                          Editável
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLockForecast(forecast.id, forecast.is_locked)}
                      >
                        {forecast.is_locked ? (
                          <>
                            <Unlock className="w-4 h-4 mr-1" />
                            Destravar
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-1" />
                            Travar
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {forecasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Planejado</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(forecasts.reduce((sum, f) => sum + Number(f.planned_amount), 0))}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Períodos</p>
                <p className="text-2xl font-bold">{forecasts.length}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Média por Período</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    forecasts.reduce((sum, f) => sum + Number(f.planned_amount), 0) / forecasts.length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
