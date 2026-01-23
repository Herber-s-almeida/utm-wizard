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

  // Map of context keys to their display info
  const contextFields: Record<string, { label: string; icon: React.ElementType }> = {
    vehicle_name: { label: 'Veículo', icon: Tv },
    medium_name: { label: 'Meio', icon: Radio },
    channel_name: { label: 'Canal', icon: Radio },
    subdivision_name: { label: 'Subdivisão', icon: MapPin },
    moment_name: { label: 'Momento', icon: Calendar },
    funnel_stage_name: { label: 'Fase Funil', icon: TrendingUp },
    format_name: { label: 'Formato', icon: FileText },
    secondary: { label: 'Secundagem', icon: Clock },
    target_name: { label: 'Target', icon: Users },
  };

  // Filter only fields that have values
  const displayFields = Object.entries(contextFields)
    .filter(([key]) => context[key])
    .map(([key, config]) => ({
      key,
      ...config,
      value: formatValue(context[key]),
    }));

  if (displayFields.length === 0 && !isShared) {
    return null;
  }

  return (
    <div className="px-6 py-3 bg-muted/40 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          {displayFields.map(({ key, label, icon: Icon, value }) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>

        {isShared && (
          <Badge variant="secondary" className="ml-4 gap-1">
            <Users className="h-3 w-3" />
            Compartilhado ({linkedLinesCount} linhas)
          </Badge>
        )}
      </div>

      {/* Format specifications if available */}
      {context.format_specs && typeof context.format_specs === 'object' && (
        <>
          <Separator className="my-2" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Especificações:</span>
            {Object.entries(context.format_specs as Record<string, unknown>).map(([key, value]) => (
              <span key={key}>
                {key}: <span className="text-foreground">{formatValue(value)}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
