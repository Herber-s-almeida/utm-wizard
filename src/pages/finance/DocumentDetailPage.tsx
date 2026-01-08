import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  FileText, 
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  CreditCard,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialDocuments } from "@/hooks/finance/useFinancialDocuments";
import { format, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DocumentStatus } from "@/types/finance";

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

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deleteDocument, updateDocumentStatus } = useFinancialDocuments();

  const { data: document, isLoading } = useQuery({
    queryKey: ["financial-document", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("financial_documents")
        .select("*, financial_payments(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const formatCurrency = (value: number, currency: string = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(value);
  };

  const handleDelete = () => {
    if (id) {
      deleteDocument(id, {
        onSuccess: () => navigate("/finance/documents")
      });
    }
  };

  const handleStatusChange = (newStatus: DocumentStatus) => {
    if (id) {
      updateDocumentStatus({ id, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium">Documento não encontrado</p>
          <Button asChild className="mt-4">
            <Link to="/finance/documents">Voltar</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = statusConfig[document.status as DocumentStatus] || statusConfig.received;
  const payments = document.financial_payments || [];
  const today = new Date();
  const dueDate = new Date(document.due_date);
  const isOverdue = isBefore(dueDate, today) && document.status !== 'paid' && document.status !== 'cancelled';
  const isDueSoon = !isOverdue && isBefore(dueDate, addDays(today, 7)) && document.status !== 'paid' && document.status !== 'cancelled';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/finance/documents">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-500" />
              {documentTypeLabels[document.document_type] || "Documento"}
              {document.document_number && ` #${document.document_number}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {document.vendor_name || "Sem fornecedor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O documento será removido permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Informações do Documento</CardTitle>
              <Badge className={status.color}>
                {status.icon}
                <span className="ml-1">{status.label}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{documentTypeLabels[document.document_type]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Número</p>
                <p className="font-medium">{document.document_number || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Emissão</p>
                <p className="font-medium">
                  {format(new Date(document.issue_date), "dd/MM/yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Vencimento</p>
                <p className={`font-medium ${isOverdue ? "text-red-600" : isDueSoon ? "text-orange-600" : ""}`}>
                  {format(dueDate, "dd/MM/yyyy")}
                  {isOverdue && " (Atrasado)"}
                  {isDueSoon && " (Vencendo)"}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(Number(document.amount), document.currency || "BRL")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moeda</p>
                <p className="font-medium">{document.currency || "BRL"}</p>
              </div>
            </div>

            {document.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{document.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>Atualizar status do documento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {document.status === 'received' && (
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleStatusChange('verified')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Marcar como Conferido
              </Button>
            )}
            {document.status === 'verified' && (
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleStatusChange('approved')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
            )}
            {document.status === 'approved' && (
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => handleStatusChange('scheduled')}
              >
                <Clock className="w-4 h-4 mr-2" />
                Agendar Pagamento
              </Button>
            )}
            {document.status === 'scheduled' && (
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleStatusChange('paid')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Pago
              </Button>
            )}
            {document.status !== 'cancelled' && document.status !== 'paid' && (
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleStatusChange('cancelled')}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagamentos
              </CardTitle>
              <CardDescription>
                Pagamentos associados a este documento
              </CardDescription>
            </div>
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Pagamento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pagamento registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead className="text-right">Valor Previsto</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.installment_number}</TableCell>
                    <TableCell>
                      {format(new Date(payment.planned_payment_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {payment.actual_payment_date 
                        ? format(new Date(payment.actual_payment_date), "dd/MM/yyyy")
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(payment.planned_amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.paid_amount 
                        ? formatCurrency(Number(payment.paid_amount))
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
