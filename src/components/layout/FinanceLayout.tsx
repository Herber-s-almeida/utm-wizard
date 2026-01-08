import { SidebarProvider } from "@/components/ui/sidebar";
import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { Outlet } from "react-router-dom";

export function FinanceLayout() {
  return (
    <div className="finance-theme min-h-screen bg-background">
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full">
          <FinanceSidebar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
