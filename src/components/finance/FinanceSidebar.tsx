import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  FileText,
  CreditCard,
  DollarSign,
  History,
  Settings,
  ArrowLeft,
  Wallet,
  Building2,
  Users,
  Package,
  Tags,
  FileType,
  ClipboardList,
  UserCircle,
  FolderKanban,
  ShoppingBag,
  Truck,
  Receipt,
  CircleDot,
  ChevronDown,
  ChevronRight,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Dashboard", url: "/finance", icon: LayoutDashboard },
  { title: "Forecast", url: "/finance/forecast", icon: TrendingUp },
  { title: "Executado", url: "/finance/actuals", icon: BarChart3 },
  { title: "Documentos", url: "/finance/documents", icon: FileText },
  { title: "Pagamentos", url: "/finance/payments", icon: CreditCard },
  { title: "Receita & ROI", url: "/finance/revenue", icon: DollarSign },
];

const libraryItems = [
  { 
    title: "Atendimento", 
    url: "/finance/library/account-managers", 
    icon: UserCircle,
    tooltip: "Pessoa que solicitou a compra, abriu a ordem de compra, etc."
  },
  { 
    title: "Produto", 
    url: "/finance/library/products", 
    icon: ShoppingBag,
    tooltip: "Compartilha a mesma base do AdsPlanning Pro"
  },
  { 
    title: "Campanha/Projeto", 
    url: "/finance/library/campaigns", 
    icon: FolderKanban,
    tooltip: "Planos cadastrados e outras campanhas/projetos"
  },
  { 
    title: "Centro de Custos", 
    url: "/finance/library/cost-centers", 
    icon: Building2,
    tooltip: "Nome e número do Centro de Custos (CR)"
  },
  { 
    title: "Equipes", 
    url: "/finance/library/teams", 
    icon: Users,
    tooltip: "Times abaixo do CR"
  },
  { 
    title: "Conta Financeira", 
    url: "/finance/library/accounts", 
    icon: Wallet,
    tooltip: "Cada conta utilizada"
  },
  { 
    title: "Pacote", 
    url: "/finance/library/packages", 
    icon: Package,
    tooltip: "Subdivisões do orçamento"
  },
  { 
    title: "Classificação Macro", 
    url: "/finance/library/macro-classifications", 
    icon: Tags,
    tooltip: "Categorias de classificação das despesas"
  },
  { 
    title: "Classificação da Despesa", 
    url: "/finance/library/expense-classifications", 
    icon: FileType,
    tooltip: "Subcategoria da classificação macro"
  },
  { 
    title: "Fornecedor", 
    url: "/finance/library/vendors", 
    icon: Truck,
    tooltip: "Cadastro de fornecedores"
  },
  { 
    title: "Tipo do Documento", 
    url: "/finance/library/document-types", 
    icon: Receipt,
    tooltip: "Boleto, cartão, fatura, recibo, etc."
  },
  { 
    title: "Status", 
    url: "/finance/library/statuses", 
    icon: CircleDot,
    tooltip: "Status exclusivos do financeiro"
  },
  { 
    title: "Tipo de Solicitação", 
    url: "/finance/library/request-types", 
    icon: ClipboardList,
    tooltip: "Compra no cartão, contrato, parecer técnico, etc."
  },
];

const settingsItems = [
  { title: "Auditoria", url: "/finance/audit", icon: History },
  { title: "Configurações", url: "/finance/settings", icon: Settings },
];

export function FinanceSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isViewingOtherEnvironment, viewingUser } = useEnvironment();
  const { data: currentProfile } = useCurrentProfile();
  const [libraryOpen, setLibraryOpen] = useState(
    location.pathname.includes("/finance/library")
  );

  const environmentName = isViewingOtherEnvironment 
    ? (viewingUser?.company || viewingUser?.full_name || viewingUser?.email)
    : (currentProfile?.company || currentProfile?.full_name || user?.email);

  const isActive = (url: string) => {
    if (url === "/finance") {
      return location.pathname === "/finance";
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">
              Finance Manager
            </h1>
            <p className="text-xs text-sidebar-foreground/60">
              Controle Financeiro
            </p>
          </div>
        </div>
        
        {environmentName && (
          <div className="mt-3 px-2 py-1.5 bg-muted/50 rounded-md border border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium">{environmentName}</span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      "transition-colors",
                      isActive(item.url) &&
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Library Section - Collapsible like AdsPlanning Pro */}
        <SidebarGroup className="mt-4">
          <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="text-sidebar-foreground/60 flex items-center justify-between cursor-pointer hover:text-sidebar-foreground transition-colors w-full pr-2">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  <span>Biblioteca</span>
                </div>
                {libraryOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="mt-1">
                <SidebarMenu>
                  {libraryItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(item.url)}
                            className={cn(
                              "transition-colors",
                              isActive(item.url) &&
                                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            <Link to={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          {item.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      "transition-colors",
                      isActive(item.url) &&
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Link
          to="/media-plans"
          className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao AdsPlanning Pro
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
