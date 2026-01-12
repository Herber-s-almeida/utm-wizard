import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaxonomyCreative {
  id: string;
  name: string;
  creative_id: string | null;
  copy_text: string | null;
  message_slug: string | null;
  format: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
}

export interface TaxonomyLine {
  id: string;
  line_code: string | null;
  platform: string;
  destination_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  utm_validated: boolean | null;
  utm_validated_at: string | null;
  utm_validated_by: string | null;
  vehicle: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  channel: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  subdivision: {
    name: string;
    slug: string | null;
  } | null;
  moment: {
    name: string;
    slug: string | null;
  } | null;
  funnel_stage_ref: {
    name: string;
    slug: string | null;
  } | null;
  format: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  creatives: TaxonomyCreative[];
}

export function useTaxonomyData(planId: string) {
  return useQuery({
    queryKey: ['taxonomy_data', planId],
    queryFn: async () => {
      // Fetch media lines with related data
      const { data: lines, error: linesError } = await supabase
        .from('media_lines')
        .select(`
          id,
          line_code,
          platform,
          format,
          destination_url,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          utm_validated,
          utm_validated_at,
          utm_validated_by,
          vehicle:vehicles!vehicle_id(id, name, slug),
          channel:channels!channel_id(id, name, slug),
          subdivision:plan_subdivisions!subdivision_id(name, slug),
          moment:moments!moment_id(name, slug),
          funnel_stage_ref:funnel_stages!funnel_stage_id(name, slug)
        `)
        .eq('media_plan_id', planId)
        .order('line_code', { ascending: true });

      if (linesError) throw linesError;

      // Fetch creatives for these lines with format info
      const lineIds = lines?.map(l => l.id) || [];
      
      let creatives: any[] = [];
      if (lineIds.length > 0) {
        const { data: creativesData, error: creativesError } = await supabase
          .from('media_creatives')
          .select(`
            id, 
            name, 
            creative_id, 
            media_line_id,
            copy_text,
            message_slug,
            format:formats!format_id(id, name, slug)
          `)
          .in('media_line_id', lineIds);
        
        if (creativesError) throw creativesError;
        creatives = creativesData || [];
      }

      // Map creatives to lines
      const result: TaxonomyLine[] = (lines || []).map(line => ({
        ...line,
        vehicle: line.vehicle as TaxonomyLine['vehicle'],
        channel: line.channel as TaxonomyLine['channel'],
        subdivision: line.subdivision as TaxonomyLine['subdivision'],
        moment: line.moment as TaxonomyLine['moment'],
        funnel_stage_ref: line.funnel_stage_ref as TaxonomyLine['funnel_stage_ref'],
        format: null, // Line format is stored as string, not relation
        creatives: creatives
          .filter(c => c.media_line_id === line.id)
          .map(c => ({
            id: c.id,
            name: c.name,
            creative_id: c.creative_id,
            copy_text: c.copy_text,
            message_slug: c.message_slug,
            format: c.format as TaxonomyCreative['format'],
          })),
      }));

      return result;
    },
    enabled: !!planId,
  });
}
