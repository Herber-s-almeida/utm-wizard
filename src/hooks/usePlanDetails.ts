import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Json } from '@/integrations/supabase/types';
import { FieldSchemaItem, MetadataSchemaItem } from './useLineDetailTypes';

export interface PlanDetailLink {
  id: string;
  line_detail_id: string;
  media_line_id: string;
  is_primary: boolean;
  allocated_percentage: number;
  allocated_amount: number | null;
  media_line?: {
    id: string;
    line_code: string | null;
    platform: string | null;
    budget: number | null;
    vehicle_id: string | null;
    medium_id: string | null;
  };
}

export interface PlanDetailItem {
  id: string;
  line_detail_id: string;
  data: Record<string, unknown>;
  total_insertions: number;
  total_gross: number;
  total_net: number;
}

export interface PlanDetail {
  id: string;
  media_plan_id: string;
  detail_type_id: string;
  name: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  inherited_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  detail_type?: {
    id: string;
    name: string;
    slug: string | null;
    icon: string | null;
    field_schema: FieldSchemaItem[];
    metadata_schema: MetadataSchemaItem[];
    has_insertion_grid: boolean;
    insertion_grid_type: string;
  };
  links: PlanDetailLink[];
  items: PlanDetailItem[];
  // Computed
  total_net: number;
  linked_lines_count: number;
  is_shared: boolean;
}

export interface DetailsByType {
  typeId: string;
  typeName: string;
  typeIcon: string | null;
  details: PlanDetail[];
  totalNet: number;
  totalItems: number;
  totalInsertions: number;
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

export function usePlanDetails(planId: string | undefined) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['plan-details', planId],
    queryFn: async () => {
      if (!planId) return [];

      // Fetch all details for the plan
      const { data: details, error: detailsError } = await supabase
        .from('line_details')
        .select('*')
        .eq('media_plan_id', planId)
        .order('created_at');

      if (detailsError) throw detailsError;
      if (!details || details.length === 0) return [];

      const detailIds = details.map(d => d.id);

      // Fetch detail types
      const detailTypeIds = [...new Set(details.map(d => d.detail_type_id))];
      const { data: types, error: typesError } = await supabase
        .from('line_detail_types')
        .select('*')
        .in('id', detailTypeIds);

      if (typesError) throw typesError;

      // Fetch all links
      const { data: links, error: linksError } = await supabase
        .from('line_detail_line_links')
        .select(`
          *,
          media_line:media_lines(
            id,
            line_code,
            platform,
            budget,
            vehicle_id,
            medium_id
          )
        `)
        .in('line_detail_id', detailIds);

      if (linksError) throw linksError;

      // Fetch all items
      const { data: items, error: itemsError } = await supabase
        .from('line_detail_items')
        .select('id, line_detail_id, data, total_insertions, total_gross, total_net')
        .in('line_detail_id', detailIds)
        .eq('is_active', true);

      if (itemsError) throw itemsError;

      // Combine data
      return details.map(detail => {
        const detailType = types?.find(t => t.id === detail.detail_type_id);
        const detailLinks = (links || []).filter(l => l.line_detail_id === detail.id) as PlanDetailLink[];
        const detailItems = (items || [])
          .filter(i => i.line_detail_id === detail.id)
          .map(item => ({
            ...item,
            data: parseJson(item.data as Json),
          })) as PlanDetailItem[];

        const totalNet = detailItems.reduce((sum, item) => sum + (item.total_net || 0), 0);

        return {
          id: detail.id,
          media_plan_id: detail.media_plan_id,
          detail_type_id: detail.detail_type_id,
          name: detail.name,
          notes: detail.notes,
          metadata: parseJson(detail.metadata as Json),
          inherited_context: parseJson(detail.inherited_context as Json),
          created_at: detail.created_at,
          updated_at: detail.updated_at,
          detail_type: detailType ? {
            id: detailType.id,
            name: detailType.name,
            slug: detailType.slug,
            icon: detailType.icon,
            field_schema: parseFieldSchema(detailType.field_schema as Json),
            metadata_schema: parseMetadataSchema(detailType.metadata_schema as Json),
            has_insertion_grid: detailType.has_insertion_grid,
            insertion_grid_type: detailType.insertion_grid_type,
          } : undefined,
          links: detailLinks,
          items: detailItems,
          total_net: totalNet,
          linked_lines_count: detailLinks.length,
          is_shared: detailLinks.length > 1,
        } as PlanDetail;
      });
    },
    enabled: !!planId && !!user?.id,
  });

  // Group by type
  const detailsByType: DetailsByType[] = [];
  if (query.data) {
    const typeMap = new Map<string, PlanDetail[]>();
    
    query.data.forEach(detail => {
      const typeId = detail.detail_type_id;
      if (!typeMap.has(typeId)) {
        typeMap.set(typeId, []);
      }
      typeMap.get(typeId)!.push(detail);
    });

    typeMap.forEach((details, typeId) => {
      const firstDetail = details[0];
      const typeName = firstDetail.detail_type?.name || 'Sem tipo';
      const typeIcon = firstDetail.detail_type?.icon || null;

      const totalNet = details.reduce((sum, d) => sum + d.total_net, 0);
      const totalItems = details.reduce((sum, d) => sum + d.items.length, 0);
      const totalInsertions = details.reduce((sum, d) => 
        sum + d.items.reduce((iSum, item) => iSum + (item.total_insertions || 0), 0), 0
      );

      detailsByType.push({
        typeId,
        typeName,
        typeIcon,
        details,
        totalNet,
        totalItems,
        totalInsertions,
      });
    });
  }

  // Get details linked to a specific line
  const getDetailsForLine = (lineId: string): PlanDetail[] => {
    if (!query.data) return [];
    return query.data.filter(detail => 
      detail.links.some(link => link.media_line_id === lineId)
    );
  };

  // Calculate totals
  const totalNet = query.data?.reduce((sum, d) => sum + d.total_net, 0) || 0;
  const sharedDetailsCount = query.data?.filter(d => d.is_shared).length || 0;

  return {
    details: query.data || [],
    detailsByType,
    isLoading: query.isLoading,
    error: query.error,
    getDetailsForLine,
    totalNet,
    sharedDetailsCount,
    refetch: query.refetch,
  };
}
