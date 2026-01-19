import { useState } from 'react';
import { Check, ChevronDown, Building2, Crown, Shield, User } from 'lucide-react';
import { useEnvironment, EnvironmentRole, UserEnvironment } from '@/contexts/EnvironmentContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const ROLE_CONFIG: Record<EnvironmentRole, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { label: 'Owner', icon: <Crown className="h-3 w-3" />, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: <Shield className="h-3 w-3" />, color: 'text-blue-500' },
  user: { label: 'User', icon: <User className="h-3 w-3" />, color: 'text-muted-foreground' },
};

interface EnvironmentSwitcherProps {
  className?: string;
}

export function EnvironmentSwitcher({ className }: EnvironmentSwitcherProps) {
  const { 
    userEnvironments, 
    isLoadingEnvironments, 
    switchEnvironment,
    currentEnvironmentId,
    isEnvironmentOwner,
  } = useEnvironment();
  
  const [isOpen, setIsOpen] = useState(false);

  // Find current environment
  const currentEnvironment = userEnvironments.find(
    env => env.environment_id === currentEnvironmentId
  ) || userEnvironments.find(env => env.is_own_environment);

  // Separate own environment from others
  const ownEnvironment = userEnvironments.find(env => env.is_own_environment);
  const otherEnvironments = userEnvironments.filter(env => !env.is_own_environment);

  // Derive role from current environment
  const environmentRole: EnvironmentRole | null = currentEnvironment 
    ? (currentEnvironment.is_own_environment 
        ? 'owner' 
        : (currentEnvironment.role_edit && currentEnvironment.role_delete && currentEnvironment.role_invite 
            ? 'admin' 
            : 'user'))
    : null;

  const handleSelectEnvironment = (env: UserEnvironment) => {
    switchEnvironment(env.environment_id);
    setIsOpen(false);
  };

  if (isLoadingEnvironments) {
    return (
      <div className={cn("px-2 py-1.5", className)}>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  // If only one environment (user's own), show simple display
  if (userEnvironments.length <= 1) {
    const env = userEnvironments[0];
    if (!env) return null;
    
    return (
      <div className={cn("px-2 py-1.5 bg-muted/50 rounded-md border border-border/50", className)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium">{env.environment_name}</span>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-between px-3 py-2 h-auto hover:bg-muted/80 group",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate max-w-[180px]">
                {currentEnvironment?.environment_name || 'Selecionar Ambiente'}
              </span>
              {currentEnvironment && environmentRole && (
                <div className={cn("flex items-center gap-1 text-xs", ROLE_CONFIG[environmentRole].color)}>
                  {ROLE_CONFIG[environmentRole].icon}
                  <span>{ROLE_CONFIG[environmentRole].label}</span>
                </div>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[280px]" sideOffset={4}>
        {/* Own environment section */}
        {ownEnvironment && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Meu Ambiente
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handleSelectEnvironment(ownEnvironment)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{ownEnvironment.environment_name}</p>
                  <div className={cn("flex items-center gap-1 text-xs", ROLE_CONFIG.owner.color)}>
                    {ROLE_CONFIG.owner.icon}
                    <span>{ROLE_CONFIG.owner.label}</span>
                  </div>
                </div>
              </div>
              {currentEnvironment?.environment_id === ownEnvironment.environment_id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          </>
        )}

        {/* Other environments section */}
        {otherEnvironments.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Ambientes Compartilhados
            </DropdownMenuLabel>
            {otherEnvironments.map((env) => {
              const envRole: EnvironmentRole = env.role_edit && env.role_delete && env.role_invite ? 'admin' : 'user';
              const roleConfig = ROLE_CONFIG[envRole];
              const isSelected = currentEnvironment?.environment_id === env.environment_id;
              
              return (
                <DropdownMenuItem
                  key={env.environment_id}
                  onClick={() => handleSelectEnvironment(env)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{env.environment_name}</p>
                      <div className={cn("flex items-center gap-1 text-xs", roleConfig.color)}>
                        {roleConfig.icon}
                        <span>{roleConfig.label}</span>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
