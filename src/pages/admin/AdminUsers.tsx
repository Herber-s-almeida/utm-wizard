import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2, Plus, ClipboardList } from "lucide-react";
import { UsersTable } from "@/components/admin/UsersTable";
import { InviteSystemUserDialog } from "@/components/admin/InviteSystemUserDialog";
import { AccessRequestsTable } from "@/components/admin/AccessRequestsTable";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAccessRequests } from "@/hooks/useAccessRequests";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: requests, isLoading: requestsLoading } = useAccessRequests();

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];

  const filteredUsers = users?.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.company?.toLowerCase().includes(searchLower)
    );
  });

  const filteredRequests = requests?.filter((request) => {
    const searchLower = search.toLowerCase();
    return (
      request.email?.toLowerCase().includes(searchLower) ||
      request.full_name?.toLowerCase().includes(searchLower) ||
      request.company_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Ambientes do Sistema</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os ambientes e seus proprietários
              </p>
            </div>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Novo Ambiente
          </Button>
        </div>

        <Tabs defaultValue="environments" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="environments" className="gap-2">
                <Building2 className="h-4 w-4" />
                Ambientes
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Solicitações
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="environments">
            {usersLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <UsersTable users={filteredUsers} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum ambiente encontrado</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {requestsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredRequests && filteredRequests.length > 0 ? (
              <AccessRequestsTable requests={filteredRequests} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma solicitação de acesso</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <InviteSystemUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}
