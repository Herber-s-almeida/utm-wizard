import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Building2, Users, Wallet, Package, Tags, FileType, ClipboardList } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  useFinanceCostCenters,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  useFinanceTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useFinanceAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useFinancePackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  useFinanceMacroClassifications,
  useCreateMacroClassification,
  useUpdateMacroClassification,
  useDeleteMacroClassification,
  useFinanceExpenseClassifications,
  useCreateExpenseClassification,
  useUpdateExpenseClassification,
  useDeleteExpenseClassification,
  useFinanceRequestTypes,
  useCreateRequestType,
  useUpdateRequestType,
  useDeleteRequestType,
  FinanceCostCenter,
  FinanceTeam,
  FinanceAccount,
  FinancePackage,
  FinanceMacroClassification,
  FinanceExpenseClassification,
  FinanceRequestType,
} from "@/hooks/finance/useFinanceLibrary";

// Cost Center Dialog
function CostCenterDialog({ 
  item, 
  onClose 
}: { 
  item?: FinanceCostCenter; 
  onClose: () => void;
}) {
  const [code, setCode] = useState(item?.code || "");
  const [name, setName] = useState(item?.name || "");
  const createMutation = useCreateCostCenter();
  const updateMutation = useUpdateCostCenter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, code, name });
    } else {
      await createMutation.mutateAsync({ code, name });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Código (CR)</Label>
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nome do CR</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {item ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}

// Simple Name Dialog (for Teams, Packages, Macro Classifications, Request Types)
function SimpleNameDialog({ 
  title,
  item, 
  onClose,
  createMutation,
  updateMutation,
}: { 
  title: string;
  item?: { id: string; name: string }; 
  onClose: () => void;
  createMutation: { mutateAsync: (data: { name: string }) => Promise<void>; isPending: boolean };
  updateMutation: { mutateAsync: (data: { id: string; name: string }) => Promise<void>; isPending: boolean };
}) {
  const [name, setName] = useState(item?.name || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, name });
    } else {
      await createMutation.mutateAsync({ name });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{title}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {item ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}

// Account Dialog (with category)
function AccountDialog({ 
  item, 
  onClose 
}: { 
  item?: FinanceAccount; 
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || "");
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, name, category: category || undefined });
    } else {
      await createMutation.mutateAsync({ name, category: category || undefined });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Conta</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Categoria (opcional)</Label>
        <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {item ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}

// Expense Classification Dialog (with macro classification)
function ExpenseClassificationDialog({ 
  item, 
  macroClassifications,
  onClose 
}: { 
  item?: FinanceExpenseClassification; 
  macroClassifications: FinanceMacroClassification[];
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [macroId, setMacroId] = useState(item?.macro_classification_id || "");
  const createMutation = useCreateExpenseClassification();
  const updateMutation = useUpdateExpenseClassification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { 
      name, 
      macro_classification_id: macroId === "none" ? undefined : macroId || undefined 
    };
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Classificação</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="macro">Classificação Macro (opcional)</Label>
        <Select value={macroId || "none"} onValueChange={setMacroId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {macroClassifications.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {item ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState("cost-centers");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<unknown>(null);

  // Queries
  const { data: costCenters = [], isLoading: loadingCostCenters } = useFinanceCostCenters();
  const { data: teams = [], isLoading: loadingTeams } = useFinanceTeams();
  const { data: accounts = [], isLoading: loadingAccounts } = useFinanceAccounts();
  const { data: packages = [], isLoading: loadingPackages } = useFinancePackages();
  const { data: macroClassifications = [], isLoading: loadingMacro } = useFinanceMacroClassifications();
  const { data: expenseClassifications = [], isLoading: loadingExpense } = useFinanceExpenseClassifications();
  const { data: requestTypes = [], isLoading: loadingRequest } = useFinanceRequestTypes();

  // Mutations
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();
  const createMacro = useCreateMacroClassification();
  const updateMacro = useUpdateMacroClassification();
  const deleteMacro = useDeleteMacroClassification();
  const deleteExpense = useDeleteExpenseClassification();
  const createRequest = useCreateRequestType();
  const updateRequest = useUpdateRequestType();
  const deleteRequest = useDeleteRequestType();
  const deleteCostCenter = useDeleteCostCenter();
  const deleteAccount = useDeleteAccount();

  const handleEdit = (item: unknown) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const tabs = [
    { id: "cost-centers", label: "Centros de Custo", icon: Building2 },
    { id: "teams", label: "Equipes", icon: Users },
    { id: "accounts", label: "Contas Financeiras", icon: Wallet },
    { id: "packages", label: "Pacotes", icon: Package },
    { id: "macro", label: "Classificação Macro", icon: Tags },
    { id: "expense", label: "Classificação de Despesa", icon: FileType },
    { id: "request-types", label: "Tipos de Solicitação", icon: ClipboardList },
  ];

  const getDialogTitle = () => {
    const prefix = editingItem ? "Editar" : "Novo(a)";
    switch (activeTab) {
      case "cost-centers": return `${prefix} Centro de Custo`;
      case "teams": return `${prefix} Equipe`;
      case "accounts": return `${prefix} Conta Financeira`;
      case "packages": return `${prefix} Pacote`;
      case "macro": return `${prefix} Classificação Macro`;
      case "expense": return `${prefix} Classificação de Despesa`;
      case "request-types": return `${prefix} Tipo de Solicitação`;
      default: return "";
    }
  };

  const renderDialogContent = () => {
    switch (activeTab) {
      case "cost-centers":
        return <CostCenterDialog item={editingItem as FinanceCostCenter | undefined} onClose={handleClose} />;
      case "teams":
        return (
          <SimpleNameDialog
            title="Nome da Equipe"
            item={editingItem as FinanceTeam | undefined}
            onClose={handleClose}
            createMutation={createTeam}
            updateMutation={updateTeam}
          />
        );
      case "accounts":
        return <AccountDialog item={editingItem as FinanceAccount | undefined} onClose={handleClose} />;
      case "packages":
        return (
          <SimpleNameDialog
            title="Nome do Pacote"
            item={editingItem as FinancePackage | undefined}
            onClose={handleClose}
            createMutation={createPackage}
            updateMutation={updatePackage}
          />
        );
      case "macro":
        return (
          <SimpleNameDialog
            title="Nome da Classificação"
            item={editingItem as FinanceMacroClassification | undefined}
            onClose={handleClose}
            createMutation={createMacro}
            updateMutation={updateMacro}
          />
        );
      case "expense":
        return (
          <ExpenseClassificationDialog
            item={editingItem as FinanceExpenseClassification | undefined}
            macroClassifications={macroClassifications}
            onClose={handleClose}
          />
        );
      case "request-types":
        return (
          <SimpleNameDialog
            title="Nome do Tipo"
            item={editingItem as FinanceRequestType | undefined}
            onClose={handleClose}
            createMutation={createRequest}
            updateMutation={updateRequest}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Biblioteca</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações e opções de preenchimento dos documentos financeiros
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
            </DialogHeader>
            {renderDialogContent()}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cost-centers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Centros de Custo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCostCenters ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código (CR)</TableHead>
                      <TableHead>Nome do CR</TableHead>
                      <TableHead>Nome Completo</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhum item cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      costCenters.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.full_name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este item?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteCostCenter.mutate(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTeams ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Equipe</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          Nenhum item cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      teams.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este item?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteTeam.mutate(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Contas Financeiras
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Conta</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nenhum item cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      accounts.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este item?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteAccount.mutate(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pacotes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPackages ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Pacote</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          Nenhum item cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      packages.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este item?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePackage.mutate(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macro" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Classificações Macro
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMacro ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Classificação</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {macroClassifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          Nenhum item cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      macroClassifications.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este item?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMacro.mutate(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileType className="h-5 w-5" />
                Classificações de Despesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExpense ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome da Classificação</TableHead>
                      <TableHead>Classificação Macro</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseClassifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nenhum item cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenseClassifications.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.macro_classification?.name || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este item?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteExpense.mutate(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="request-types" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Tipos de Solicitação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRequest ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Tipo</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          Nenhum item cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      requestTypes.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este item?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteRequest.mutate(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
