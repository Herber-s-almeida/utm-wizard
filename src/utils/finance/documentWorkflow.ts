import { supabase } from "@/integrations/supabase/client";
import type { DocumentStatus } from "@/types/finance";

/**
 * Document status workflow
 * 
 * received → verified → approved → scheduled → paid
 *                    ↓
 *                cancelled
 */

const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
  received: ["verified", "cancelled"],
  verified: ["approved", "received", "cancelled"],
  approved: ["scheduled", "verified", "cancelled"],
  scheduled: ["paid", "approved", "cancelled"],
  paid: [], // Terminal state
  cancelled: ["received"], // Can reopen
};

export interface WorkflowResult {
  success: boolean;
  message: string;
  newStatus?: DocumentStatus;
}

/**
 * Validate if a status transition is allowed
 */
export function isValidTransition(
  currentStatus: DocumentStatus,
  newStatus: DocumentStatus
): boolean {
  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get available next statuses from current status
 */
export function getAvailableTransitions(currentStatus: DocumentStatus): DocumentStatus[] {
  return validTransitions[currentStatus] || [];
}

/**
 * Transition document status with audit logging
 */
export async function transitionDocumentStatus(
  documentId: string,
  newStatus: DocumentStatus,
  userId: string,
  reason?: string
): Promise<WorkflowResult> {
  try {
    // 1. Get current document
    const { data: doc, error: fetchError } = await supabase
      .from("financial_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !doc) {
      return { success: false, message: "Documento não encontrado" };
    }

    const currentStatus = doc.status as DocumentStatus;

    // 2. Validate transition
    if (!isValidTransition(currentStatus, newStatus)) {
      return { 
        success: false, 
        message: `Transição de "${currentStatus}" para "${newStatus}" não permitida` 
      };
    }

    // 3. Prepare update data
    const updateData: Record<string, any> = { 
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Add approval info if transitioning to approved
    if (newStatus === "approved") {
      updateData.approved_by = userId;
      updateData.approved_at = new Date().toISOString();
    }

    // 4. Update document
    const { error: updateError } = await supabase
      .from("financial_documents")
      .update(updateData)
      .eq("id", documentId);

    if (updateError) {
      return { success: false, message: "Erro ao atualizar status: " + updateError.message };
    }

    // 5. Create audit log
    await supabase.from("financial_audit_log").insert({
      user_id: userId,
      entity_type: "document",
      entity_id: documentId,
      action: "update",
      before_json: { status: currentStatus },
      after_json: { status: newStatus },
      reason: reason || `Status alterado de ${currentStatus} para ${newStatus}`,
    });

    return { 
      success: true, 
      message: `Status atualizado para ${getStatusLabel(newStatus)}`,
      newStatus 
    };
  } catch (error) {
    console.error("Error transitioning document status:", error);
    return { success: false, message: "Erro inesperado ao atualizar status" };
  }
}

/**
 * Create a payment from a document
 */
export async function createPaymentFromDocument(
  documentId: string,
  userId: string,
  installments: number = 1,
  paymentDates?: string[]
): Promise<{ success: boolean; message: string; paymentIds?: string[] }> {
  try {
    // Get document
    const { data: doc, error: fetchError } = await supabase
      .from("financial_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !doc) {
      return { success: false, message: "Documento não encontrado" };
    }

    const totalAmount = Number(doc.amount);
    const amountPerInstallment = totalAmount / installments;

    const payments = [];
    for (let i = 0; i < installments; i++) {
      const paymentDate = paymentDates?.[i] || doc.due_date;
      
      payments.push({
        user_id: userId,
        financial_document_id: documentId,
        installment_number: i + 1,
        planned_payment_date: paymentDate,
        planned_amount: Math.round(amountPerInstallment * 100) / 100,
        status: "scheduled",
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("financial_payments")
      .insert(payments)
      .select("id");

    if (insertError) {
      return { success: false, message: "Erro ao criar pagamentos: " + insertError.message };
    }

    // Update document status to scheduled if approved
    if (doc.status === "approved") {
      await supabase
        .from("financial_documents")
        .update({ status: "scheduled" })
        .eq("id", documentId);
    }

    // Audit log
    await supabase.from("financial_audit_log").insert({
      user_id: userId,
      entity_type: "payment",
      entity_id: documentId,
      action: "create",
      after_json: { 
        document_id: documentId, 
        installments, 
        total_amount: totalAmount 
      },
      reason: `${installments} pagamento(s) criado(s) para o documento`,
    });

    return { 
      success: true, 
      message: `${installments} pagamento(s) criado(s) com sucesso`,
      paymentIds: inserted?.map(p => p.id) 
    };
  } catch (error) {
    console.error("Error creating payments:", error);
    return { success: false, message: "Erro inesperado ao criar pagamentos" };
  }
}

/**
 * Register a payment as paid
 */
export async function registerPayment(
  paymentId: string,
  userId: string,
  paidAmount: number,
  paymentMethod: string,
  proofUrl?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: payment, error: fetchError } = await supabase
      .from("financial_payments")
      .select("*, financial_documents(*)")
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment) {
      return { success: false, message: "Pagamento não encontrado" };
    }

    const plannedAmount = Number(payment.planned_amount);
    const status = paidAmount >= plannedAmount ? "paid" : "partial";

    const { error: updateError } = await supabase
      .from("financial_payments")
      .update({
        actual_payment_date: new Date().toISOString().split('T')[0],
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        proof_url: proofUrl || null,
        status,
      })
      .eq("id", paymentId);

    if (updateError) {
      return { success: false, message: "Erro ao registrar pagamento" };
    }

    // Check if all payments for the document are paid
    const doc = payment.financial_documents as any;
    if (doc) {
      const { data: allPayments } = await supabase
        .from("financial_payments")
        .select("status")
        .eq("financial_document_id", doc.id)
        .is("deleted_at", null);

      const allPaid = allPayments?.every(p => p.status === "paid");
      if (allPaid) {
        await supabase
          .from("financial_documents")
          .update({ status: "paid" })
          .eq("id", doc.id);
      }
    }

    // Audit log
    await supabase.from("financial_audit_log").insert({
      user_id: userId,
      entity_type: "payment",
      entity_id: paymentId,
      action: "update",
      before_json: { status: payment.status },
      after_json: { status, paid_amount: paidAmount, payment_method: paymentMethod },
      reason: `Pagamento ${status === "paid" ? "realizado" : "parcial"}: R$ ${paidAmount.toLocaleString("pt-BR")}`,
    });

    return { 
      success: true, 
      message: status === "paid" ? "Pagamento realizado com sucesso" : "Pagamento parcial registrado" 
    };
  } catch (error) {
    console.error("Error registering payment:", error);
    return { success: false, message: "Erro inesperado" };
  }
}

function getStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    received: "Recebido",
    verified: "Conferido",
    approved: "Aprovado",
    scheduled: "Agendado",
    paid: "Pago",
    cancelled: "Cancelado",
  };
  return labels[status];
}
