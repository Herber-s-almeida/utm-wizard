import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LabelWithTooltip } from '@/components/ui/info-tooltip';
import { RefreshCw } from 'lucide-react';
import { toSlug } from '@/utils/utmGenerator';

interface SlugInputFieldProps {
  name: string;
  slug: string | null;
  onNameChange: (name: string) => void;
  onSlugChange: (slug: string | null) => void;
}

export function SlugInputField({ name, slug, onNameChange, onSlugChange }: SlugInputFieldProps) {
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [localSlug, setLocalSlug] = useState('');

  // Compute auto-generated slug from name
  const autoSlug = toSlug(name);
  
  // Effective slug: what will actually be used
  const effectiveSlug = slugManuallyEdited && localSlug ? localSlug : autoSlug;

  // Initialize local slug from prop on mount
  useEffect(() => {
    if (slug !== null && slug !== autoSlug) {
      setLocalSlug(slug);
      setSlugManuallyEdited(true);
    } else {
      setLocalSlug(autoSlug);
      setSlugManuallyEdited(false);
    }
  }, []); // Only on mount

  // Update local slug when name changes (only if not manually edited)
  useEffect(() => {
    if (!slugManuallyEdited) {
      setLocalSlug(autoSlug);
    }
  }, [autoSlug, slugManuallyEdited]);

  // Sync slug back to parent when it changes
  useEffect(() => {
    const slugToSave = slugManuallyEdited && localSlug !== autoSlug ? localSlug : null;
    onSlugChange(slugToSave);
  }, [localSlug, slugManuallyEdited, autoSlug, onSlugChange]);

  const handleSlugChange = (value: string) => {
    // Only allow valid slug characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setLocalSlug(sanitized);
    setSlugManuallyEdited(true);
  };

  const handleResetSlug = () => {
    setLocalSlug(autoSlug);
    setSlugManuallyEdited(false);
  };

  return (
    <div className="space-y-4">
      {/* Nome do Plano */}
      <div className="space-y-2">
        <LabelWithTooltip 
          htmlFor="name" 
          tooltip="O nome do plano é também o nome da campanha e será utilizado para gerar o slug UTM (utm_campaign). Você pode personalizar o slug abaixo."
          required
        >
          Nome do Plano
        </LabelWithTooltip>
        <Input
          id="name"
          placeholder="Ex: Campanha de Verão 2025"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      {/* Slug UTM da Campanha */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <LabelWithTooltip 
            htmlFor="utm_campaign_slug" 
            tooltip="Identificador usado no parâmetro utm_campaign. É gerado automaticamente a partir do nome do plano, mas você pode editar manualmente. Edições manuais são preservadas."
          >
            Slug UTM da Campanha
          </LabelWithTooltip>
          <div className="flex items-center gap-2">
            {slugManuallyEdited && localSlug !== autoSlug ? (
              <>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Personalizado
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleResetSlug}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Resetar
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                Auto
              </Badge>
            )}
          </div>
        </div>
        <Input
          id="utm_campaign_slug"
          placeholder={autoSlug || 'slug-da-campanha'}
          value={localSlug}
          onChange={(e) => handleSlugChange(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">utm_campaign:</span>{' '}
          <code className="bg-muted px-1 py-0.5 rounded text-foreground">{effectiveSlug || 'slug-da-campanha'}</code>
        </p>
      </div>
    </div>
  );
}