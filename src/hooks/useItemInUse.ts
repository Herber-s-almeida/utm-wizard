import { supabase } from '@/integrations/supabase/client';

export type ConfigTableName = 
  | 'plan_subdivisions'
  | 'moments'
  | 'funnel_stages'
  | 'mediums'
  | 'vehicles'
  | 'channels'
  | 'targets'
  | 'formats'
  | 'statuses'
  | 'creative_templates';

async function countMediaLinesWithColumn(column: string, itemId: string): Promise<number> {
  // Use a raw filter to avoid TypeScript issues with dynamic column names
  const { count, error } = await supabase
    .from('media_lines')
    .select('id', { count: 'exact', head: true })
    .filter(column, 'eq', itemId);
  
  if (error) {
    console.error(`Error counting media_lines with ${column}:`, error);
    return 0;
  }
  
  return count || 0;
}

export async function checkItemInUse(tableName: ConfigTableName, itemId: string): Promise<{ inUse: boolean; count: number }> {
  try {
    // Special case for formats - check media_creatives instead
    if (tableName === 'formats') {
      const { count, error } = await supabase
        .from('media_creatives')
        .select('id', { count: 'exact', head: true })
        .eq('format_id', itemId);
      
      if (error) throw error;
      return { inUse: (count || 0) > 0, count: count || 0 };
    }
    
    // Special case for vehicles - also check channels
    if (tableName === 'vehicles') {
      const [linesCount, channelsResult] = await Promise.all([
        countMediaLinesWithColumn('vehicle_id', itemId),
        supabase
          .from('channels')
          .select('id', { count: 'exact', head: true })
          .eq('vehicle_id', itemId)
          .is('deleted_at', null)
      ]);
      
      const channelsCount = channelsResult.count || 0;
      const totalCount = linesCount + channelsCount;
      
      return { inUse: totalCount > 0, count: totalCount };
    }
    
    // Special case for mediums - also check vehicles
    if (tableName === 'mediums') {
      const [linesCount, vehiclesResult] = await Promise.all([
        countMediaLinesWithColumn('medium_id', itemId),
        supabase
          .from('vehicles')
          .select('id', { count: 'exact', head: true })
          .eq('medium_id', itemId)
          .is('deleted_at', null)
      ]);
      
      const vehiclesCount = vehiclesResult.count || 0;
      const totalCount = linesCount + vehiclesCount;
      
      return { inUse: totalCount > 0, count: totalCount };
    }
    
    // Special case for statuses - also check status_transitions
    if (tableName === 'statuses') {
      const [linesCount, transitionsFromResult, transitionsToResult] = await Promise.all([
        countMediaLinesWithColumn('status_id', itemId),
        supabase
          .from('status_transitions')
          .select('id', { count: 'exact', head: true })
          .eq('from_status_id', itemId),
        supabase
          .from('status_transitions')
          .select('id', { count: 'exact', head: true })
          .eq('to_status_id', itemId)
      ]);
      
      const transitionsCount = (transitionsFromResult.count || 0) + (transitionsToResult.count || 0);
      const totalCount = linesCount + transitionsCount;
      
      return { inUse: totalCount > 0, count: totalCount };
    }
    
    // Map table names to their reference column in media_lines
    const columnMap: Record<string, string> = {
      plan_subdivisions: 'subdivision_id',
      moments: 'moment_id',
      funnel_stages: 'funnel_stage_id',
      channels: 'channel_id',
      targets: 'target_id',
      creative_templates: 'creative_template_id',
    };
    
    const column = columnMap[tableName];
    
    if (!column) {
      return { inUse: false, count: 0 };
    }
    
    const count = await countMediaLinesWithColumn(column, itemId);
    return { inUse: count > 0, count };
  } catch (error) {
    console.error(`Error checking ${tableName} usage:`, error);
    return { inUse: false, count: 0 };
  }
}
