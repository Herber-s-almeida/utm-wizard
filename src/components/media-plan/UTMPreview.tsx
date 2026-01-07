import { useState } from 'react';
import { Check, Copy, ExternalLink, CheckCircle2, AlertCircle, Clock, Loader2, XCircle } from 'lucide-react';
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
import { toast } from 'sonner';

interface UTMPreviewProps {
  destinationUrl: string | null;
  utmParams: Partial<UTMParams>;
  isValidated?: boolean;
  onValidate?: () => Promise<void> | void;
  onInvalidate?: () => Promise<void> | void;
  compact?: boolean;
  validating?: boolean;
  fallbackUrl?: string | null;
  showActions?: boolean;
}

export function UTMPreview({
  destinationUrl,
  utmParams,
  isValidated = false,
  onValidate,
  onInvalidate,
  compact = false,
  validating = false,
  fallbackUrl,
  showActions = true,
}: UTMPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const hasUTM = utmParams.utm_source || utmParams.utm_medium || utmParams.utm_campaign;
  
  const effectiveUrl = destinationUrl || fallbackUrl;
  
  const fullUrl = effectiveUrl && hasUTM 
    ? buildUrlWithUTM(effectiveUrl, utmParams as UTMParams) 
    : null;

  const handleCopy = async () => {
    if (!fullUrl) return;
    
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('URL copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Erro ao copiar URL');
    }
  };

  const handleOpenUrl = () => {
    if (!fullUrl) return;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleValidate = async () => {
    if (onValidate) {
      await onValidate();
      setIsOpen(false);
    }
  };

  const handleInvalidate = async () => {
    if (onInvalidate) {
      await onInvalidate();
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
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
              {validating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : hasUTM ? (
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
              onValidate={onValidate ? handleValidate : undefined}
              onInvalidate={onInvalidate ? handleInvalidate : undefined}
              onCopy={handleCopy}
              onOpenUrl={handleOpenUrl}
              copied={copied}
              validating={validating}
              showActions={showActions}
              isUsingFallback={!destinationUrl && !!fallbackUrl}
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
        onInvalidate={onInvalidate}
        onCopy={handleCopy}
        onOpenUrl={handleOpenUrl}
        copied={copied}
        validating={validating}
        showActions={showActions}
        isUsingFallback={!destinationUrl && !!fallbackUrl}
      />
    </div>
  );
}

interface UTMDetailsProps {
  utmParams: Partial<UTMParams>;
  fullUrl: string | null;
  isValidated: boolean;
  onValidate?: () => Promise<void> | void;
  onInvalidate?: () => Promise<void> | void;
  onCopy: () => void;
  onOpenUrl: () => void;
  copied: boolean;
  validating?: boolean;
  showActions?: boolean;
  isUsingFallback?: boolean;
}

function UTMDetails({
  utmParams,
  fullUrl,
  isValidated,
  onValidate,
  onInvalidate,
  onCopy,
  onOpenUrl,
  copied,
  validating = false,
  showActions = true,
  isUsingFallback = false,
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
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-muted-foreground">URL Completa:</p>
            {isUsingFallback && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                URL padrão do plano
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background p-2 rounded border overflow-x-auto max-h-16">
              {fullUrl}
            </code>
            {showActions && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>Copiar URL</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenUrl}
                        className="h-8 w-8 p-0 shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Testar em nova aba</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (onValidate || onInvalidate) && (
        <div className="pt-2 border-t flex gap-2">
          {onValidate && !isValidated && (
            <Button
              variant="outline"
              size="sm"
              onClick={onValidate}
              disabled={validating}
              className="flex-1"
            >
              {validating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Validar UTM
            </Button>
          )}
          {onInvalidate && isValidated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onInvalidate}
              disabled={validating}
              className="flex-1 text-destructive hover:text-destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Remover Validação
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
