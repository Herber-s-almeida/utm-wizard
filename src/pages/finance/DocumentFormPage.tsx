import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  ArrowLeft,
  Save,
  Building2,
  FolderTree,
  FileSearch,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancialDocuments } from "@/hooks/finance/useFinancialDocuments";
import { useFinancialVendors } from "@/hooks/finance/useFinancialVendors";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const macroClassifications = [
  "Mídia",
  "Produção",
  "Eventos",
  "Pesquisa",
  "Consultoria",
  "Tecnologia",
  "Outros",
];

const expenseClassifications = [
  "Mídia (Veiculação)",
  "Mídia (Produção)",
  "Mídia Digital",
  "Mídia Impressa",
  "Mídia OOH",
  "Produção de Conteúdo",
  "Produção Audiovisual",
  "Eventos Presenciais",
  "Eventos Online",
  "Pesquisa de Mercado",
  "Consultoria Estratégica",
  "Desenvolvimento",
  "Outros",
];

const requestTypes = [
  "Regularização",
  "Antecipação",
  "Novo Contrato",
  "Aditivo",
  "Reembolso",
  "Outros",
];

export default function DocumentFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createDocument, isCreating } = useFinancialDocuments();
  const { vendors } = useFinancialVendors();

  const [formData, setFormData] = useState({
    // Identificação
    media_plan_id: "",
    vendor_id: "",
    vendor_name: "",
    document_type: "invoice",
    document_number: "",
    // Classificação
    account_manager: "",
    campaign_project: "",
    product: "",
    macro_classification: "",
    expense_classification: "",
    // Centro de Custo
    cost_center_name: "",
    cost_center_code: "",
    team: "",
    financial_account: "",
    package: "",
    // Serviço
    service_description: "",
    // Datas e Valores
    competency_month: "",
    competency_month_erp: "",
    issue_date: "",
    due_date: "",
    cms_sent_date: "",
    invoice_received_date: "",
    amount: "",
    currency: "BRL",
    // Referências
    contract_reference: "",
    request_type: "",
    rir_task_number: "",
    // Status e Observação
    notes: "",
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["media-plans-for-finance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_plans")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.media_plan_id) {
      toast.error("Selecione um plano de mídia");
      return;
    }
    if (!formData.due_date) {
      toast.error("Informe a data de vencimento");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    createDocument({
      media_plan_id: formData.media_plan_id,
      vendor_id: formData.vendor_id || null,
      vendor_name: formData.vendor_name || null,
      document_type: formData.document_type,
      document_number: formData.document_number || null,
      issue_date: formData.issue_date || new Date().toISOString().split('T')[0],
      due_date: formData.due_date,
      amount: Number(formData.amount),
      currency: formData.currency,
      notes: formData.notes || null,
      status: "received",
      // Extended fields
      competency_month: formData.competency_month || null,
      competency_month_erp: formData.competency_month_erp || null,
      account_manager: formData.account_manager || null,
      campaign_project: formData.campaign_project || null,
      product: formData.product || null,
      cost_center_name: formData.cost_center_name || null,
      cost_center_code: formData.cost_center_code || null,
      team: formData.team || null,
      financial_account: formData.financial_account || null,
      package: formData.package || null,
      service_description: formData.service_description || null,
      macro_classification: formData.macro_classification || null,
      expense_classification: formData.expense_classification || null,
      cms_sent_date: formData.cms_sent_date || null,
      contract_reference: formData.contract_reference || null,
      request_type: formData.request_type || null,
      invoice_received_date: formData.invoice_received_date || null,
      rir_task_number: formData.rir_task_number || null,
    }, {
      onSuccess: () => {
        navigate("/finance/documents");
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/finance/documents">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-emerald-500" />
            Novo Documento
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre uma nova nota fiscal, boleto ou fatura
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Documento</CardTitle>
            <CardDescription>
              Preencha os dados do documento financeiro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="identification" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="identification" className="flex items-center gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Identificação
                </TabsTrigger>
                <TabsTrigger value="classification" className="flex items-center gap-1.5 text-xs">
                  <FolderTree className="h-3.5 w-3.5" />
                  Classificação
                </TabsTrigger>
                <TabsTrigger value="cost-center" className="flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5" />
                  Centro de Custo
                </TabsTrigger>
                <TabsTrigger value="service" className="flex items-center gap-1.5 text-xs">
                  <FileSearch className="h-3.5 w-3.5" />
                  Serviço
                </TabsTrigger>
                <TabsTrigger value="dates" className="flex items-center gap-1.5 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Datas/Valores
                </TabsTrigger>
                <TabsTrigger value="references" className="flex items-center gap-1.5 text-xs">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Referências
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Identificação */}
              <TabsContent value="identification" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="media_plan_id">Plano de Mídia *</Label>
                  <Select 
                    value={formData.media_plan_id} 
                    onValueChange={(v) => handleChange("media_plan_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="vendor_id">Fornecedor Cadastrado</Label>
                    <Select 
                      value={formData.vendor_id || "none"} 
                      onValueChange={(v) => handleChange("vendor_id", v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione ou digite abaixo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vendor_name">Razão Social (Fornecedor)</Label>
                    <Input
                      id="vendor_name"
                      placeholder="Ex: Dual Midia OOH Publicidade LTDA"
                      value={formData.vendor_name}
                      onChange={(e) => handleChange("vendor_name", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="document_type">Tipo de Documento *</Label>
                    <Select 
                      value={formData.document_type} 
                      onValueChange={(v) => handleChange("document_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invoice">Nota Fiscal</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="receipt">Recibo</SelectItem>
                        <SelectItem value="credit_note">Nota de Crédito</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="document_number">Nº Documento</Label>
                    <Input
                      id="document_number"
                      placeholder="Ex: 9851"
                      value={formData.document_number}
                      onChange={(e) => handleChange("document_number", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Classificação */}
              <TabsContent value="classification" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="account_manager">Atendimento</Label>
                    <Input
                      id="account_manager"
                      placeholder="Ex: Marcos Giovanella"
                      value={formData.account_manager}
                      onChange={(e) => handleChange("account_manager", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="campaign_project">Campanha/Projeto</Label>
                    <Input
                      id="campaign_project"
                      placeholder="Ex: Graduação 2026.1"
                      value={formData.campaign_project}
                      onChange={(e) => handleChange("campaign_project", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="product">Produto</Label>
                  <Input
                    id="product"
                    placeholder="Ex: Graduação Presencial"
                    value={formData.product}
                    onChange={(e) => handleChange("product", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="macro_classification">Classificação Macro</Label>
                    <Select 
                      value={formData.macro_classification || "none"} 
                      onValueChange={(v) => handleChange("macro_classification", v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {macroClassifications.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expense_classification">Classificação da Despesa</Label>
                    <Select 
                      value={formData.expense_classification || "none"} 
                      onValueChange={(v) => handleChange("expense_classification", v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {expenseClassifications.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Centro de Custo */}
              <TabsContent value="cost-center" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cost_center_name">Nome do CR</Label>
                    <Input
                      id="cost_center_name"
                      placeholder="Ex: Planejamento de Marketing"
                      value={formData.cost_center_name}
                      onChange={(e) => handleChange("cost_center_name", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cost_center_code">Centro de Custo (CR)</Label>
                    <Input
                      id="cost_center_code"
                      placeholder="Ex: 103605"
                      value={formData.cost_center_code}
                      onChange={(e) => handleChange("cost_center_code", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="team">Equipe</Label>
                    <Input
                      id="team"
                      placeholder="Ex: Gerência de Growth"
                      value={formData.team}
                      onChange={(e) => handleChange("team", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="financial_account">Conta Financeira (CF)</Label>
                    <Input
                      id="financial_account"
                      placeholder="Ex: Publicidade e Propaganda"
                      value={formData.financial_account}
                      onChange={(e) => handleChange("financial_account", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="package">Pacote</Label>
                  <Input
                    id="package"
                    placeholder="Ex: Marketing"
                    value={formData.package}
                    onChange={(e) => handleChange("package", e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* Tab 4: Serviço */}
              <TabsContent value="service" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="service_description">Descrição do Serviço</Label>
                  <Textarea
                    id="service_description"
                    placeholder="Ex: Referente a veiculação publicitária através de mídia exterior - campanha, planeta Puc 2026.1"
                    value={formData.service_description}
                    onChange={(e) => handleChange("service_description", e.target.value)}
                    rows={5}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Informações adicionais sobre o documento..."
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Tab 5: Datas e Valores */}
              <TabsContent value="dates" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="competency_month">Competência</Label>
                    <Input
                      id="competency_month"
                      type="month"
                      value={formData.competency_month}
                      onChange={(e) => handleChange("competency_month", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="competency_month_erp">Competência Benner</Label>
                    <Input
                      id="competency_month_erp"
                      placeholder="Ex: Set"
                      value={formData.competency_month_erp}
                      onChange={(e) => handleChange("competency_month_erp", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="invoice_received_date">Data de Recebimento da NF</Label>
                    <Input
                      id="invoice_received_date"
                      type="date"
                      value={formData.invoice_received_date}
                      onChange={(e) => handleChange("invoice_received_date", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="issue_date">Data de Emissão</Label>
                    <Input
                      id="issue_date"
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => handleChange("issue_date", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cms_sent_date">Data Envio CMS</Label>
                    <Input
                      id="cms_sent_date"
                      type="date"
                      value={formData.cms_sent_date}
                      onChange={(e) => handleChange("cms_sent_date", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_date">Data de Vencimento *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleChange("due_date", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Valor Realizado *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => handleChange("amount", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Moeda</Label>
                    <Select 
                      value={formData.currency} 
                      onValueChange={(v) => handleChange("currency", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL - Real</SelectItem>
                        <SelectItem value="USD">USD - Dólar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 6: Referências */}
              <TabsContent value="references" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contract_reference">Nº A.P/P.I/O.C/Contrato</Label>
                    <Input
                      id="contract_reference"
                      placeholder="Ex: PI 16715"
                      value={formData.contract_reference}
                      onChange={(e) => handleChange("contract_reference", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="request_type">Tipo de Solicitação</Label>
                    <Select 
                      value={formData.request_type || "none"} 
                      onValueChange={(v) => handleChange("request_type", v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione</SelectItem>
                        {requestTypes.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="rir_task_number">Número da Tarefa RIR</Label>
                  <Input
                    id="rir_task_number"
                    placeholder="Ex: 12345"
                    value={formData.rir_task_number}
                    onChange={(e) => handleChange("rir_task_number", e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <Button variant="outline" type="button" asChild>
                <Link to="/finance/documents">Cancelar</Link>
              </Button>
              <Button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isCreating}
              >
                <Save className="w-4 h-4 mr-2" />
                {isCreating ? "Salvando..." : "Salvar Documento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
