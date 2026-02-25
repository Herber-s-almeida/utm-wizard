import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { toast } from 'sonner';

export type ColorScheme = 
  | 'default'      // Purple (current)
  | 'ocean'        // Blue
  | 'emerald'      // Green
  | 'sunset'       // Orange/Amber
  | 'rose'         // Pink/Rose
  | 'slate'        // Neutral/Slate
  | 'cyberpunk'    // Neon purple on dark
  | 'midnight';    // Deep blue dark

export interface ThemeOption {
  id: ColorScheme;
  name: string;
  description: string;
  preview: {
    primary: string;
    accent: string;
    bg: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'default',
    name: 'Violeta',
    description: 'Tema padrão com tons de roxo e violeta',
    preview: { primary: '#7C3AED', accent: '#8B5CF6', bg: '#FAFAFF' },
  },
  {
    id: 'ocean',
    name: 'Oceano',
    description: 'Tons de azul profundo e ciano',
    preview: { primary: '#0EA5E9', accent: '#06B6D4', bg: '#F0F9FF' },
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    description: 'Verde esmeralda e tons naturais',
    preview: { primary: '#10B981', accent: '#34D399', bg: '#F0FDF4' },
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol',
    description: 'Laranja quente e âmbar dourado',
    preview: { primary: '#F59E0B', accent: '#F97316', bg: '#FFFBEB' },
  },
  {
    id: 'rose',
    name: 'Rosa',
    description: 'Rosa vibrante e tons suaves',
    preview: { primary: '#F43F5E', accent: '#FB7185', bg: '#FFF1F2' },
  },
  {
    id: 'slate',
    name: 'Cinza Moderno',
    description: 'Neutro e elegante com tons de cinza',
    preview: { primary: '#64748B', accent: '#94A3B8', bg: '#F8FAFC' },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon vibrante sobre fundo escuro',
    preview: { primary: '#A855F7', accent: '#E879F9', bg: '#0A0A1A' },
  },
  {
    id: 'midnight',
    name: 'Meia-Noite',
    description: 'Azul profundo escuro com acentos luminosos',
    preview: { primary: '#3B82F6', accent: '#60A5FA', bg: '#0F172A' },
  },
];

export function useEnvironmentTheme() {
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();

  const { data: colorScheme = 'default' } = useQuery({
    queryKey: ['environment-theme', currentEnvironmentId],
    queryFn: async () => {
      if (!currentEnvironmentId) return 'default';

      const { data, error } = await supabase
        .from('environments')
        .select('color_scheme')
        .eq('id', currentEnvironmentId)
        .single();

      if (error || !data) return 'default';
      return (data.color_scheme || 'default') as ColorScheme;
    },
    enabled: !!currentEnvironmentId,
    staleTime: 60 * 1000,
  });

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    THEME_OPTIONS.forEach(t => {
      root.classList.remove(`theme-${t.id}`);
    });
    
    // Add current theme class
    if (colorScheme && colorScheme !== 'default') {
      root.classList.add(`theme-${colorScheme}`);
    }

    // Handle dark themes
    const darkThemes: ColorScheme[] = ['cyberpunk', 'midnight'];
    if (darkThemes.includes(colorScheme)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    return () => {
      // Cleanup on unmount
      THEME_OPTIONS.forEach(t => {
        root.classList.remove(`theme-${t.id}`);
      });
      root.classList.remove('dark');
    };
  }, [colorScheme]);

  const updateThemeMutation = useMutation({
    mutationFn: async (newScheme: ColorScheme) => {
      if (!currentEnvironmentId) throw new Error('No environment');

      const { error } = await supabase
        .from('environments')
        .update({ color_scheme: newScheme })
        .eq('id', currentEnvironmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-theme', currentEnvironmentId] });
      queryClient.invalidateQueries({ queryKey: ['environment-settings', currentEnvironmentId] });
      toast.success('Tema atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar o tema');
    },
  });

  return {
    colorScheme,
    updateTheme: updateThemeMutation.mutateAsync,
    isUpdating: updateThemeMutation.isPending,
  };
}
