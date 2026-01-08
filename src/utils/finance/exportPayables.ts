import * as XLSX from "xlsx";
import type { FinancialDocument, FinancialPayment } from "@/types/finance";

interface PayablesExportRow {
  "Competência": string;
  "Competência Benner": string;
  "Atendimento": string;
  "Campanha/Projeto": string;
  "Produto": string;
  "Nome do CR": string;
  "Centro de Custo (CR)": string;
  "Equipe": string;
  "Conta Financeira (CF)": string;
  "Pacote": string;
  "Descrição do Serviço": string;
  "Classificação Macro": string;
  "Classificação da Despesa": string;
  "Razão Social": string;
  "Valor Realizado": number;
  "Nº Documento": string;
  "Vencimento": string;
  "Data Envio CMS": string;
  "Nº A.P/P.I/O.C/Contrato": string;
  "Tipo Solicitação": string;
  "Data de Recebimento da NF": string;
  "Número da Tarefa RIR": string;
  "Status": string;
  "Observação": string;
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

export function exportPayablesToXlsx(
  documents: FinancialDocument[],
  payments: FinancialPayment[] = []
): void {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Documents sheet with complete fields
  const docRows: PayablesExportRow[] = documents.map((d) => ({
    "Competência": d.competency_month ? formatMonthYear(d.competency_month) : "",
    "Competência Benner": d.competency_month_erp || "",
    "Atendimento": d.account_manager || "",
    "Campanha/Projeto": d.campaign_project || "",
    "Produto": d.product || "",
    "Nome do CR": d.cost_center_name || "",
    "Centro de Custo (CR)": d.cost_center_code || "",
    "Equipe": d.team || "",
    "Conta Financeira (CF)": d.financial_account || "",
    "Pacote": d.package || "",
    "Descrição do Serviço": d.service_description || "",
    "Classificação Macro": d.macro_classification || "",
    "Classificação da Despesa": d.expense_classification || "",
    "Razão Social": d.vendor_name || "",
    "Valor Realizado": d.amount,
    "Nº Documento": d.document_number || "",
    "Vencimento": formatDate(d.due_date),
    "Data Envio CMS": d.cms_sent_date ? formatDate(d.cms_sent_date) : "",
    "Nº A.P/P.I/O.C/Contrato": d.contract_reference || "",
    "Tipo Solicitação": d.request_type || "",
    "Data de Recebimento da NF": d.invoice_received_date ? formatDate(d.invoice_received_date) : "",
    "Número da Tarefa RIR": d.rir_task_number || "",
    "Status": statusLabels[d.status] || d.status,
    "Observação": d.notes || "",
  }));

  const docsWs = XLSX.utils.json_to_sheet(docRows);
  docsWs["!cols"] = [
    { wch: 12 }, // Competência
    { wch: 15 }, // Competência Benner
    { wch: 20 }, // Atendimento
    { wch: 20 }, // Campanha/Projeto
    { wch: 20 }, // Produto
    { wch: 25 }, // Nome do CR
    { wch: 15 }, // Centro de Custo
    { wch: 20 }, // Equipe
    { wch: 25 }, // Conta Financeira
    { wch: 15 }, // Pacote
    { wch: 50 }, // Descrição do Serviço
    { wch: 15 }, // Classificação Macro
    { wch: 20 }, // Classificação da Despesa
    { wch: 35 }, // Razão Social
    { wch: 15 }, // Valor Realizado
    { wch: 12 }, // Nº Documento
    { wch: 12 }, // Vencimento
    { wch: 12 }, // Data Envio CMS
    { wch: 25 }, // Nº A.P/P.I/O.C/Contrato
    { wch: 15 }, // Tipo Solicitação
    { wch: 20 }, // Data de Recebimento
    { wch: 18 }, // Tarefa RIR
    { wch: 12 }, // Status
    { wch: 40 }, // Observação
  ];
  XLSX.utils.book_append_sheet(wb, docsWs, "Documentos");

  // Payments sheet (if available)
  if (payments.length > 0) {
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
      { wch: 25 },
      { wch: 18 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
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

  // Group by macro classification
  const byClassification = documents.reduce((acc, d) => {
    const key = d.macro_classification || "Sem classificação";
    if (!acc[key]) acc[key] = { count: 0, amount: 0 };
    acc[key].count++;
    acc[key].amount += d.amount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  const summaryData = [
    { "Métrica": "Total de Documentos", "Valor": totalDocs },
    { "Métrica": "Valor Total", "Valor": `R$ ${totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
    { "Métrica": "Documentos Pagos", "Valor": paidDocs },
    { "Métrica": "Valor Pendente", "Valor": `R$ ${pendingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
    { "Métrica": "Documentos Atrasados", "Valor": overdueDocs },
    { "Métrica": "", "Valor": "" },
    { "Métrica": "--- Por Classificação ---", "Valor": "" },
    ...Object.entries(byClassification).map(([key, value]) => ({
      "Métrica": key,
      "Valor": `${value.count} docs | R$ ${value.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    })),
    { "Métrica": "", "Valor": "" },
    { "Métrica": "Data de Exportação", "Valor": new Date().toLocaleString("pt-BR") },
  ];
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

  // Download
  const fileName = `contas_a_pagar_${formatDateFile(new Date())}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[date.getMonth()]}/${date.getFullYear()}`;
}

function formatDateFile(date: Date): string {
  return date.toISOString().split("T")[0];
}
