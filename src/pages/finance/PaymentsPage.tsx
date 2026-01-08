import { useState } from "react";
import { 
  CreditCard, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancialPayments } from "@/hooks/finance/useFinancialPayments";
import { format, isBefore, isAfter, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PaymentStatus } from "@/types/finance";

const statusConfig: Record<PaymentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: "Agendado", color: "bg-blue-100 text-blue-700", icon: <Clock className="w-3 h-3" /> },
  paid: { label: "Pago", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
  partial: { label: "Parcial", color: "bg-orange-100 text-orange-700", icon: <Clock className="w-3 h-3" /> },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-700", icon: null },
  overdue: { label: "Atrasado", color: "bg-red-100 text-red-700", icon: <AlertTriangle className="w-3 h-3" /> },
};

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  transfer: "Transferência",
  card: "Cartão",
  other: "Outro",
};

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");
  
  const { payments, isLoading, markAsPaid } = useFinancialPayments();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const today = new Date();
  
  const upcomingPayments = payments.filter(p => 
    p.status === 'scheduled' && isAfter(new Date(p.planned_payment_date), today)
  );
  
  const overduePayments = payments.filter(p => 
    (p.status === 'scheduled' || p.status === 'overdue') && 
    isBefore(new Date(p.planned_payment_date), today)
  );
  
  const paidPayments = payments.filter(p => p.status === 'paid');

  const renderPaymentsTable = (paymentsList: typeof payments) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Documento</TableHead>
          <TableHead>Data Prevista</TableHead>
          <TableHead>Data Pagamento</TableHead>
          <TableHead className="text-right">Valor Previsto</TableHead>
          <TableHead className="text-right">Valor Pago</TableHead>
          <TableHead>Método</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paymentsList.map((payment) => {
          const status = statusConfig[payment.status as PaymentStatus] || statusConfig.scheduled;
          
          return (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">
                Parcela {payment.installment_number}
              </TableCell>
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
                {payment.payment_method 
                  ? paymentMethodLabels[payment.payment_method] || payment.payment_method
                  : "-"
                }
              </TableCell>
              <TableCell>
                <Badge className={status.color}>
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {payment.status !== 'paid' && payment.status !== 'cancelled' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => markAsPaid(payment.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Pagar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-orange-500" />
            Pagamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Agenda de pagamentos e controle de caixa
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              A Vencer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(upcomingPayments.reduce((sum, p) => sum + Number(p.planned_amount), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {upcomingPayments.length} pagamento(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(overduePayments.reduce((sum, p) => sum + Number(p.planned_amount), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {overduePayments.length} pagamento(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Pagos (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(paidPayments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {paidPayments.length} pagamento(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming" className="gap-2">
                  <Clock className="h-4 w-4" />
                  A Vencer ({upcomingPayments.length})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Atrasados ({overduePayments.length})
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Pagos ({paidPayments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {upcomingPayments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pagamento a vencer</p>
                  </div>
                ) : (
                  renderPaymentsTable(upcomingPayments)
                )}
              </TabsContent>

              <TabsContent value="overdue">
                {overduePayments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                    <p>Nenhum pagamento atrasado</p>
                  </div>
                ) : (
                  renderPaymentsTable(overduePayments)
                )}
              </TabsContent>

              <TabsContent value="paid">
                {paidPayments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pagamento realizado</p>
                  </div>
                ) : (
                  renderPaymentsTable(paidPayments)
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
