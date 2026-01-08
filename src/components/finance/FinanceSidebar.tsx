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
  Library,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

const menuItems = [
  {
    title: "Dashboard",
    url: "/finance",
    icon: LayoutDashboard,
  },
  {
    title: "Forecast",
    url: "/finance/forecast",
    icon: TrendingUp,
  },
  {
    title: "Executado",
    url: "/finance/actuals",
    icon: BarChart3,
  },
  {
    title: "Documentos",
    url: "/finance/documents",
    icon: FileText,
  },
  {
    title: "Pagamentos",
    url: "/finance/payments",
    icon: CreditCard,
  },
  {
    title: "Receita & ROI",
    url: "/finance/revenue",
    icon: DollarSign,
  },
];

const settingsItems = [
  {
    title: "Biblioteca",
    url: "/finance/library",
    icon: Library,
  },
  {
    title: "Auditoria",
    url: "/finance/audit",
    icon: History,
  },
  {
    title: "Configurações",
    url: "/finance/settings",
    icon: Settings,
  },
];

export function FinanceSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isViewingOtherEnvironment, viewingUser } = useEnvironment();
  const { data: currentProfile } = useCurrentProfile();

  // Get environment display name - show for all users
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
        
        {/* Environment name display */}
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
