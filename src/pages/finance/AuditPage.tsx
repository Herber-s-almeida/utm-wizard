import { useState } from "react";
import { 
  History, 
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  User,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFinancialAudit } from "@/hooks/finance/useFinancialAudit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AuditAction, AuditEntityType } from "@/types/finance";

const actionLabels: Record<AuditAction, { label: string; color: string }> = {
  create: { label: "Criação", color: "bg-green-100 text-green-700" },
  update: { label: "Atualização", color: "bg-blue-100 text-blue-700" },
  delete: { label: "Exclusão", color: "bg-red-100 text-red-700" },
  approve: { label: "Aprovação", color: "bg-purple-100 text-purple-700" },
  lock: { label: "Travamento", color: "bg-orange-100 text-orange-700" },
  unlock: { label: "Destravamento", color: "bg-yellow-100 text-yellow-700" },
};

const entityLabels: Record<AuditEntityType, string> = {
  forecast: "Forecast",
  actual: "Executado",
  document: "Documento",
  payment: "Pagamento",
  vendor: "Fornecedor",
  revenue: "Receita",
};

export default function AuditPage() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const { logs, isLoading } = useFinancialAudit();

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredLogs = logs.filter(log => {
    if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <History className="h-8 w-8 text-gray-500" />
            Auditoria
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico de alterações do módulo financeiro
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="forecast">Forecast</SelectItem>
                <SelectItem value="actual">Executado</SelectItem>
                <SelectItem value="document">Documento</SelectItem>
                <SelectItem value="payment">Pagamento</SelectItem>
                <SelectItem value="vendor">Fornecedor</SelectItem>
                <SelectItem value="revenue">Receita</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Atualização</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
                <SelectItem value="approve">Aprovação</SelectItem>
                <SelectItem value="lock">Travamento</SelectItem>
                <SelectItem value="unlock">Destravamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
          <CardDescription>
            {filteredLogs.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const action = actionLabels[log.action as AuditAction] || { label: log.action, color: "bg-gray-100 text-gray-700" };
                  const isExpanded = expandedRows.has(log.id);
                  const hasDetails = log.before_json || log.after_json;
                  
                  return (
                    <Collapsible key={log.id} asChild open={isExpanded}>
                      <>
                        <TableRow 
                          className={hasDetails ? "cursor-pointer hover:bg-muted/50" : ""}
                          onClick={() => hasDetails && toggleRow(log.id)}
                        >
                          <TableCell>
                            {hasDetails && (
                              isExpanded 
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(log.created_at), "dd/MM/yyyy")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "HH:mm:ss")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {entityLabels[log.entity_type as AuditEntityType] || log.entity_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={action.color}>
                              {action.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.reason || "-"}
                          </TableCell>
                        </TableRow>
                        {hasDetails && (
                          <CollapsibleContent asChild>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={5} className="p-4">
                                <div className="grid grid-cols-2 gap-4">
                                  {log.before_json && (
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Antes:</h4>
                                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                                        {JSON.stringify(log.before_json, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.after_json && (
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Depois:</h4>
                                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                                        {JSON.stringify(log.after_json, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
