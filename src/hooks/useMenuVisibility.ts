import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSystemAdmin } from './useSystemAdmin';

interface MenuVisibilitySetting {
  id: string;
  menu_key: string;
  is_hidden: boolean;
  updated_at: string;
  updated_by: string | null;
}

export function useMenuVisibility() {
  const { user } = useAuth();
  const { isAdmin } = useSystemAdmin();
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['menu-visibility-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_visibility_settings')
        .select('*');
      
      if (error) throw error;
      return data as MenuVisibilitySetting[];
    },
    enabled: !!user,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ menuKey, isHidden }: { menuKey: string; isHidden: boolean }) => {
      const { error } = await supabase
        .from('menu_visibility_settings')
        .update({ 
          is_hidden: isHidden, 
          updated_at: new Date().toISOString(),
          updated_by: user?.id 
        })
        .eq('menu_key', menuKey);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-visibility-settings'] });
    },
  });

  const isMenuHidden = (menuKey: string): boolean => {
    // Admins always see all menus
    if (isAdmin) return false;
    
    const setting = settings.find(s => s.menu_key === menuKey);
    return setting?.is_hidden ?? false;
  };

  const getSettingByKey = (menuKey: string) => {
    return settings.find(s => s.menu_key === menuKey);
  };

  return {
    settings,
    isLoading,
    updateSetting,
    isMenuHidden,
    getSettingByKey,
  };
}
