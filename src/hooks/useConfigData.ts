import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Types
export interface Subdivision {
  id: string;
  name: string;
  description?: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
}

export interface Moment {
  id: string;
  name: string;
  description?: string;
  user_id: string;
}

export interface FunnelStage {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  user_id: string;
}

export interface Medium {
  id: string;
  name: string;
  description?: string;
  user_id: string;
}

export interface Vehicle {
  id: string;
  name: string;
  description?: string;
  medium_id: string | null;
  user_id: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  vehicle_id: string;
  user_id: string;
}

export interface Target {
  id: string;
  name: string;
  age_range: string | null;
  geolocation: any;
  behavior: string | null;
  description: string | null;
  user_id: string;
}

export interface BehavioralSegmentation {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
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
}

// Hook for Subdivisions
export function useSubdivisions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['subdivisions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_subdivisions')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Subdivision[];
    },
    enabled: !!user,
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

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plan_subdivisions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subdivisions'] });
      toast.success('Subdivisão removida!');
    },
  });

  return { ...query, create, update, remove };
}

// Hook for Moments
export function useMoments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['moments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('moments').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as Moment[];
    },
    enabled: !!user,
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
    mutationFn: async (id: string) => { const { error } = await supabase.from('moments').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['moments'] }); toast.success('Momento removido!'); },
  });

  return { ...query, create, update, remove };
}

// Hook for Funnel Stages
export function useFunnelStages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['funnel_stages', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('funnel_stages').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      return data as FunnelStage[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const maxOrder = query.data?.reduce((max, s) => Math.max(max, s.order_index), -1) ?? -1;
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
    mutationFn: async (id: string) => { const { error } = await supabase.from('funnel_stages').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funnel_stages'] }); toast.success('Fase do funil removida!'); },
  });

  return { ...query, create, update, remove };
}

// Hook for Mediums
export function useMediums() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mediums', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('mediums').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as Medium[];
    },
    enabled: !!user,
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
    mutationFn: async (id: string) => { const { error } = await supabase.from('mediums').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mediums'] }); toast.success('Meio removido!'); },
  });

  return { ...query, create, update, remove };
}

// Hook for Vehicles
export function useVehicles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vehicles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!user,
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
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase.from('vehicles').update({ name, description: description || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Veículo atualizado!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('vehicles').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Veículo removido!'); },
  });

  return { ...query, create, update, remove };
}

// Hook for Channels
export function useChannels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['channels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('channels').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as Channel[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async ({ name, description, vehicle_id }: { name: string; description?: string; vehicle_id: string }) => {
      const { data, error } = await supabase.from('channels').insert({ name, description: description || null, vehicle_id, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['channels'] }); toast.success('Canal criado!'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase.from('channels').update({ name, description: description || null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['channels'] }); toast.success('Canal atualizado!'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('channels').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['channels'] }); toast.success('Canal removido!'); },
  });

  return { ...query, create, update, remove };
}

// Hook for Behavioral Segmentations
export function useBehavioralSegmentations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['behavioral_segmentations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('behavioral_segmentations').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as BehavioralSegmentation[];
    },
    enabled: !!user,
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
    mutationFn: async (id: string) => { const { error } = await supabase.from('behavioral_segmentations').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['behavioral_segmentations'] }); toast.success('Segmentação comportamental removida!'); },
  });

  return { ...query, create, update, remove };
}

// Hook for Targets
export function useTargets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['targets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('targets').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as Target[];
    },
    enabled: !!user,
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
    mutationFn: async (id: string) => { const { error } = await supabase.from('targets').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['targets'] }); toast.success('Segmentação removida!'); },
  });

  return { ...query, create, update, remove };
}

// Hook for Creative Templates
export function useCreativeTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['creative_templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('creative_templates').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as CreativeTemplate[];
    },
    enabled: !!user,
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
    mutationFn: async (id: string) => { const { error } = await supabase.from('creative_templates').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['creative_templates'] }); toast.success('Criativo removido!'); },
  });

  return { ...query, create, update, remove };
}

// Hook for Media Plans with soft delete
export function useMediaPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const draftPlans = useQuery({
    queryKey: ['media_plans', 'draft', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_plans').select('*').is('deleted_at', null).eq('status', 'draft').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activePlans = useQuery({
    queryKey: ['media_plans', 'active', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_plans').select('*').is('deleted_at', null).eq('status', 'active').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const finishedPlans = useQuery({
    queryKey: ['media_plans', 'finished', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_plans').select('*').is('deleted_at', null).eq('status', 'completed').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const trashedPlans = useQuery({
    queryKey: ['media_plans', 'trashed', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('media_plans').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
