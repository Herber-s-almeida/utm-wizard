import { useState } from 'react';
import { Check, Copy, ExternalLink, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UTMParams, buildUrlWithUTM } from '@/utils/utmGenerator';
import { cn } from '@/lib/utils';

interface UTMPreviewProps {
  destinationUrl: string | null;
  utmParams: Partial<UTMParams>;
  isValidated?: boolean;
  onValidate?: () => void;
  compact?: boolean;
}

export function UTMPreview({
  destinationUrl,
  utmParams,
  isValidated = false,
  onValidate,
  compact = false,
}: UTMPreviewProps) {
  const [copied, setCopied] = useState(false);

  const hasUTM = utmParams.utm_source || utmParams.utm_medium || utmParams.utm_campaign;
  
  const fullUrl = destinationUrl && hasUTM 
    ? buildUrlWithUTM(destinationUrl, utmParams as UTMParams) 
    : null;

  const handleCopy = async () => {
    if (!fullUrl) return;
    
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 w-6 p-0',
                hasUTM 
                  ? isValidated 
                    ? 'text-green-600' 
                    : 'text-amber-500'
                  : 'text-muted-foreground'
              )}
            >
              {hasUTM ? (
                isValidated ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-3" align="start">
            <UTMDetails 
              utmParams={utmParams}
              fullUrl={fullUrl}
              isValidated={isValidated}
              onValidate={onValidate}
              onCopy={handleCopy}
              copied={copied}
            />
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
      <UTMDetails 
        utmParams={utmParams}
        fullUrl={fullUrl}
        isValidated={isValidated}
        onValidate={onValidate}
        onCopy={handleCopy}
        copied={copied}
      />
    </div>
  );
}

interface UTMDetailsProps {
  utmParams: Partial<UTMParams>;
  fullUrl: string | null;
  isValidated: boolean;
  onValidate?: () => void;
  onCopy: () => void;
  copied: boolean;
}

function UTMDetails({
  utmParams,
  fullUrl,
  isValidated,
  onValidate,
  onCopy,
  copied,
}: UTMDetailsProps) {
  const utmFields = [
    { key: 'utm_source', label: 'Source', value: utmParams.utm_source, required: true },
    { key: 'utm_medium', label: 'Medium', value: utmParams.utm_medium, required: true },
    { key: 'utm_campaign', label: 'Campaign', value: utmParams.utm_campaign, required: true },
    { key: 'utm_term', label: 'Term', value: utmParams.utm_term, required: false },
    { key: 'utm_content', label: 'Content', value: utmParams.utm_content, required: false },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Parâmetros UTM</span>
        {isValidated ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Validado
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        )}
      </div>

      {/* UTM Parameters */}
      <div className="space-y-1.5">
        {utmFields.map(field => (
          <div key={field.key} className="flex items-center gap-2 text-xs">
            <span className={cn(
              'w-20 font-mono',
              field.required ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {field.key}:
            </span>
            <span className={cn(
              'flex-1 font-mono truncate',
              field.value ? 'text-primary' : 'text-muted-foreground italic'
            )}>
              {field.value || 'não definido'}
            </span>
          </div>
        ))}
      </div>

      {/* Full URL */}
      {fullUrl && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">URL Completa:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background p-2 rounded border overflow-x-auto">
              {fullUrl}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-8 w-8 p-0 shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {onValidate && !isValidated && (
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onValidate}
            className="w-full"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Validar UTM
          </Button>
        </div>
      )}
    </div>
  );
}
