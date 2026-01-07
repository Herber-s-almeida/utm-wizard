import { ReactNode, useState } from 'react';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarCollapseProvider } from '@/hooks/useSidebarCollapse';
import { useEnvironment } from '@/contexts/EnvironmentContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isViewingOtherEnvironment, viewingUser, setViewingUser } = useEnvironment();

  return (
    <SidebarCollapseProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        {/* Admin viewing banner */}
        {isViewingOtherEnvironment && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between gap-4 z-50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>Visualizando ambiente de:</span>
              <span className="font-bold">{viewingUser?.full_name || viewingUser?.email}</span>
              {viewingUser?.company && (
                <span className="opacity-75">({viewingUser.company})</span>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewingUser(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao meu ambiente
            </Button>
          </div>
        )}

        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <div className="hidden md:block h-screen sticky top-0">
            <AppSidebar />
          </div>

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Mobile Sidebar */}
          <div className={cn(
            "fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 bg-sidebar shadow-xl",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <AppSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-30 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <span className="ml-3 font-display font-semibold">MediaPlan</span>
            </header>

            {/* Page Content */}
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarCollapseProvider>
  );
}
