// This file is deprecated - use useFormatsHierarchy.ts instead
// Keeping minimal exports for backwards compatibility

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreativeType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Hook for Creative Types (legacy - kept for backwards compatibility)
export function useCreativeTypes() {
  const query = useQuery({
    queryKey: ['creative_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_types')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as CreativeType[];
    },
  });

  return { ...query };
}

// Deprecated exports - use useFormatsHierarchy instead
export function useFormatSpecifications() {
  return { data: [], create: { mutateAsync: async () => {} }, update: { mutateAsync: async () => {} }, remove: { mutate: () => {} } };
}

export function useFormatsWithSpecs() {
  return { 
    data: [], 
    createFormat: { mutate: () => {} }, 
    updateFormat: { mutate: () => {} }, 
    removeFormat: { mutate: () => {} } 
  };
}
