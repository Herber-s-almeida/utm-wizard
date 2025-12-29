import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { PlanAlert, AlertLevel } from '@/hooks/usePlanAlerts';
import { cn } from '@/lib/utils';

interface AlertsSummaryCardProps {
  alerts: PlanAlert[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  onFilterByAlerts?: (enabled: boolean) => void;
  filterEnabled?: boolean;
}

export function AlertsSummaryCard({
  alerts,
  errorCount,
  warningCount,
  infoCount,
  onFilterByAlerts,
  filterEnabled = false,
}: AlertsSummaryCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<AlertLevel | 'all'>('all');

  const totalAlerts = alerts.length;

  if (totalAlerts === 0) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="font-medium text-success">Tudo certo!</p>
              <p className="text-sm text-muted-foreground">
                Nenhum problema detectado no plano
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredAlerts = selectedLevel === 'all' 
    ? alerts 
    : alerts.filter(a => a.level === selectedLevel);

  const getAlertIcon = (level: AlertLevel) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'info':
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getAlertBgClass = (level: AlertLevel) => {
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
    <Card className={cn(
      "border transition-colors",
      errorCount > 0 
        ? "border-destructive/30 bg-destructive/5" 
        : warningCount > 0 
          ? "border-warning/30 bg-warning/5"
          : "border-primary/30 bg-primary/5"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="py-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {errorCount > 0 ? (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                ) : warningCount > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-warning" />
                ) : (
                  <Info className="w-5 h-5 text-primary" />
                )}
                <div>
                  <p className="font-medium">
                    {totalAlerts} {totalAlerts === 1 ? 'alerta encontrado' : 'alertas encontrados'}
                  </p>
                  <div className="flex gap-3 mt-1">
                    {errorCount > 0 && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
                      </span>
                    )}
                    {warningCount > 0 && (
                      <span className="text-xs text-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {warningCount} {warningCount === 1 ? 'aviso' : 'avisos'}
                      </span>
                    )}
                    {infoCount > 0 && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {infoCount} {infoCount === 1 ? 'info' : 'infos'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onFilterByAlerts && (
                  <Button
                    variant={filterEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterByAlerts(!filterEnabled);
                    }}
                    className="gap-2"
                  >
                    <Filter className="w-3 h-3" />
                    {filterEnabled ? 'Mostrando alertas' : 'Filtrar'}
                  </Button>
                )}
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 pb-4 space-y-4">
            {/* Level filter tabs */}
            <div className="flex gap-2 border-b pb-3">
              <Badge
                variant={selectedLevel === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedLevel('all')}
              >
                Todos ({totalAlerts})
              </Badge>
              {errorCount > 0 && (
                <Badge
                  variant={selectedLevel === 'error' ? 'destructive' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedLevel('error')}
                >
                  Erros ({errorCount})
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge
                  variant={selectedLevel === 'warning' ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer",
                    selectedLevel === 'warning' && "bg-warning text-warning-foreground"
                  )}
                  onClick={() => setSelectedLevel('warning')}
                >
                  Avisos ({warningCount})
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge
                  variant={selectedLevel === 'info' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedLevel('info')}
                >
                  Info ({infoCount})
                </Badge>
              )}
            </div>

            {/* Alerts list */}
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 pr-4">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      getAlertBgClass(alert.level)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.level)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alert.description}
                        </p>
                        {alert.action && (
                          <p className="text-xs text-primary mt-1 font-medium">
                            💡 {alert.action}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {alert.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
