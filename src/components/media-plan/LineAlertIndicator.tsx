import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { PlanAlert } from '@/hooks/usePlanAlerts';
import { cn } from '@/lib/utils';

interface LineAlertIndicatorProps {
  alerts: PlanAlert[];
  size?: 'sm' | 'md';
}

export function LineAlertIndicator({ alerts, size = 'sm' }: LineAlertIndicatorProps) {
  if (alerts.length === 0) return null;

  const hasError = alerts.some(a => a.level === 'error');
  const hasWarning = alerts.some(a => a.level === 'warning');

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const MainIcon = hasError 
    ? AlertCircle 
    : hasWarning 
      ? AlertTriangle 
      : Info;

  const iconColor = hasError 
    ? 'text-destructive' 
    : hasWarning 
      ? 'text-warning' 
      : 'text-primary';

  const getAlertIcon = (level: PlanAlert['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-3 h-3 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3 text-warning" />;
      case 'info':
        return <Info className="w-3 h-3 text-primary" />;
    }
  };

  const getAlertBgClass = (level: PlanAlert['level']) => {
    switch (level) {
      case 'error':
        return 'bg-destructive/10 border-destructive/30';
      case 'warning':
        return 'bg-warning/10 border-warning/30';
      case 'info':
        return 'bg-primary/10 border-primary/30';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          "relative p-1 rounded-full hover:bg-muted/50 transition-colors",
          hasError && "animate-pulse"
        )}>
          <MainIcon className={cn(iconSize, iconColor)} />
          {alerts.length > 1 && (
            <span className={cn(
              "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center",
              hasError 
                ? "bg-destructive text-destructive-foreground" 
                : hasWarning 
                  ? "bg-warning text-warning-foreground"
                  : "bg-primary text-primary-foreground"
            )}>
              {alerts.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <p className="font-medium text-sm">
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'} nesta linha
          </p>
        </div>
        <div className="p-2 space-y-2 max-h-[250px] overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "p-2 rounded border",
                getAlertBgClass(alert.level)
              )}
            >
              <div className="flex items-start gap-2">
                {getAlertIcon(alert.level)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.description}
                  </p>
                  {alert.action && (
                    <p className="text-xs text-primary mt-1">
                      💡 {alert.action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
