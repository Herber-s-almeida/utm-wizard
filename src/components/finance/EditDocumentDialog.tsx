import { useState, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const documentTypes = [
  { value: "invoice", label: "Nota Fiscal" },
  { value: "boleto", label: "Boleto" },
  { value: "receipt", label: "Recibo" },
  { value: "credit_note", label: "Nota de Crédito" },
  { value: "other", label: "Outro" },
];

const macroClassifications = [
  "Mídia", "Produção", "Eventos", "Pesquisa", "Consultoria", "Tecnologia", "Outros",
];

const expenseClassifications = [
  "Mídia (Veiculação)", "Mídia (Produção)", "Mídia Digital", "Mídia Impressa", "Mídia OOH",
  "Produção de Conteúdo", "Produção Audiovisual", "Eventos Presenciais", "Eventos Online",
  "Pesquisa de Mercado", "Consultoria Estratégica", "Desenvolvimento", "Outros",
];

const requestTypes = [
  "Regularização", "Antecipação", "Novo Contrato", "Aditivo", "Reembolso", "Outros",
];

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any;
}

export function EditDocumentDialog({
  open,
  onOpenChange,
  document,
}: EditDocumentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    vendor_name: "",
    document_type: "invoice",
    document_number: "",
    issue_date: new Date(),
    due_date: new Date(),
    amount: "",
    currency: "BRL",
    notes: "",
    // Extended fields
    account_manager: "",
    campaign_project: "",
    product: "",
    macro_classification: "",
    expense_classification: "",
    cost_center_name: "",
    cost_center_code: "",
    team: "",
    financial_account: "",
    package: "",
    service_description: "",
    competency_month: "",
    competency_month_erp: "",
    cms_sent_date: "",
    contract_reference: "",
    request_type: "",
    invoice_received_date: "",
    rir_task_number: "",
  });

  useEffect(() => {
    if (document) {
      setFormData({
        vendor_name: document.vendor_name || "",
        document_type: document.document_type,
        document_number: document.document_number || "",
        issue_date: parseISO(document.issue_date),
        due_date: parseISO(document.due_date),
        amount: document.amount?.toString() || "",
        currency: document.currency || "BRL",
        notes: document.notes || "",
        // Extended fields
        account_manager: document.account_manager || "",
        campaign_project: document.campaign_project || "",
        product: document.product || "",
        macro_classification: document.macro_classification || "",
        expense_classification: document.expense_classification || "",
        cost_center_name: document.cost_center_name || "",
        cost_center_code: document.cost_center_code || "",
        team: document.team || "",
        financial_account: document.financial_account || "",
        package: document.package || "",
        service_description: document.service_description || "",
        competency_month: document.competency_month || "",
        competency_month_erp: document.competency_month_erp || "",
        cms_sent_date: document.cms_sent_date || "",
        contract_reference: document.contract_reference || "",
        request_type: document.request_type || "",
        invoice_received_date: document.invoice_received_date || "",
        rir_task_number: document.rir_task_number || "",
      });
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const updateData = {
        vendor_name: formData.vendor_name || null,
        document_type: formData.document_type,
        document_number: formData.document_number || null,
        issue_date: format(formData.issue_date, "yyyy-MM-dd"),
        due_date: format(formData.due_date, "yyyy-MM-dd"),
        amount: parseFloat(formData.amount.replace(/[^\d,.-]/g, "").replace(",", ".")),
        currency: formData.currency,
        notes: formData.notes || null,
        // Extended fields
        account_manager: formData.account_manager || null,
        campaign_project: formData.campaign_project || null,
        product: formData.product || null,
        macro_classification: formData.macro_classification || null,
        expense_classification: formData.expense_classification || null,
        cost_center_name: formData.cost_center_name || null,
        cost_center_code: formData.cost_center_code || null,
        team: formData.team || null,
        financial_account: formData.financial_account || null,
        package: formData.package || null,
        service_description: formData.service_description || null,
        competency_month: formData.competency_month || null,
        competency_month_erp: formData.competency_month_erp || null,
        cms_sent_date: formData.cms_sent_date || null,
        contract_reference: formData.contract_reference || null,
        request_type: formData.request_type || null,
        invoice_received_date: formData.invoice_received_date || null,
        rir_task_number: formData.rir_task_number || null,
      };

      const { error } = await supabase
        .from("financial_documents")
        .update(updateData)
        .eq("id", document.id);

      if (error) throw error;

      await supabase.from("financial_audit_log").insert({
        user_id: user.id,
        entity_type: "document",
        entity_id: document.id,
        action: "update",
        before_json: document,
        after_json: updateData,
        reason: "Documento atualizado",
      });

      queryClient.invalidateQueries({ queryKey: ["financial-document"] });
      queryClient.invalidateQueries({ queryKey: ["financial-documents"] });
      
      toast.success("Documento atualizado!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>
              Atualize as informações do documento
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            <Tabs defaultValue="identification" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="identification" className="text-xs">Identificação</TabsTrigger>
                <TabsTrigger value="classification" className="text-xs">Classificação</TabsTrigger>
                <TabsTrigger value="dates" className="text-xs">Datas/Valores</TabsTrigger>
                <TabsTrigger value="references" className="text-xs">Referências</TabsTrigger>
              </TabsList>

              <TabsContent value="identification" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select 
                      value={formData.document_type} 
                      onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      value={formData.document_number}
                      onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Razão Social (Fornecedor)</Label>
                  <Input
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição do Serviço</Label>
                  <Textarea
                    value={formData.service_description}
                    onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="classification" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Atendimento</Label>
                    <Input
                      value={formData.account_manager}
                      onChange={(e) => setFormData({ ...formData, account_manager: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Campanha/Projeto</Label>
                    <Input
                      value={formData.campaign_project}
                      onChange={(e) => setFormData({ ...formData, campaign_project: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Produto</Label>
                    <Input
                      value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Classificação Macro</Label>
                    <Select 
                      value={formData.macro_classification || "none"} 
                      onValueChange={(v) => setFormData({ ...formData, macro_classification: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {macroClassifications.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Classificação da Despesa</Label>
                    <Select 
                      value={formData.expense_classification || "none"} 
                      onValueChange={(v) => setFormData({ ...formData, expense_classification: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {expenseClassifications.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Centro de Custo (CR)</Label>
                    <Input
                      value={formData.cost_center_code}
                      onChange={(e) => setFormData({ ...formData, cost_center_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do CR</Label>
                    <Input
                      value={formData.cost_center_name}
                      onChange={(e) => setFormData({ ...formData, cost_center_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Equipe</Label>
                    <Input
                      value={formData.team}
                      onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Conta Financeira (CF)</Label>
                    <Input
                      value={formData.financial_account}
                      onChange={(e) => setFormData({ ...formData, financial_account: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pacote</Label>
                    <Input
                      value={formData.package}
                      onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dates" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Competência</Label>
                    <Input
                      type="month"
                      value={formData.competency_month}
                      onChange={(e) => setFormData({ ...formData, competency_month: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Competência Benner</Label>
                    <Input
                      value={formData.competency_month_erp}
                      onChange={(e) => setFormData({ ...formData, competency_month_erp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Emissão</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.issue_date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.issue_date}
                          onSelect={(date) => date && setFormData({ ...formData, issue_date: date })}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Vencimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.due_date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.due_date}
                          onSelect={(date) => date && setFormData({ ...formData, due_date: date })}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Recebimento da NF</Label>
                    <Input
                      type="date"
                      value={formData.invoice_received_date}
                      onChange={(e) => setFormData({ ...formData, invoice_received_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Envio CMS</Label>
                    <Input
                      type="date"
                      value={formData.cms_sent_date}
                      onChange={(e) => setFormData({ ...formData, cms_sent_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Realizado</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select 
                      value={formData.currency} 
                      onValueChange={(v) => setFormData({ ...formData, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL (R$)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="references" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nº A.P/P.I/O.C/Contrato</Label>
                    <Input
                      value={formData.contract_reference}
                      onChange={(e) => setFormData({ ...formData, contract_reference: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Solicitação</Label>
                    <Select 
                      value={formData.request_type || "none"} 
                      onValueChange={(v) => setFormData({ ...formData, request_type: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {requestTypes.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Número da Tarefa RIR</Label>
                  <Input
                    value={formData.rir_task_number}
                    onChange={(e) => setFormData({ ...formData, rir_task_number: e.target.value })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
