import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PerformanceAlert, useResolveAlert } from '@/hooks/usePerformanceData';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  X,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PerformanceAlertsProps {
  alerts: PerformanceAlert[];
  planId: string;
  showResolved?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getAlertIcon = (type: string, severity: string) => {
  switch (type) {
    case 'budget_exceeded':
      return <DollarSign className="w-4 h-4" />;
    case 'low_ctr':
    case 'high_cpa':
    case 'low_roas':
      return <Target className="w-4 h-4" />;
    case 'pacing_slow':
    case 'pacing_fast':
      return <TrendingUp className="w-4 h-4" />;
    default:
      switch (severity) {
        case 'critical':
          return <AlertCircle className="w-4 h-4" />;
        case 'warning':
          return <AlertTriangle className="w-4 h-4" />;
        default:
          return <Info className="w-4 h-4" />;
      }
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'warning':
      return 'bg-warning/10 text-warning border-warning/20';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Crítico</Badge>;
    case 'warning':
      return <Badge className="bg-warning text-warning-foreground">Atenção</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
};

export function PerformanceAlerts({
  alerts,
  planId,
  showResolved = false,
}: PerformanceAlertsProps) {
  const resolveAlert = useResolveAlert();

  const filteredAlerts = showResolved
    ? alerts
    : alerts.filter((a) => !a.is_resolved);

  const unresolvedCount = alerts.filter((a) => !a.is_resolved).length;
  const criticalCount = alerts.filter((a) => !a.is_resolved && a.severity === 'critical').length;

  if (filteredAlerts.length === 0 && !showResolved) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-success/10 mx-auto mb-3 flex items-center justify-center">
            <Check className="w-6 h-6 text-success" />
          </div>
          <p className="text-muted-foreground">
            Nenhum alerta ativo no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Alertas de Performance
              {unresolvedCount > 0 && (
                <Badge
                  variant={criticalCount > 0 ? 'destructive' : 'secondary'}
                  className="ml-2"
                >
                  {unresolvedCount}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AnimatePresence>
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} ${
                    alert.is_resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {getAlertIcon(alert.alert_type, alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getSeverityBadge(alert.severity)}
                        {alert.is_resolved && (
                          <Badge variant="outline" className="text-success border-success">
                            Resolvido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {alert.metric_value !== null && alert.threshold_value !== null && (
                          <span>
                            Atual: <strong>{formatCurrency(alert.metric_value)}</strong> •
                            Limite: <strong>{formatCurrency(alert.threshold_value)}</strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(alert.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                    {!alert.is_resolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          resolveAlert.mutate({ alertId: alert.id, planId })
                        }
                        disabled={resolveAlert.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Resolver
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
