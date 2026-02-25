import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEnvironmentTheme, THEME_OPTIONS, type ColorScheme } from '@/hooks/useEnvironmentTheme';

interface ThemeSelectorProps {
  disabled?: boolean;
}

export function ThemeSelector({ disabled }: ThemeSelectorProps) {
  const { colorScheme, updateTheme, isUpdating } = useEnvironmentTheme();

  const handleSelect = async (themeId: ColorScheme) => {
    if (disabled || isUpdating || themeId === colorScheme) return;
    await updateTheme(themeId);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {THEME_OPTIONS.map((theme) => {
        const isSelected = colorScheme === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            disabled={disabled || isUpdating}
            onClick={() => handleSelect(theme.id)}
            className={cn(
              'relative group rounded-lg border-2 p-3 text-left transition-all duration-200 hover:shadow-md',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'border-primary shadow-md ring-1 ring-primary/30'
                : 'border-border hover:border-muted-foreground/30',
              (disabled || isUpdating) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Color Preview */}
            <div className="flex gap-1.5 mb-2.5">
              <div
                className="h-8 w-8 rounded-md shadow-sm"
                style={{ backgroundColor: theme.preview.primary }}
              />
              <div
                className="h-8 w-8 rounded-md shadow-sm"
                style={{ backgroundColor: theme.preview.accent }}
              />
              <div
                className="h-8 w-8 rounded-md shadow-sm border border-border"
                style={{ backgroundColor: theme.preview.bg }}
              />
            </div>

            {/* Label */}
            <p className="text-sm font-medium truncate">{theme.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 min-h-[2rem]">
              {theme.description}
            </p>

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
