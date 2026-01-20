import { Crown, Pencil, Eye, CheckCircle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserPlanRole, AppRole } from '@/hooks/usePlanRoles';
import { Skeleton } from '@/components/ui/skeleton';
import { useEnvironment } from '@/contexts/EnvironmentContext';

interface RoleBadgeProps {
  planId: string;
  showTooltip?: boolean;
  className?: string;
}

const ROLE_ICONS: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  editor: Pencil,
  viewer: Eye,
  approver: CheckCircle,
};

const ROLE_COLORS: Record<AppRole, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  editor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  approver: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
};

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  owner: 'Você é o proprietário deste plano',
  editor: 'Você pode editar este plano',
  viewer: 'Você pode apenas visualizar este plano',
  approver: 'Você pode aprovar este plano',
};

export function RoleBadge({ planId, showTooltip = true, className = '' }: RoleBadgeProps) {
  const { data: roleInfo, isLoading } = useUserPlanRole(planId);
  const { isEnvironmentAdmin, isEnvironmentOwner } = useEnvironment();

  if (isLoading) {
    return <Skeleton className="h-5 w-24 rounded-full" />;
  }

  // Show admin badge if user is environment admin (not plan owner)
  if (isEnvironmentAdmin && !isEnvironmentOwner && roleInfo?.role !== 'owner') {
    const badge = (
      <Badge variant="outline" className={`bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 gap-1 text-xs ${className}`}>
        <Shield className="h-3 w-3" />
        Admin
      </Badge>
    );

    if (!showTooltip) return badge;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>Você é administrador do ambiente</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!roleInfo || !roleInfo.role) return null;

  const Icon = ROLE_ICONS[roleInfo.role];
  const colorClass = ROLE_COLORS[roleInfo.role];

  if (!Icon) return null;

  const badge = (
    <Badge variant="outline" className={`${colorClass} gap-1 text-xs ${className}`}>
      <Icon className="h-3 w-3" />
      {roleInfo.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p>{ROLE_DESCRIPTIONS[roleInfo.role]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for list views
export function RoleBadgeCompact({ planId }: { planId: string }) {
  const { data: roleInfo, isLoading } = useUserPlanRole(planId);
  const { isEnvironmentAdmin, isEnvironmentOwner } = useEnvironment();

  if (isLoading) return null;

  // Show admin badge for environment admins who are not plan owners
  if (isEnvironmentAdmin && !isEnvironmentOwner && roleInfo?.role !== 'owner') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 h-5 w-5 p-0 justify-center">
              <Shield className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Administrador</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!roleInfo || !roleInfo.role || roleInfo.role === 'owner') return null;

  const Icon = ROLE_ICONS[roleInfo.role];
  const colorClass = ROLE_COLORS[roleInfo.role];

  if (!Icon) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${colorClass} h-5 w-5 p-0 justify-center`}>
            <Icon className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{roleInfo.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
