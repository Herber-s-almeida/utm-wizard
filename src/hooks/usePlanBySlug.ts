import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook to fetch a media plan by slug or ID
 * If the identifier is a UUID, it fetches by ID directly
 * If it's a slug, it fetches by slug
 */
export function usePlanBySlug(identifier: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['plan-by-slug', identifier],
    queryFn: async () => {
      if (!identifier) return null;

      // Check if identifier is a UUID (contains hyphens and is 36 chars)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      let query = supabase.from('media_plans').select('*');

      if (isUUID) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('slug', identifier);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!identifier && !!user?.id,
  });
}

/**
 * Utility function to generate the plan URL using slug
 */
export function getPlanUrl(plan: { id: string; slug?: string | null }): string {
  return `/media-plans/${plan.slug || plan.id}`;
}
