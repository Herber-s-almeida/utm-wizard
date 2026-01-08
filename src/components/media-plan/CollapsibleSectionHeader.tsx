import { ChevronDown, X, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedCollapsibleTrigger } from '@/components/ui/animated-collapsible';

interface CollapsibleSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tooltip?: string;
  onHide: () => void;
  className?: string;
}

export function CollapsibleSectionHeader({
  icon,
  title,
  subtitle,
  tooltip,
  onHide,
  className = '',
}: CollapsibleSectionHeaderProps) {
  return (
    <div className={`w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors ${className}`}>
      <AnimatedCollapsibleTrigger asChild>
        <button className="flex-1 flex items-center gap-3 text-left">
          {icon}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </button>
      </AnimatedCollapsibleTrigger>
      
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onHide();
                }}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Ocultar esta seção
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <AnimatedCollapsibleTrigger asChild>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <motion.div
              initial={false}
              className="[[data-state=open]_&]:rotate-180 transition-transform duration-200"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>
        </AnimatedCollapsibleTrigger>
      </div>
    </div>
  );
}
