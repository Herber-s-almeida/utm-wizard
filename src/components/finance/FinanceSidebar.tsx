import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  PanelLeftClose,
  PanelLeftOpen,
  User,
  LogOut,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useSystemAdmin } from "@/hooks/useSystemAdmin";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isViewingOtherEnvironment, viewingUser } = useEnvironment();
  const { data: currentProfile } = useCurrentProfile();
  const { isAdmin } = useSystemAdmin();
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className={cn(
      "flex flex-col h-full border-r border-sidebar-border bg-sidebar overflow-hidden transition-all duration-300",
      isCollapsed ? "w-16" : "w-80"
    )}>
      {/* Header - Fixed at top */}
      <div className={cn(
        "shrink-0 border-b border-sidebar-border",
        isCollapsed ? "p-2" : "p-3"
      )}>
        <div className={cn(
          "flex items-center gap-2",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <Link to="/finance" className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400 truncate">Finance</span>
                <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">MANAGER</span>
              </div>
            </Link>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 shrink-0"
                onClick={toggleCollapse}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expandir menu" : "Recolher menu"}
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Environment name display */}
        {!isCollapsed && environmentName && (
          <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded-md border border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium">{environmentName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapsed state - show only icons */}
      {isCollapsed ? (
        <div className="flex-1 min-h-0 overflow-y-auto py-3 px-2 flex flex-col items-center gap-1 bg-background">
          {menuItems.map((item) => (
            <Tooltip key={item.url}>
              <TooltipTrigger asChild>
                <Link to={item.url}>
                  <Button 
                    variant={isActive(item.url) ? 'secondary' : 'ghost'} 
                    size="icon"
                    className={cn(
                      "h-9 w-9",
                      isActive(item.url) && "bg-emerald-500/10 text-emerald-600"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          ))}

          <div className="w-8 h-px bg-border my-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Library className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Biblioteca</TooltipContent>
          </Tooltip>

          <div className="w-8 h-px bg-border my-2" />

          {settingsItems.map((item) => (
            <Tooltip key={item.url}>
              <TooltipTrigger asChild>
                <Link to={item.url}>
                  <Button 
                    variant={isActive(item.url) ? 'secondary' : 'ghost'} 
                    size="icon"
                    className={cn(
                      "h-9 w-9",
                      isActive(item.url) && "bg-emerald-500/10 text-emerald-600"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          ))}

          {/* Back to AdsPlanning */}
          <div className="mt-auto pt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/media-plans">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Voltar ao AdsPlanning Pro</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ) : (
        <>
          {/* Expanded state - Scrollable content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="py-3 px-2 bg-background">
              {/* Principal Section */}
              <div className="mb-4">
                <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Principal
                </h3>
                <div className="space-y-0.5 mt-1">
                  {menuItems.map((item) => (
                    <Link key={item.url} to={item.url}>
                      <Button 
                        variant={isActive(item.url) ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={cn(
                          "w-full justify-start gap-2 h-8 text-xs",
                          isActive(item.url) && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.title}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Library Section - Collapsible */}
              <div className="mb-4">
                <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-between h-8 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <Library className="h-3.5 w-3.5" />
                        <span>Biblioteca</span>
                      </div>
                      {libraryOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-0.5 mt-1">
                      {libraryItems.map((item) => (
                        <Tooltip key={item.url}>
                          <TooltipTrigger asChild>
                            <Link to={item.url}>
                              <Button 
                                variant={isActive(item.url) ? 'secondary' : 'ghost'} 
                                size="sm" 
                                className={cn(
                                  "w-full justify-start gap-2 h-8 text-xs",
                                  isActive(item.url) && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                )}
                              >
                                <item.icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.title}</span>
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            {item.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Sistema Section */}
              <div className="mb-4">
                <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Sistema
                </h3>
                <div className="space-y-0.5 mt-1">
                  {settingsItems.map((item) => (
                    <Link key={item.url} to={item.url}>
                      <Button 
                        variant={isActive(item.url) ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={cn(
                          "w-full justify-start gap-2 h-8 text-xs",
                          isActive(item.url) && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.title}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Back to AdsPlanning Pro link */}
              <div className="mb-4">
                <Link to="/media-plans">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2 h-8 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                    <span>Voltar ao AdsPlanning Pro</span>
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollArea>

          {/* Footer with user info - Fixed at bottom */}
          <div className="shrink-0 p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <User className="h-3.5 w-3.5" />
              <span className="truncate flex-1">{user?.email}</span>
            </div>
            {isAdmin && (
              <div className="mb-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 px-2">
                  <ShieldCheck className="h-3 w-3" />
                  <span className="font-medium">Administração</span>
                </div>
                <Link to="/admin/users">
                  <Button
                    variant={location.pathname === '/admin/users' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-2 h-7 text-xs pl-6"
                  >
                    <Users className="h-3 w-3" />
                    Usuários
                  </Button>
                </Link>
                <Link to="/admin/menu-visibility">
                  <Button
                    variant={location.pathname === '/admin/menu-visibility' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-2 h-7 text-xs pl-6"
                  >
                    <Eye className="h-3 w-3" />
                    Visibilidade do Menu
                  </Button>
                </Link>
              </div>
            )}
            <Link to="/account">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8 text-xs mb-1"
              >
                <Settings className="h-3.5 w-3.5" />
                Minha Conta
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </>
      )}

      {/* Collapsed footer */}
      {isCollapsed && (
        <div className="shrink-0 p-2 border-t border-sidebar-border flex flex-col items-center gap-1">
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/admin/users">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Administração</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/account">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Minha Conta</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-9 w-9 text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
