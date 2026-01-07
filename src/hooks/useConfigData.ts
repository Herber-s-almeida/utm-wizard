import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffectiveUserId } from './useEffectiveUserId';
import { toast } from 'sonner';
import { useSoftDeleteMutations, filterSoftDeleteItems } from './useSoftDelete';

// Types
export interface Subdivision {
  id: string;
  name: string;
  description?: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export interface Moment {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export interface FunnelStage {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  user_id: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export interface Medium {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  medium_id: string | null;
  user_id: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  vehicle_id: string;
  user_id: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export interface Target {
  id: string;
  name: string;
  age_range: string | null;
  geolocation: any;
  behavior: string | null;
  description: string | null;
  user_id: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export interface BehavioralSegmentation {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

export interface CreativeTemplate {
  id: string;
  name: string;
  format: string;
  dimension: string | null;
  duration: string | null;
  message: string | null;
  objective: string | null;
  user_id: string;
  deleted_at?: string | null;
  is_active?: boolean;
}

// Hook for Subdivisions
export function useSubdivisions() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('plan_subdivisions', 'subdivisions', 'Subdivisão');

  const query = useQuery({
    queryKey: ['subdivisions', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_subdivisions')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Subdivision[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description, parent_id }: { name: string; description?: string; parent_id?: string }) => {
      const { data, error } = await supabase
        .from('plan_subdivisions')
        .insert({ name, description: description || null, parent_id: parent_id || null, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subdivisions'] });
      toast.success('Subdivisão criada!');
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from('plan_subdivisions')
        .update({ name, description: description || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subdivisions'] });
      toast.success('Subdivisão atualizada!');
    },
  });

  // Legacy remove that now does soft delete
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    data: query.data,
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Moments
export function useMoments() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('moments', 'moments', 'Momento');

  const query = useQuery({
    queryKey: ['moments', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('moments').select('*').eq('user_id', effectiveUserId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as Moment[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase.from('moments').insert({ name, description: description || null, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['moments'] }); toast.success('Momento criado!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase.from('moments').update({ name, description: description || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['moments'] }); toast.success('Momento atualizado!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Funnel Stages
export function useFunnelStages() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('funnel_stages', 'funnel_stages', 'Fase do funil');

  const query = useQuery({
    queryKey: ['funnel_stages', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('funnel_stages').select('*').eq('user_id', effectiveUserId!).order('order_index', { ascending: true });
      if (error) throw error;
      return data as FunnelStage[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const activeStages = query.data?.filter(s => !s.deleted_at) || [];
      const maxOrder = activeStages.reduce((max, s) => Math.max(max, s.order_index), -1);
      const { data, error } = await supabase.from('funnel_stages').insert({ name, description: description || null, order_index: maxOrder + 1, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funnel_stages'] }); toast.success('Fase do funil criada!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase.from('funnel_stages').update({ name, description: description || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funnel_stages'] }); toast.success('Fase do funil atualizada!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Mediums
export function useMediums() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('mediums', 'mediums', 'Meio');

  const query = useQuery({
    queryKey: ['mediums', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('mediums').select('*').eq('user_id', effectiveUserId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as Medium[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase.from('mediums').insert({ name, description: description || null, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mediums'] }); toast.success('Meio criado!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase.from('mediums').update({ name, description: description || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mediums'] }); toast.success('Meio atualizado!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Vehicles
export function useVehicles() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('vehicles', 'vehicles', 'Veículo');

  const query = useQuery({
    queryKey: ['vehicles', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').eq('user_id', effectiveUserId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description, medium_id }: { name: string; description?: string; medium_id?: string }) => {
      const { data, error } = await supabase.from('vehicles').insert({ name, description: description || null, medium_id: medium_id || null, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Veículo criado!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description, medium_id, slug }: { id: string; name: string; description?: string; medium_id?: string; slug?: string }) => {
      const { error } = await supabase.from('vehicles').update({ name, description: description || null, medium_id: medium_id || null, slug: slug || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Veículo atualizado!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Channels
export function useChannels() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('channels', 'channels', 'Canal');

  const query = useQuery({
    queryKey: ['channels', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('channels').select('*').eq('user_id', effectiveUserId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as Channel[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description, slug, vehicle_id }: { name: string; description?: string; slug?: string; vehicle_id: string }) => {
      const { data, error } = await supabase.from('channels').insert({ name, description: description || null, slug: slug || null, vehicle_id, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['channels'] }); toast.success('Canal criado!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description, slug }: { id: string; name: string; description?: string; slug?: string }) => {
      const { error } = await supabase.from('channels').update({ name, description: description || null, slug: slug || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['channels'] }); toast.success('Canal atualizado!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Behavioral Segmentations
export function useBehavioralSegmentations() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('behavioral_segmentations', 'behavioral_segmentations', 'Segmentação');

  const query = useQuery({
    queryKey: ['behavioral_segmentations', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('behavioral_segmentations').select('*').eq('user_id', effectiveUserId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as BehavioralSegmentation[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase.from('behavioral_segmentations').insert({ name, description: description || null, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['behavioral_segmentations'] }); toast.success('Segmentação comportamental criada!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase.from('behavioral_segmentations').update({ name, description: description || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['behavioral_segmentations'] }); toast.success('Segmentação comportamental atualizada!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Targets
export function useTargets() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('targets', 'targets', 'Segmentação');

  const query = useQuery({
    queryKey: ['targets', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('targets').select('*').eq('user_id', effectiveUserId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as Target[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async (target: { name: string; age_range?: string; geolocation?: any; behavior?: string; description?: string }) => {
      const { data, error } = await supabase.from('targets').insert({ name: target.name, age_range: target.age_range || null, geolocation: target.geolocation || [], behavior: target.behavior || null, description: target.description || null, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['targets'] }); toast.success('Segmentação criada!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Target> & { id: string }) => {
      const { error } = await supabase.from('targets').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['targets'] }); toast.success('Segmentação atualizada!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Creative Templates
export function useCreativeTemplates() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { softDelete, restore, permanentDelete } = useSoftDeleteMutations('creative_templates', 'creative_templates', 'Criativo');

  const query = useQuery({
    queryKey: ['creative_templates', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('creative_templates').select('*').eq('user_id', effectiveUserId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as CreativeTemplate[];
    },
    enabled: !!effectiveUserId,
  });

  const create = useMutation({
    mutationFn: async (template: { name: string; format: string; dimension?: string | null; duration?: string | null; message?: string | null; objective?: string | null }) => {
      const { data, error } = await supabase.from('creative_templates').insert({ name: template.name, format: template.format, dimension: template.dimension || null, duration: template.duration || null, message: template.message || null, objective: template.objective || null, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creative_templates'] }); toast.success('Criativo criado!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreativeTemplate> & { id: string }) => {
      const { error } = await supabase.from('creative_templates').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creative_templates'] }); toast.success('Criativo atualizado!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await softDelete.mutateAsync(id);
    },
  });

  const { active, archived } = filterSoftDeleteItems(query.data);

  return { 
    ...query, 
    activeItems: active,
    archivedItems: archived,
    create, 
    update, 
    remove,
    softDelete,
    restore,
    permanentDelete,
  };
}

// Hook for Media Plans with soft delete
export function useMediaPlans() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();

  const draftPlans = useQuery({
    queryKey: ['media_plans', 'draft', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_plans').select('*').eq('user_id', effectiveUserId!).is('deleted_at', null).eq('status', 'draft').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const activePlans = useQuery({
    queryKey: ['media_plans', 'active', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_plans').select('*').eq('user_id', effectiveUserId!).is('deleted_at', null).eq('status', 'active').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const finishedPlans = useQuery({
    queryKey: ['media_plans', 'finished', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_plans').select('*').eq('user_id', effectiveUserId!).is('deleted_at', null).eq('status', 'completed').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const trashedPlans = useQuery({
    queryKey: ['media_plans', 'trashed', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_plans').select('*').eq('user_id', effectiveUserId!).not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('media_plans').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media_plans'] }); toast.success('Plano movido para a lixeira'); },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('media_plans').update({ deleted_at: null }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media_plans'] }); toast.success('Plano restaurado!'); },
  });

  const permanentDelete = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('media_plans').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media_plans'] }); toast.success('Plano excluído permanentemente'); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { 
      const { error } = await supabase.from('media_plans').update({ status }).eq('id', id); 
      if (error) throw error; 
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['media_plans'] }); 
      toast.success('Status atualizado!'); 
    },
  });

  return { draftPlans, activePlans, finishedPlans, trashedPlans, softDelete, restore, permanentDelete, updateStatus };
}
