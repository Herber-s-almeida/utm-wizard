import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, FileText, LogIn } from "lucide-react";
import { AdminUser, useAdminUserPlans } from "@/hooks/useAdminUsers";
import { useEnvironment } from "@/contexts/EnvironmentContext";

interface UserEnvironmentDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em Revisão",
  approved: "Aprovado",
  active: "Ativo",
  paused: "Pausado",
  completed: "Finalizado",
};

const statusColors: Record<string, string> = {
  draft: "secondary",
  in_review: "outline",
  approved: "default",
  active: "default",
  paused: "secondary",
  completed: "secondary",
};

export function UserEnvironmentDialog({
  user,
  open,
  onOpenChange,
}: UserEnvironmentDialogProps) {
  const navigate = useNavigate();
  const { data: plans, isLoading } = useAdminUserPlans(user?.id ?? null);
  const { userEnvironments, switchEnvironment } = useEnvironment();

  const handleViewPlan = (planId: string) => {
    onOpenChange(false);
    navigate(`/media-plans/${planId}`);
  };

  const handleEnterEnvironment = () => {
    if (user) {
      // Find an environment where this user is an admin
      const userEnv = userEnvironments.find(env => env.is_environment_admin);
      if (userEnv) {
        switchEnvironment(userEnv.environment_id);
      }
      onOpenChange(false);
      navigate('/media-plan-dashboard');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ambiente de {user?.full_name || user?.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enter environment button */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div>
              <p className="font-medium">Acessar ambiente completo</p>
              <p className="text-sm text-muted-foreground">
                Visualize todos os recursos deste usuário como se estivesse logado na conta dele
              </p>
            </div>
            <Button onClick={handleEnterEnvironment} className="gap-2">
              <LogIn className="h-4 w-4" />
              Entrar no ambiente
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-medium">Planos de Mídia</h3>
            <Badge variant="outline">{plans?.length || 0} planos</Badge>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : plans && plans.length > 0 ? (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{plan.name}</span>
                        <Badge variant={statusColors[plan.status || "draft"] as "default" | "secondary" | "outline"}>
                          {statusLabels[plan.status || "draft"]}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {plan.client && <span>{plan.client}</span>}
                        {plan.client && plan.campaign && <span> • </span>}
                        {plan.campaign && <span>{plan.campaign}</span>}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground flex gap-4">
                        <span>{formatCurrency(plan.total_budget)}</span>
                        {plan.start_date && plan.end_date && (
                          <span>
                            {format(new Date(plan.start_date), "dd/MM/yy", { locale: ptBR })} -{" "}
                            {format(new Date(plan.end_date), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPlan(plan.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum plano de mídia encontrado</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
