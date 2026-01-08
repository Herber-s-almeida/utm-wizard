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
  Building2,
  FolderTree,
  CalendarDays,
  FileSearch,
  ClipboardList,
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
import { useFinancialPayments } from "@/hooks/finance/useFinancialPayments";
import { AddPaymentDialog } from "@/components/finance/AddPaymentDialog";
import { EditDocumentDialog } from "@/components/finance/EditDocumentDialog";
import { RegisterPaymentDialog } from "@/components/finance/RegisterPaymentDialog";
import { format, isBefore, addDays } from "date-fns";
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
  const { registerPayment, isRegistering } = useFinancialPayments();
  
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditDocument, setShowEditDocument] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

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

  const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );

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
          <Button variant="outline" onClick={() => setShowEditDocument(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Document Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identification Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Identificação
                </CardTitle>
                <Badge className={status.color}>
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="Tipo" value={documentTypeLabels[document.document_type]} />
              <InfoItem label="Número" value={document.document_number} />
              <InfoItem label="Razão Social" value={document.vendor_name} />
            </CardContent>
          </Card>

          {/* Classification Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Classificação
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="Atendimento" value={document.account_manager} />
              <InfoItem label="Campanha/Projeto" value={document.campaign_project} />
              <InfoItem label="Produto" value={document.product} />
              <InfoItem label="Classificação Macro" value={document.macro_classification} />
              <InfoItem label="Classificação da Despesa" value={document.expense_classification} />
            </CardContent>
          </Card>

          {/* Cost Center Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Centro de Custo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="Nome do CR" value={document.cost_center_name} />
              <InfoItem label="Centro de Custo (CR)" value={document.cost_center_code} />
              <InfoItem label="Equipe" value={document.team} />
              <InfoItem label="Conta Financeira (CF)" value={document.financial_account} />
              <InfoItem label="Pacote" value={document.package} />
            </CardContent>
          </Card>

          {/* Service Card */}
          {(document.service_description || document.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5" />
                  Serviço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {document.service_description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Descrição do Serviço</p>
                    <p className="text-sm">{document.service_description}</p>
                  </div>
                )}
                {document.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm">{document.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dates & Values Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Datas e Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="Competência" value={document.competency_month ? format(new Date(document.competency_month), "MMM/yyyy") : document.competency_month_erp} />
                <InfoItem label="Competência Benner" value={document.competency_month_erp} />
                <InfoItem label="Recebimento NF" value={document.invoice_received_date ? format(new Date(document.invoice_received_date), "dd/MM/yyyy") : null} />
                <InfoItem label="Data de Emissão" value={format(new Date(document.issue_date), "dd/MM/yyyy")} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="Envio CMS" value={document.cms_sent_date ? format(new Date(document.cms_sent_date), "dd/MM/yyyy") : null} />
                <div>
                  <p className="text-sm text-muted-foreground">Vencimento</p>
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
                  <p className="text-sm text-muted-foreground">Valor Realizado</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(Number(document.amount), document.currency || "BRL")}
                  </p>
                </div>
                <InfoItem label="Moeda" value={document.currency || "BRL"} />
              </div>
            </CardContent>
          </Card>

          {/* References Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Referências
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoItem label="Nº A.P/P.I/O.C/Contrato" value={document.contract_reference} />
              <InfoItem label="Tipo de Solicitação" value={document.request_type} />
              <InfoItem label="Tarefa RIR" value={document.rir_task_number} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
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
            <Button size="sm" onClick={() => setShowAddPayment(true)} disabled={payments.length > 0}>
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

      {/* Dialogs */}
      <AddPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
        documentId={document.id}
        documentAmount={Number(document.amount)}
      />
      
      <EditDocumentDialog
        open={showEditDocument}
        onOpenChange={setShowEditDocument}
        document={document}
      />

      {selectedPayment && (
        <RegisterPaymentDialog
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
          payment={selectedPayment}
          onSubmit={registerPayment}
          isSubmitting={isRegistering}
        />
      )}
    </div>
  );
}
