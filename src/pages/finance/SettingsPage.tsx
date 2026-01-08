import { useState } from "react";
import { 
  Settings, 
  Bell,
  Users,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancialVendors } from "@/hooks/finance/useFinancialVendors";
import { useFinancialAlertConfigs } from "@/hooks/finance/useFinancialAlertConfigs";
import { toast } from "sonner";

const alertTypeLabels: Record<string, string> = {
  overspend: "Gastos acima do planejado",
  underspend: "Gastos abaixo do planejado",
  overdue: "Pagamentos atrasados",
  variance: "Variação significativa",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [newVendorName, setNewVendorName] = useState("");
  
  const { vendors, isLoading: vendorsLoading, createVendor, deleteVendor } = useFinancialVendors();
  const { configs, isLoading: configsLoading, updateConfig } = useFinancialAlertConfigs();

  const handleCreateVendor = () => {
    if (!newVendorName.trim()) {
      toast.error("Digite o nome do fornecedor");
      return;
    }
    createVendor({ name: newVendorName });
    setNewVendorName("");
  };

  const handleToggleAlert = (configId: string, isActive: boolean) => {
    updateConfig({ id: configId, isActive: !isActive });
  };

  const handleUpdateThreshold = (configId: string, threshold: number) => {
    updateConfig({ id: configId, thresholdPercentage: threshold });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-gray-500" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure alertas e fornecedores
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2">
            <Users className="h-4 w-4" />
            Fornecedores
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Alertas</CardTitle>
              <CardDescription>
                Configure os limites para alertas automáticos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {configs.map((config) => (
                  <div 
                    key={config.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={() => handleToggleAlert(config.id, config.is_active)}
                      />
                      <div>
                        <p className="font-medium">
                          {alertTypeLabels[config.alert_type] || config.alert_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Dispara quando a variação exceder o limite
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Limite:</Label>
                      <Input
                        type="number"
                        value={config.threshold_percentage}
                        onChange={(e) => handleUpdateThreshold(config.id, Number(e.target.value))}
                        className="w-20"
                        min={0}
                        max={100}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}

                {configs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma configuração de alerta encontrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fornecedores Cadastrados</CardTitle>
              <CardDescription>
                Gerencie a lista de fornecedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Nome do fornecedor"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateVendor()}
                />
                <Button onClick={handleCreateVendor}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {vendors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum fornecedor cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">
                          {vendor.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vendor.category || "-"}
                        </TableCell>
                        <TableCell>
                          {vendor.is_active ? (
                            <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                          ) : (
                            <Badge variant="outline">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteVendor(vendor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
