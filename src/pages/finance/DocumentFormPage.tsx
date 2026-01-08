import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  ArrowLeft,
  Save,
  Upload,
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
import { useFinancialDocuments } from "@/hooks/finance/useFinancialDocuments";
import { useFinancialVendors } from "@/hooks/finance/useFinancialVendors";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function DocumentFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createDocument, isCreating } = useFinancialDocuments();
  const { vendors } = useFinancialVendors();

  const [formData, setFormData] = useState({
    media_plan_id: "",
    vendor_id: "",
    vendor_name: "",
    document_type: "invoice",
    document_number: "",
    issue_date: "",
    due_date: "",
    amount: "",
    currency: "BRL",
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
          <CardContent className="space-y-6">
            {/* Plano de Mídia */}
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

            {/* Fornecedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor_id">Fornecedor Cadastrado</Label>
                <Select 
                  value={formData.vendor_id} 
                  onValueChange={(v) => handleChange("vendor_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ou digite abaixo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor_name">Ou Nome do Fornecedor</Label>
                <Input
                  id="vendor_name"
                  placeholder="Digite o nome"
                  value={formData.vendor_name}
                  onChange={(e) => handleChange("vendor_name", e.target.value)}
                />
              </div>
            </div>

            {/* Tipo e Número */}
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
                <Label htmlFor="document_number">Número do Documento</Label>
                <Input
                  id="document_number"
                  placeholder="Ex: NF-12345"
                  value={formData.document_number}
                  onChange={(e) => handleChange("document_number", e.target.value)}
                />
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="issue_date">Data de Emissão</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => handleChange("issue_date", e.target.value)}
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

            {/* Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor *</Label>
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

            {/* Observações */}
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

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
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
