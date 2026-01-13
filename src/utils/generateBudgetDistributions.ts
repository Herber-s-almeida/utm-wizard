import { supabase } from '@/integrations/supabase/client';
import { HierarchyLevel } from '@/types/hierarchy';

export interface MediaLineForDistribution {
  id: string;
  budget: number | null;
  subdivision_id: string | null;
  moment_id: string | null;
  funnel_stage_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface DistributionInsert {
  media_plan_id: string;
  user_id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

function getLineRefForLevel(line: MediaLineForDistribution, level: HierarchyLevel): string | null {
  switch (level) {
    case 'subdivision': return line.subdivision_id;
    case 'moment': return line.moment_id;
    case 'funnel_stage': return line.funnel_stage_id;
    default: return null;
  }
}

/**
 * Generate budget distributions from existing media lines.
 * This creates the plan_budget_distributions entries needed for hierarchical display.
 * 
 * @param planId - The media plan ID
 * @param userId - The user ID
 * @param hierarchyOrder - The order of hierarchy levels (e.g., ['subdivision', 'moment', 'funnel_stage'])
 * @param lines - The media lines to generate distributions from
 * @param totalBudget - The total budget of the plan (for percentage calculations)
 * @param clearExisting - Whether to clear existing distributions first (default: true)
 */
export async function generateBudgetDistributionsFromLines({
  planId,
  userId,
  hierarchyOrder,
  lines,
  totalBudget,
  clearExisting = true,
}: {
  planId: string;
  userId: string;
  hierarchyOrder: HierarchyLevel[];
  lines: MediaLineForDistribution[];
  totalBudget: number;
  clearExisting?: boolean;
}): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    // If no hierarchy defined or no lines, nothing to do
    if (hierarchyOrder.length === 0) {
      return { success: true, count: 0 };
    }

    // Clear existing distributions if requested
    if (clearExisting) {
      const { error: deleteError } = await supabase
        .from('plan_budget_distributions')
        .delete()
        .eq('media_plan_id', planId);
      
      if (deleteError) {
        console.error('Error clearing existing distributions:', deleteError);
        return { success: false, error: 'Erro ao limpar distribuições existentes' };
      }
    }

    const distributions: DistributionInsert[] = [];
    
    // Map to track created distributions for parent references
    // Key: `${level}_${refId}` or `${level}_${refId}_parent_${parentDistKey}`
    const distributionKeyToId: Map<string, string> = new Map();
    
    // Build groups recursively
    // For each level, we group by all ancestor levels + current level
    
    // Level 0: Group by first hierarchy level
    const level0 = hierarchyOrder[0];
    const level0Groups = new Map<string | null, {
      budget: number;
      startDate: string | null;
      endDate: string | null;
      lines: MediaLineForDistribution[];
    }>();
    
    for (const line of lines) {
      const refId = getLineRefForLevel(line, level0);
      const existing = level0Groups.get(refId);
      const lineBudget = Number(line.budget) || 0;
      
      if (existing) {
        existing.budget += lineBudget;
        existing.lines.push(line);
        // Update date range
        if (line.start_date && (!existing.startDate || line.start_date < existing.startDate)) {
          existing.startDate = line.start_date;
        }
        if (line.end_date && (!existing.endDate || line.end_date > existing.endDate)) {
          existing.endDate = line.end_date;
        }
      } else {
        level0Groups.set(refId, {
          budget: lineBudget,
          startDate: line.start_date,
          endDate: line.end_date,
          lines: [line],
        });
      }
    }
    
    // Create level 0 distributions
    for (const [refId, group] of level0Groups) {
      const key = `${level0}_${refId ?? 'null'}`;
      const tempId = crypto.randomUUID();
      distributionKeyToId.set(key, tempId);
      
      distributions.push({
        media_plan_id: planId,
        user_id: userId,
        distribution_type: level0,
        reference_id: refId,
        percentage: totalBudget > 0 ? (group.budget / totalBudget) * 100 : 0,
        amount: group.budget,
        parent_distribution_id: null,
        start_date: level0 === 'moment' ? group.startDate : null,
        end_date: level0 === 'moment' ? group.endDate : null,
      });
    }
    
    // Level 1: Group by first + second hierarchy level
    if (hierarchyOrder.length >= 2) {
      const level1 = hierarchyOrder[1];
      
      for (const [level0RefId, level0Group] of level0Groups) {
        const level1Groups = new Map<string | null, {
          budget: number;
          startDate: string | null;
          endDate: string | null;
          lines: MediaLineForDistribution[];
        }>();
        
        for (const line of level0Group.lines) {
          const refId = getLineRefForLevel(line, level1);
          const existing = level1Groups.get(refId);
          const lineBudget = Number(line.budget) || 0;
          
          if (existing) {
            existing.budget += lineBudget;
            existing.lines.push(line);
            if (line.start_date && (!existing.startDate || line.start_date < existing.startDate)) {
              existing.startDate = line.start_date;
            }
            if (line.end_date && (!existing.endDate || line.end_date > existing.endDate)) {
              existing.endDate = line.end_date;
            }
          } else {
            level1Groups.set(refId, {
              budget: lineBudget,
              startDate: line.start_date,
              endDate: line.end_date,
              lines: [line],
            });
          }
        }
        
        // Create level 1 distributions
        const parentKey = `${level0}_${level0RefId ?? 'null'}`;
        const parentBudget = level0Group.budget;
        
        for (const [refId, group] of level1Groups) {
          const key = `${level1}_${refId ?? 'null'}_parent_${parentKey}`;
          const tempId = crypto.randomUUID();
          distributionKeyToId.set(key, tempId);
          
          distributions.push({
            media_plan_id: planId,
            user_id: userId,
            distribution_type: level1,
            reference_id: refId,
            percentage: parentBudget > 0 ? (group.budget / parentBudget) * 100 : 0,
            amount: group.budget,
            parent_distribution_id: distributionKeyToId.get(parentKey) || null,
            start_date: level1 === 'moment' ? group.startDate : null,
            end_date: level1 === 'moment' ? group.endDate : null,
          });
        }
        
        // Level 2: Group by all three hierarchy levels
        if (hierarchyOrder.length >= 3) {
          const level2 = hierarchyOrder[2];
          
          for (const [level1RefId, level1Group] of level1Groups) {
            const level2Groups = new Map<string | null, {
              budget: number;
              startDate: string | null;
              endDate: string | null;
            }>();
            
            for (const line of level1Group.lines) {
              const refId = getLineRefForLevel(line, level2);
              const existing = level2Groups.get(refId);
              const lineBudget = Number(line.budget) || 0;
              
              if (existing) {
                existing.budget += lineBudget;
                if (line.start_date && (!existing.startDate || line.start_date < existing.startDate)) {
                  existing.startDate = line.start_date;
                }
                if (line.end_date && (!existing.endDate || line.end_date > existing.endDate)) {
                  existing.endDate = line.end_date;
                }
              } else {
                level2Groups.set(refId, {
                  budget: lineBudget,
                  startDate: line.start_date,
                  endDate: line.end_date,
                });
              }
            }
            
            // Create level 2 distributions
            const level1ParentKey = `${level1}_${level1RefId ?? 'null'}_parent_${parentKey}`;
            const level1ParentBudget = level1Group.budget;
            
            for (const [refId, group] of level2Groups) {
              distributions.push({
                media_plan_id: planId,
                user_id: userId,
                distribution_type: level2,
                reference_id: refId,
                percentage: level1ParentBudget > 0 ? (group.budget / level1ParentBudget) * 100 : 0,
                amount: group.budget,
                parent_distribution_id: distributionKeyToId.get(level1ParentKey) || null,
                start_date: level2 === 'moment' ? group.startDate : null,
                end_date: level2 === 'moment' ? group.endDate : null,
              });
            }
          }
        }
      }
    }
    
    if (distributions.length === 0) {
      return { success: true, count: 0 };
    }
    
    // We need to insert in order to get real IDs and update parent references
    // First pass: insert level 0 distributions
    const level0Dists = distributions.filter(d => d.parent_distribution_id === null);
    const level1Dists = distributions.filter(d => {
      const parentKey = Array.from(distributionKeyToId.entries())
        .find(([k, v]) => v === d.parent_distribution_id && !k.includes('_parent_'));
      return parentKey !== undefined;
    });
    const level2Dists = distributions.filter(d => {
      const parentKey = Array.from(distributionKeyToId.entries())
        .find(([k, v]) => v === d.parent_distribution_id && k.includes('_parent_'));
      return parentKey !== undefined;
    });
    
    // Insert level 0
    const { data: insertedLevel0, error: level0Error } = await supabase
      .from('plan_budget_distributions')
      .insert(level0Dists.map(d => ({ ...d, parent_distribution_id: null })))
      .select('id, distribution_type, reference_id');
    
    if (level0Error) {
      console.error('Error inserting level 0 distributions:', level0Error);
      return { success: false, error: 'Erro ao criar distribuições nível 0' };
    }
    
    // Build real ID map for level 0
    const realIdMap = new Map<string, string>();
    for (const inserted of insertedLevel0 || []) {
      const key = `${inserted.distribution_type}_${inserted.reference_id ?? 'null'}`;
      realIdMap.set(key, inserted.id);
    }
    
    // Insert level 1 with real parent IDs
    if (level1Dists.length > 0) {
      const level1WithRealParents = level1Dists.map(d => {
        // Find the temp parent ID and get the real one
        const tempParentId = d.parent_distribution_id;
        const parentKeyEntry = Array.from(distributionKeyToId.entries())
          .find(([k, v]) => v === tempParentId);
        const parentKey = parentKeyEntry?.[0];
        const realParentId = parentKey ? realIdMap.get(parentKey) : null;
        
        return { ...d, parent_distribution_id: realParentId };
      });
      
      const { data: insertedLevel1, error: level1Error } = await supabase
        .from('plan_budget_distributions')
        .insert(level1WithRealParents)
        .select('id, distribution_type, reference_id, parent_distribution_id');
      
      if (level1Error) {
        console.error('Error inserting level 1 distributions:', level1Error);
        return { success: false, error: 'Erro ao criar distribuições nível 1' };
      }
      
      // Build real ID map for level 1
      for (const inserted of insertedLevel1 || []) {
        // Find the original temp ID by matching the parent and reference
        for (const [key, tempId] of distributionKeyToId) {
          if (key.includes('_parent_')) {
            const [levelAndRef, parentPart] = key.split('_parent_');
            const [level, refId] = levelAndRef.split('_');
            const realRefId = refId === 'null' ? null : refId;
            const realParentId = realIdMap.get(parentPart);
            
            if (inserted.distribution_type === level && 
                inserted.reference_id === realRefId &&
                inserted.parent_distribution_id === realParentId) {
              realIdMap.set(key, inserted.id);
              break;
            }
          }
        }
      }
      
      // Insert level 2 with real parent IDs
      if (level2Dists.length > 0) {
        const level2WithRealParents = level2Dists.map(d => {
          const tempParentId = d.parent_distribution_id;
          const parentKeyEntry = Array.from(distributionKeyToId.entries())
            .find(([k, v]) => v === tempParentId);
          const parentKey = parentKeyEntry?.[0];
          const realParentId = parentKey ? realIdMap.get(parentKey) : null;
          
          return { ...d, parent_distribution_id: realParentId };
        });
        
        const { error: level2Error } = await supabase
          .from('plan_budget_distributions')
          .insert(level2WithRealParents);
        
        if (level2Error) {
          console.error('Error inserting level 2 distributions:', level2Error);
          return { success: false, error: 'Erro ao criar distribuições nível 2' };
        }
      }
    }
    
    return { success: true, count: distributions.length };
  } catch (error) {
    console.error('Error generating budget distributions:', error);
    return { success: false, error: (error as Error).message };
  }
}
