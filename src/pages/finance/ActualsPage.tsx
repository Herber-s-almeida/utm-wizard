import { useState } from "react";
import { 
  BarChart3, 
  Plus, 
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
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
import { useFinancialActuals } from "@/hooks/finance/useFinancialActuals";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ActualsPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  
  const { 
    actuals, 
    forecasts,
    plans, 
    isLoading, 
  } = useFinancialActuals(selectedPlanId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    return format(startDate, "MMMM yyyy", { locale: ptBR });
  };

  // Combine forecasts and actuals for comparison
  const pacingData = forecasts.map(forecast => {
    const actual = actuals.find(a => 
      a.period_start === forecast.period_start && 
      a.period_end === forecast.period_end
    );
    const planned = Number(forecast.planned_amount);
    const actualAmount = actual ? Number(actual.actual_amount) : 0;
    const variance = actualAmount - planned;
    const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;
    
    return {
      ...forecast,
      actual: actualAmount,
      variance,
      variancePercent,
      hasActual: !!actual,
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            Executado & Pacing
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de gastos reais e comparativo com planejado
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
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

            <Button
              disabled={!selectedPlanId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Executado
            </Button>

            <Button variant="outline" disabled={!selectedPlanId}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>

            <Button variant="outline" disabled={pacingData.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pacing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Planejado vs Executado</CardTitle>
          <CardDescription>
            Pacing por período com variação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pacingData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado de pacing disponível</p>
              <p className="text-sm mt-2">
                Selecione um plano com forecast para ver o comparativo
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Planejado</TableHead>
                  <TableHead className="text-right">Executado</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacingData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {formatPeriod(row.period_start, row.period_end)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(row.planned_amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.hasActual ? (
                        formatCurrency(row.actual)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right ${
                      row.variance > 0 
                        ? "text-red-600" 
                        : row.variance < 0 
                          ? "text-emerald-600" 
                          : ""
                    }`}>
                      {row.hasActual ? (
                        formatCurrency(row.variance)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right ${
                      row.variancePercent > 10 
                        ? "text-red-600 font-semibold" 
                        : row.variancePercent < -10 
                          ? "text-emerald-600" 
                          : ""
                    }`}>
                      {row.hasActual ? (
                        `${row.variancePercent > 0 ? "+" : ""}${row.variancePercent.toFixed(1)}%`
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!row.hasActual ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Pendente
                        </Badge>
                      ) : row.variancePercent > 10 ? (
                        <Badge className="bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Overspend
                        </Badge>
                      ) : row.variancePercent < -10 ? (
                        <Badge className="bg-orange-100 text-orange-700">
                          Underspend
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          No Budget
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {pacingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Planejado</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(pacingData.reduce((sum, f) => sum + Number(f.planned_amount), 0))}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Executado</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(pacingData.reduce((sum, f) => sum + f.actual, 0))}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Variação Total</p>
                <p className={`text-2xl font-bold ${
                  pacingData.reduce((sum, f) => sum + f.variance, 0) > 0 
                    ? "text-red-600" 
                    : "text-emerald-600"
                }`}>
                  {formatCurrency(pacingData.reduce((sum, f) => sum + f.variance, 0))}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Períodos com Dados</p>
                <p className="text-2xl font-bold">
                  {pacingData.filter(p => p.hasActual).length} / {pacingData.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
