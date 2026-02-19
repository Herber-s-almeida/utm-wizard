import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { toast } from 'sonner';
import { LineDetailType, FieldSchemaItem, MetadataSchemaItem } from './useLineDetailTypes';
import { Json } from '@/integrations/supabase/types';

export interface LineDetailInsertion {
  id: string;
  line_detail_item_id: string;
  user_id: string;
  insertion_date: string;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export interface LineDetailItem {
  id: string;
  line_detail_id: string;
  user_id: string;
  data: Record<string, unknown>;
  total_insertions: number;
  total_gross: number;
  total_net: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  insertions?: LineDetailInsertion[];
}

export interface LineDetail {
  id: string;
  media_line_id: string | null; // Deprecado - usar links
  media_plan_id: string;
  detail_type_id: string;
  user_id: string;
  name: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  inherited_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  detail_type?: LineDetailType;
  items?: LineDetailItem[];
}

// Helper to parse JSONB
function parseJson(data: Json | null): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return data as Record<string, unknown>;
}

function parseFieldSchema(data: Json | null): FieldSchemaItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as FieldSchemaItem[];
}

function parseMetadataSchema(data: Json | null): MetadataSchemaItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as MetadataSchemaItem[];
}

export function useLineDetails(mediaLineId: string | undefined, planId?: string) {
  const { user } = useAuth();
  const { currentEnvironmentId } = useEnvironment();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['line-details', mediaLineId],
    queryFn: async () => {
      if (!mediaLineId) return [];

      // First, get detail IDs linked to this line via the junction table
      const { data: links, error: linksError } = await supabase
        .from('line_detail_line_links')
        .select('line_detail_id')
        .eq('media_line_id', mediaLineId);

      if (linksError) throw linksError;
      
      const detailIds = (links || []).map(l => l.line_detail_id);
      if (detailIds.length === 0) return [];

      // Fetch details by IDs
      const { data: details, error: detailsError } = await supabase
        .from('line_details')
        .select('*')
        .in('id', detailIds)
        .order('created_at');

      if (detailsError) throw detailsError;
      if (!details || details.length === 0) return [];

      // Fetch detail types
      const detailTypeIds = [...new Set(details.map(d => d.detail_type_id))];
      const { data: types, error: typesError } = await supabase
        .from('line_detail_types')
        .select('*')
        .in('id', detailTypeIds);

      if (typesError) throw typesError;

      // Fetch items for all details
      const { data: items, error: itemsError } = await supabase
        .from('line_detail_items')
        .select('*')
        .in('line_detail_id', detailIds)
        .eq('is_active', true)
        .order('sort_order');

      if (itemsError) throw itemsError;

      // Fetch insertions for all items
      const itemIds = (items || []).map(i => i.id);
      let insertions: LineDetailInsertion[] = [];
      if (itemIds.length > 0) {
        const { data: insertionsData, error: insertionsError } = await supabase
          .from('line_detail_insertions')
          .select('*')
          .in('line_detail_item_id', itemIds)
          .order('insertion_date');

        if (insertionsError) throw insertionsError;
        insertions = (insertionsData || []) as LineDetailInsertion[];
      }

      // Combine all data
      return details.map(detail => {
        const detailType = types?.find(t => t.id === detail.detail_type_id);
        const detailItems = (items || [])
          .filter(i => i.line_detail_id === detail.id)
          .map(item => ({
            ...item,
            data: parseJson(item.data as Json),
            insertions: insertions.filter(ins => ins.line_detail_item_id === item.id),
          })) as LineDetailItem[];

        return {
          ...detail,
          metadata: parseJson(detail.metadata as Json),
          inherited_context: parseJson(detail.inherited_context as Json),
          detail_type: detailType ? {
            ...detailType,
            field_schema: parseFieldSchema(detailType.field_schema as Json),
            metadata_schema: parseMetadataSchema(detailType.metadata_schema as Json),
          } as LineDetailType : undefined,
          items: detailItems,
        } as LineDetail;
      });
    },
    enabled: !!mediaLineId && !!user?.id,
    staleTime: 30000, // 30s to prevent refetches on remount
  });

  const createDetailMutation = useMutation({
    mutationFn: async (data: { 
      detail_type_id: string; 
      name?: string; 
      metadata?: Record<string, unknown>;
      inherited_context?: Record<string, unknown>;
    }) => {
      if (!user?.id || !mediaLineId || !currentEnvironmentId) throw new Error('User or line not found');

      // Fetch complete line data for inherited context
      const { data: lineData, error: lineError } = await supabase
        .from('media_lines')
        .select(`
          id,
          media_plan_id,
          line_code,
          budget,
          platform,
          format,
          vehicle_id,
          medium_id,
          channel_id,
          subdivision_id,
          moment_id,
          funnel_stage_id,
          target_id,
          vehicles:vehicle_id(id, name),
          mediums:medium_id(id, name),
          channels:channel_id(id, name),
          subdivisions:subdivision_id(id, name),
          moments:moment_id(id, name),
          funnel_stages:funnel_stage_id(id, name),
          targets:target_id(id, name)
        `)
        .eq('id', mediaLineId)
        .single();
      
      if (lineError || !lineData) throw new Error('Could not find media line');
      
      const mediaPlanId = planId || lineData.media_plan_id;
      
      // Build comprehensive inherited context from line data
      const inheritedContext: Record<string, unknown> = {
        // IDs for potential queries
        vehicle_id: lineData.vehicle_id,
        medium_id: lineData.medium_id,
        channel_id: lineData.channel_id,
        subdivision_id: lineData.subdivision_id,
        moment_id: lineData.moment_id,
        funnel_stage_id: lineData.funnel_stage_id,
        target_id: lineData.target_id,
        // Names for display
        line_code: lineData.line_code,
        line_budget: lineData.budget,
        platform: lineData.platform,
        format_name: lineData.format,
        vehicle_name: (lineData.vehicles as any)?.name,
        medium_name: (lineData.mediums as any)?.name,
        channel_name: (lineData.channels as any)?.name,
        subdivision_name: (lineData.subdivisions as any)?.name,
        moment_name: (lineData.moments as any)?.name,
        funnel_stage_name: (lineData.funnel_stages as any)?.name,
        target_name: (lineData.targets as any)?.name,
        // Merge any additional context passed in
        ...data.inherited_context,
      };

      // Create the detail
      const { data: result, error } = await supabase
        .from('line_details')
        .insert({
          media_plan_id: mediaPlanId,
          media_line_id: mediaLineId, // Keep for retrocompatibility
          detail_type_id: data.detail_type_id,
          user_id: user.id,
          environment_id: currentEnvironmentId,
          name: data.name || null,
          metadata: (data.metadata || {}) as Json,
          inherited_context: inheritedContext as Json,
        })
        .select()
        .single();

      if (error) throw error;

      // Create the link with is_primary = true
      const { error: linkError } = await supabase
        .from('line_detail_line_links')
        .insert({
          line_detail_id: result.id,
          media_line_id: mediaLineId,
          is_primary: true,
          allocated_percentage: 100.00,
          user_id: user.id,
          environment_id: currentEnvironmentId,
        });

      if (linkError) {
        // Rollback - delete the detail
        await supabase.from('line_details').delete().eq('id', result.id);
        throw linkError;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-details', mediaLineId] });
      queryClient.invalidateQueries({ queryKey: ['plan-details'] });
      queryClient.invalidateQueries({ queryKey: ['line-detail-links'] });
      toast.success('Detalhamento criado');
    },
    onError: (error) => {
      console.error('Error creating detail:', error);
      toast.error('Erro ao criar detalhamento');
    },
  });

  const updateDetailMutation = useMutation({
    mutationFn: async ({ id, metadata, inherited_context, ...rest }: Partial<LineDetail> & { id: string }) => {
      const updateData: Record<string, unknown> = {
        ...rest,
        updated_at: new Date().toISOString(),
      };
      if (metadata !== undefined) {
        updateData.metadata = metadata as Json;
      }
      if (inherited_context !== undefined) {
        updateData.inherited_context = inherited_context as Json;
      }
      // Remove computed fields
      delete updateData.detail_type;
      delete updateData.items;
      
      const { error } = await supabase
        .from('line_details')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-details', mediaLineId] });
      queryClient.invalidateQueries({ queryKey: ['plan-details'] });
    },
  });

  const deleteDetailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('line_details')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-details', mediaLineId] });
      toast.success('Detalhamento excluído');
    },
    onError: (error) => {
      console.error('Error deleting detail:', error);
      toast.error('Erro ao excluir detalhamento');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (input: { line_detail_id: string; data: Record<string, unknown> }) => {
      if (!user?.id || !currentEnvironmentId) throw new Error('User not found');

      // Extract actual DB columns from data
      const { status_id, format_id, creative_id, days_of_week, period_start, period_end, ...jsonData } = input.data;

      const { data: result, error } = await supabase
        .from('line_detail_items')
        .insert({
          line_detail_id: input.line_detail_id,
          user_id: user.id,
          environment_id: currentEnvironmentId,
          data: jsonData as Json,
          status_id: (status_id as string) || null,
          format_id: (format_id as string) || null,
          creative_id: (creative_id as string) || null,
          days_of_week: (days_of_week as string[]) || null,
          period_start: (period_start as string) || null,
          period_end: (period_end as string) || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-details', mediaLineId] });
      toast.success('Item adicionado');
    },
    onError: (error) => {
      console.error('Error creating item:', error);
      toast.error('Erro ao adicionar item');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data, insertions, ...rest }: Partial<LineDetailItem> & { id: string }) => {
      const updateData: Record<string, unknown> = {
        ...rest,
        updated_at: new Date().toISOString(),
      };

      // Extract actual DB columns from data if present
      if (data !== undefined) {
        const { status_id, format_id, creative_id, days_of_week, period_start, period_end, ...jsonData } = data;
        updateData.data = jsonData as Json;
        // Only set actual columns if they were provided
        if (status_id !== undefined) updateData.status_id = (status_id as string) || null;
        if (format_id !== undefined) updateData.format_id = (format_id as string) || null;
        if (creative_id !== undefined) updateData.creative_id = (creative_id as string) || null;
        if (days_of_week !== undefined) updateData.days_of_week = (days_of_week as string[]) || null;
        if (period_start !== undefined) updateData.period_start = (period_start as string) || null;
        if (period_end !== undefined) updateData.period_end = (period_end as string) || null;
      }

      // Remove computed fields
      delete updateData.insertions;
      
      const { error } = await supabase
        .from('line_detail_items')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-details', mediaLineId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('line_detail_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-details', mediaLineId] });
      toast.success('Item removido');
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover item');
    },
  });

  const upsertInsertionsMutation = useMutation({
    mutationFn: async (input: { item_id: string; insertions: { date: string; quantity: number }[] }) => {
      if (!user?.id || !currentEnvironmentId) throw new Error('User not found');

      // Delete existing insertions for this item
      await supabase
        .from('line_detail_insertions')
        .delete()
        .eq('line_detail_item_id', input.item_id);

      // Insert new ones (only non-zero quantities)
      const toInsert = input.insertions
        .filter(i => i.quantity > 0)
        .map(i => ({
          line_detail_item_id: input.item_id,
          user_id: user.id,
          environment_id: currentEnvironmentId,
          insertion_date: i.date,
          quantity: i.quantity,
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('line_detail_insertions')
          .insert(toInsert);

        if (error) throw error;
      }

      // Update item total
      const totalInsertions = input.insertions.reduce((sum, i) => sum + i.quantity, 0);
      await supabase
        .from('line_detail_items')
        .update({ total_insertions: totalInsertions })
        .eq('id', input.item_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['line-details', mediaLineId] });
    },
  });

  // Calculate totals for budget validation
  const totalNet = query.data?.reduce((sum, detail) => {
    const detailTotal = (detail.items || []).reduce((itemSum, item) => {
      return itemSum + (item.total_net || 0);
    }, 0);
    return sum + detailTotal;
  }, 0) || 0;

  const detailsCount = query.data?.length || 0;
  const itemsCount = query.data?.reduce((sum, d) => sum + (d.items?.length || 0), 0) || 0;

  return {
    details: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    totalNet,
    detailsCount,
    itemsCount,
    createDetail: createDetailMutation.mutateAsync,
    updateDetail: updateDetailMutation.mutateAsync,
    deleteDetail: deleteDetailMutation.mutateAsync,
    createItem: createItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    upsertInsertions: upsertInsertionsMutation.mutateAsync,
    refetch: query.refetch,
  };
}

// Hook to count details for multiple lines (for table badges)
// Now uses the junction table for N:N relationships
export function useLineDetailsCount(lineIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['line-details-count', lineIds],
    queryFn: async () => {
      if (lineIds.length === 0) return {};

      // Query the junction table to count linked details per line
      const { data, error } = await supabase
        .from('line_detail_line_links')
        .select('media_line_id')
        .in('media_line_id', lineIds);

      if (error) throw error;

      // Count per line
      const counts: Record<string, number> = {};
      (data || []).forEach(d => {
        counts[d.media_line_id] = (counts[d.media_line_id] || 0) + 1;
      });

      return counts;
    },
    enabled: lineIds.length > 0 && !!user?.id,
  });
}
