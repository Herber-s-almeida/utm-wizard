import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Building2, Shield, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EnvironmentSwitcher } from './EnvironmentSwitcher';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  title: string;
  subtitle: string;
  titleColor: string;
  logoUrl?: string | null;
  linkTo: string;
  icon?: React.ReactNode;
  showEnvironmentSwitcher?: boolean;
}

export function SidebarHeader({
  isCollapsed,
  toggleCollapse,
  title,
  subtitle,
  titleColor,
  logoUrl,
  linkTo,
  icon,
  showEnvironmentSwitcher = true,
}: SidebarHeaderProps) {
  return (
    <div className={cn(
      "shrink-0 border-b border-sidebar-border",
      isCollapsed ? "p-2" : "p-3"
    )}>
      <div className={cn(
        "flex items-center gap-3",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <Link to={linkTo} className="flex items-center gap-3 min-w-0 flex-1">
            {/* Logo Circle */}
            <Avatar className="h-10 w-10 shrink-0 border-2 border-border">
              {logoUrl ? (
                <AvatarImage src={logoUrl} alt="Logo" className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                {icon || 'Logo'}
              </AvatarFallback>
            </Avatar>
            
            {/* Title & Subtitle */}
            <div className="flex flex-col min-w-0">
              <span className={cn("font-display font-bold text-sm truncate", titleColor)}>
                {title}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider">
                {subtitle}
              </span>
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
      
      {/* Environment Switcher */}
      {!isCollapsed && showEnvironmentSwitcher && (
        <EnvironmentSwitcher className="mt-2" />
      )}
    </div>
  );
}