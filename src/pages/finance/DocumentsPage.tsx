import { useState } from "react";
import { 
  FileText, 
  Plus, 
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFinancialDocuments } from "@/hooks/finance/useFinancialDocuments";
import { exportPayablesToXlsx } from "@/utils/finance/exportPayables";
import { format, isBefore, addDays } from "date-fns";
import { Link } from "react-router-dom";
import type { DocumentStatus, FinancialDocument } from "@/types/finance";

const statusConfig: Record<DocumentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  received: { label: "Recebido", color: "bg-gray-100 text-gray-700", icon: <Clock className="w-3 h-3" /> },
  verified: { label: "Conferido", color: "bg-blue-100 text-blue-700", icon: <Eye className="w-3 h-3" /> },
  approved: { label: "Aprovado", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="w-3 h-3" /> },
  scheduled: { label: "Agendado", color: "bg-purple-100 text-purple-700", icon: <Clock className="w-3 h-3" /> },
  paid: { label: "Pago", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: <AlertCircle className="w-3 h-3" /> },
};

const documentTypeLabels: Record<string, string> = {
  invoice: "Nota Fiscal",
  boleto: "Boleto",
  receipt: "Recibo",
  credit_note: "Nota de Crédito",
  other: "Outro",
};

export default function DocumentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  
  const { documents, isLoading, deleteDocument } = useFinancialDocuments();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getDueDateStatus = (dueDate: string, status: DocumentStatus) => {
    if (status === 'paid' || status === 'cancelled') return null;
    
    const today = new Date();
    const due = new Date(dueDate);
    
    if (isBefore(due, today)) {
      return { label: "Atrasado", color: "text-red-600" };
    }
    if (isBefore(due, addDays(today, 7))) {
      return { label: "Vencendo", color: "text-orange-600" };
    }
    return null;
  };

  const filteredDocuments = documents.filter(doc => {
    if (statusFilter !== "all" && doc.status !== statusFilter) return false;
    if (classificationFilter !== "all" && doc.macro_classification !== classificationFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doc.vendor_name?.toLowerCase().includes(query) ||
        doc.document_number?.toLowerCase().includes(query) ||
        doc.account_manager?.toLowerCase().includes(query) ||
        doc.campaign_project?.toLowerCase().includes(query) ||
        doc.cost_center_code?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Get unique macro classifications for filter
  const macroClassifications = [...new Set(documents.map(d => d.macro_classification).filter(Boolean))];

  const handleExport = () => {
    exportPayablesToXlsx(filteredDocuments as FinancialDocument[]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-emerald-500" />
            Documentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Notas fiscais, boletos e faturas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar XLSX
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/finance/documents/new">
              <Plus className="w-4 h-4 mr-2" />
              Novo Documento
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por fornecedor, número, atendimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="verified">Conferido</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Classificações</SelectItem>
                {macroClassifications.map((c) => (
                  <SelectItem key={c} value={c!}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Documentos</CardTitle>
          <CardDescription>
            {filteredDocuments.length} documento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum documento encontrado</p>
              <p className="text-sm mt-2">
                Clique em "Novo Documento" para adicionar
              </p>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Competência</TableHead>
                    <TableHead className="min-w-[150px]">Atendimento</TableHead>
                    <TableHead className="min-w-[150px]">Campanha</TableHead>
                    <TableHead className="min-w-[100px]">Classif. Macro</TableHead>
                    <TableHead className="min-w-[180px]">Razão Social</TableHead>
                    <TableHead className="min-w-[100px]">Nº Doc</TableHead>
                    <TableHead className="min-w-[100px]">Vencimento</TableHead>
                    <TableHead className="min-w-[120px] text-right">Valor</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const dueDateStatus = getDueDateStatus(doc.due_date, doc.status as DocumentStatus);
                    const status = statusConfig[doc.status as DocumentStatus];
                    
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="text-sm">
                          {doc.competency_month_erp || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.account_manager || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.campaign_project || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.macro_classification || "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {doc.vendor_name || "Sem fornecedor"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.document_number || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{format(new Date(doc.due_date), "dd/MM/yyyy")}</span>
                            {dueDateStatus && (
                              <span className={`text-xs ${dueDateStatus.color}`}>
                                {dueDateStatus.label}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(doc.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/finance/documents/${doc.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalhes
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/finance/documents/${doc.id}/edit`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => deleteDocument(doc.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
