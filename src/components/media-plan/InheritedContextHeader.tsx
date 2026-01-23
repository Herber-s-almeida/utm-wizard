import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Tv, 
  Radio, 
  Target, 
  Calendar, 
  TrendingUp,
  MapPin,
  FileText,
  Clock,
  Users,
  Hash,
  DollarSign,
} from 'lucide-react';

interface InheritedContextHeaderProps {
  context: Record<string, unknown>;
  isShared?: boolean;
  linkedLinesCount?: number;
}

export function InheritedContextHeader({ 
  context, 
  isShared = false,
  linkedLinesCount = 1,
}: InheritedContextHeaderProps) {
  if (!context || Object.keys(context).length === 0) {
    return null;
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatCurrency = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  // Primary fields - most important context, always shown prominently
  const primaryFields: Record<string, { label: string; icon: React.ElementType; format?: 'currency' }> = {
    line_code: { label: 'Código', icon: Hash },
    vehicle_name: { label: 'Veículo', icon: Tv },
    medium_name: { label: 'Meio', icon: Radio },
    line_budget: { label: 'Orçamento', icon: DollarSign, format: 'currency' },
  };

  // Secondary fields - additional context
  const secondaryFields: Record<string, { label: string; icon: React.ElementType }> = {
    channel_name: { label: 'Canal', icon: Radio },
    subdivision_name: { label: 'Praça', icon: MapPin },
    moment_name: { label: 'Momento', icon: Calendar },
    funnel_stage_name: { label: 'Fase Funil', icon: TrendingUp },
    format_name: { label: 'Formato', icon: FileText },
    duration: { label: 'Duração', icon: Clock },
    target_name: { label: 'Target', icon: Users },
  };

  // Filter fields that have values
  const primaryDisplay = Object.entries(primaryFields)
    .filter(([key]) => context[key])
    .map(([key, config]) => ({
      key,
      ...config,
      value: config.format === 'currency' 
        ? formatCurrency(context[key])
        : formatValue(context[key]),
    }));

  const secondaryDisplay = Object.entries(secondaryFields)
    .filter(([key]) => context[key])
    .map(([key, config]) => ({
      key,
      ...config,
      value: formatValue(context[key]),
    }));

  if (primaryDisplay.length === 0 && secondaryDisplay.length === 0 && !isShared) {
    return null;
  }

  return (
    <div className="px-6 py-3 bg-gradient-to-r from-muted/60 to-muted/30 border-b">
      {/* Primary fields - larger and more prominent */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-6">
          {primaryDisplay.map(({ key, label, icon: Icon, value }) => (
            <div key={key} className="flex items-center gap-2">
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-background border">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">{label}</span>
                <span className="font-semibold text-sm">{value}</span>
              </div>
            </div>
          ))}
        </div>

        {isShared && (
          <Badge variant="default" className="gap-1 bg-primary/20 text-primary border-primary/30">
            <Users className="h-3 w-3" />
            Compartilhado ({linkedLinesCount} linhas)
          </Badge>
        )}
      </div>

      {/* Secondary fields - smaller, inline */}
      {secondaryDisplay.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-border/50">
          {secondaryDisplay.map(({ key, label, icon: Icon, value }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Format specifications if available */}
      {context.format_specs && typeof context.format_specs === 'object' && (
        <>
          <Separator className="my-2" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Especificações do Formato:</span>
            {Object.entries(context.format_specs as Record<string, unknown>).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs gap-1">
                {key}: <span className="font-medium text-foreground">{formatValue(value)}</span>
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
