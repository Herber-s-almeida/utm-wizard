import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function InfoTooltip({
  content,
  className,
  iconClassName,
  side = 'top',
  align = 'center',
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              className
            )}
            onClick={(e) => e.preventDefault()}
          >
            <HelpCircle className={cn("h-3.5 w-3.5 text-muted-foreground", iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className="max-w-xs text-sm">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface LabelWithTooltipProps {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip: string;
  className?: string;
  required?: boolean;
}

export function LabelWithTooltip({
  htmlFor,
  children,
  tooltip,
  className,
  required,
}: LabelWithTooltipProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5",
        className
      )}
    >
      {children}
      {required && <span className="text-destructive">*</span>}
      <InfoTooltip content={tooltip} />
    </label>
  );
}
