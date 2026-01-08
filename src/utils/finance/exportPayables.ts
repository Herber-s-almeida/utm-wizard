import * as XLSX from "xlsx";
import type { FinancialDocument, FinancialPayment } from "@/types/finance";

interface PayablesExportRow {
  Fornecedor: string;
  "Nº Documento": string;
  Tipo: string;
  "Data Emissão": string;
  "Data Vencimento": string;
  "Valor Total": number;
  "Status Documento": string;
  Moeda: string;
}

interface PaymentsExportRow {
  Fornecedor: string;
  "Nº Documento": string;
  Parcela: string;
  "Data Prevista": string;
  "Data Pagamento": string;
  "Valor Previsto": number;
  "Valor Pago": number | string;
  "Método": string;
  Status: string;
}

const statusLabels: Record<string, string> = {
  received: "Recebido",
  verified: "Verificado",
  approved: "Aprovado",
  scheduled: "Agendado",
  paid: "Pago",
  cancelled: "Cancelado",
};

const paymentStatusLabels: Record<string, string> = {
  scheduled: "Agendado",
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

const documentTypeLabels: Record<string, string> = {
  invoice: "Nota Fiscal",
  receipt: "Recibo",
  contract: "Contrato",
  other: "Outro",
};

export function exportPayablesToXlsx(
  documents: FinancialDocument[],
  payments: FinancialPayment[] = []
): void {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Documents sheet
  const docRows: PayablesExportRow[] = documents.map((d) => ({
    "Fornecedor": d.vendor_name || "-",
    "Nº Documento": d.document_number || "-",
    "Tipo": documentTypeLabels[d.document_type] || d.document_type,
    "Data Emissão": formatDate(d.issue_date),
    "Data Vencimento": formatDate(d.due_date),
    "Valor Total": d.amount,
    "Status Documento": statusLabels[d.status] || d.status,
    "Moeda": d.currency || "BRL",
  }));

  const docsWs = XLSX.utils.json_to_sheet(docRows);
  docsWs["!cols"] = [
    { wch: 25 }, // Fornecedor
    { wch: 18 }, // Nº Documento
    { wch: 15 }, // Tipo
    { wch: 15 }, // Data Emissão
    { wch: 15 }, // Data Vencimento
    { wch: 15 }, // Valor Total
    { wch: 15 }, // Status
    { wch: 8 },  // Moeda
  ];
  XLSX.utils.book_append_sheet(wb, docsWs, "Documentos");

  // Payments sheet (if available)
  if (payments.length > 0) {
    // Map document info by id
    const docMap = new Map(documents.map(d => [d.id, d]));
    
    const payRows: PaymentsExportRow[] = payments.map((p) => {
      const doc = docMap.get(p.financial_document_id);
      return {
        "Fornecedor": doc?.vendor_name || "-",
        "Nº Documento": doc?.document_number || "-",
        "Parcela": p.installment_number ? `${p.installment_number}` : "1",
        "Data Prevista": formatDate(p.planned_payment_date),
        "Data Pagamento": p.actual_payment_date ? formatDate(p.actual_payment_date) : "-",
        "Valor Previsto": p.planned_amount,
        "Valor Pago": p.paid_amount ?? "-",
        "Método": p.payment_method || "-",
        "Status": paymentStatusLabels[p.status] || p.status,
      };
    });

    const payWs = XLSX.utils.json_to_sheet(payRows);
    payWs["!cols"] = [
      { wch: 25 }, // Fornecedor
      { wch: 18 }, // Nº Documento
      { wch: 10 }, // Parcela
      { wch: 15 }, // Data Prevista
      { wch: 15 }, // Data Pagamento
      { wch: 15 }, // Valor Previsto
      { wch: 15 }, // Valor Pago
      { wch: 12 }, // Método
      { wch: 12 }, // Status
    ];
    XLSX.utils.book_append_sheet(wb, payWs, "Pagamentos");
  }

  // Summary sheet
  const totalDocs = documents.length;
  const totalAmount = documents.reduce((sum, d) => sum + d.amount, 0);
  const paidDocs = documents.filter(d => d.status === 'paid').length;
  const pendingAmount = documents
    .filter(d => d.status !== 'paid' && d.status !== 'cancelled')
    .reduce((sum, d) => sum + d.amount, 0);
  
  const today = new Date();
  const overdueDocs = documents.filter(d => 
    d.status !== 'paid' && 
    d.status !== 'cancelled' && 
    new Date(d.due_date) < today
  ).length;

  const summaryData = [
    { "Métrica": "Total de Documentos", "Valor": totalDocs },
    { "Métrica": "Valor Total", "Valor": `R$ ${totalAmount.toLocaleString("pt-BR")}` },
    { "Métrica": "Documentos Pagos", "Valor": paidDocs },
    { "Métrica": "Valor Pendente", "Valor": `R$ ${pendingAmount.toLocaleString("pt-BR")}` },
    { "Métrica": "Documentos Atrasados", "Valor": overdueDocs },
    { "Métrica": "Data de Exportação", "Valor": new Date().toLocaleString("pt-BR") },
  ];
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

  // Download
  const fileName = `contas_a_pagar_${formatDateFile(new Date())}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatDateFile(date: Date): string {
  return date.toISOString().split("T")[0];
}
