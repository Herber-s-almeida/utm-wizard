/**
 * Utility functions to build hierarchical budget data dynamically based on hierarchy order.
 * Supports any order of subdivision, moment, and funnel_stage levels.
 */

import { HierarchyLevel, DEFAULT_HIERARCHY_ORDER, getLevelLabel, getLevelLabelPlural } from '@/types/hierarchy';

// Generic node representing any level in the hierarchy
export interface HierarchyNodeData {
  id: string | null;
  distId: string;
  name: string;
  planned: number;
  allocated: number;
  percentage: number;
  level: HierarchyLevel;
  parentDistId: string | null;
}

// Recursive tree structure for any depth
export interface HierarchyTreeNode {
  data: HierarchyNodeData;
  children: HierarchyTreeNode[];
}

// Budget distribution from database
export interface BudgetDistribution {
  id: string;
  distribution_type: string;
  reference_id: string | null;
  percentage: number;
  amount: number;
  parent_distribution_id: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

// Media line with hierarchy references
export interface MediaLineRef {
  id: string;
  budget: number | null;
  subdivision_id: string | null;
  moment_id: string | null;
  funnel_stage_id: string | null;
}

// Name resolver function type
export type NameResolver = (level: HierarchyLevel, refId: string | null) => string;

/**
 * Get the line's reference ID for a specific hierarchy level
 */
function getLineRefId(line: MediaLineRef, level: HierarchyLevel): string | null {
  switch (level) {
    case 'subdivision': return line.subdivision_id;
    case 'moment': return line.moment_id;
    case 'funnel_stage': return line.funnel_stage_id;
    default: return null;
  }
}

/**
 * Calculate allocated budget for lines matching a specific hierarchy path
 */
function calculateAllocatedBudget(
  lines: MediaLineRef[],
  hierarchyOrder: HierarchyLevel[],
  pathRefIds: (string | null)[],
  levelIndex: number
): number {
  return lines
    .filter(line => {
      // Check all levels up to and including levelIndex match
      for (let i = 0; i <= levelIndex; i++) {
        const level = hierarchyOrder[i];
        const expectedRefId = pathRefIds[i];
        const lineRefId = getLineRefId(line, level);
        
        // Match null vs null, or actual ids
        const lineMatches = (expectedRefId === null && !lineRefId) || lineRefId === expectedRefId;
        if (!lineMatches) return false;
      }
      return true;
    })
    .reduce((acc, line) => acc + (Number(line.budget) || 0), 0);
}

/**
 * Build hierarchical tree from budget distributions based on dynamic hierarchy order
 */
export function buildHierarchyTree(
  distributions: BudgetDistribution[],
  lines: MediaLineRef[],
  hierarchyOrder: HierarchyLevel[],
  getNameForLevel: NameResolver
): HierarchyTreeNode[] {
  if (hierarchyOrder.length === 0) return [];

  // Get distributions for the first level
  const firstLevel = hierarchyOrder[0];
  const firstLevelDists = distributions.filter(d => d.distribution_type === firstLevel);

  if (firstLevelDists.length === 0) return [];

  // Build tree recursively
  function buildLevel(
    parentDist: BudgetDistribution | null,
    levelIndex: number,
    pathRefIds: (string | null)[]
  ): HierarchyTreeNode[] {
    if (levelIndex >= hierarchyOrder.length) return [];

    const currentLevel = hierarchyOrder[levelIndex];
    const levelDists = parentDist
      ? distributions.filter(d => 
          d.distribution_type === currentLevel && 
          d.parent_distribution_id === parentDist.id
        )
      : distributions.filter(d => 
          d.distribution_type === currentLevel && 
          !d.parent_distribution_id
        );

    // If no distributions at this level, create a "Geral" node
    if (levelDists.length === 0 && parentDist) {
      const currentPathRefIds = [...pathRefIds, null];
      const allocated = calculateAllocatedBudget(lines, hierarchyOrder, currentPathRefIds, levelIndex);
      
      const geralNode: HierarchyTreeNode = {
        data: {
          id: null,
          distId: 'none',
          name: 'Geral',
          planned: parentDist.amount,
          allocated,
          percentage: 100,
          level: currentLevel,
          parentDistId: parentDist.id,
        },
        children: buildLevel(
          { ...parentDist, id: 'none', amount: parentDist.amount },
          levelIndex + 1,
          currentPathRefIds
        ),
      };
      return [geralNode];
    }

    return levelDists.map(dist => {
      const currentPathRefIds = [...pathRefIds, dist.reference_id];
      const allocated = calculateAllocatedBudget(lines, hierarchyOrder, currentPathRefIds, levelIndex);

      const node: HierarchyTreeNode = {
        data: {
          id: dist.reference_id,
          distId: dist.id,
          name: getNameForLevel(currentLevel, dist.reference_id),
          planned: dist.amount,
          allocated,
          percentage: dist.percentage,
          level: currentLevel,
          parentDistId: dist.parent_distribution_id,
        },
        children: buildLevel(dist, levelIndex + 1, currentPathRefIds),
      };

      return node;
    });
  }

  // Start building from root level
  return firstLevelDists.map(dist => {
    const pathRefIds = [dist.reference_id];
    const allocated = calculateAllocatedBudget(lines, hierarchyOrder, pathRefIds, 0);

    const node: HierarchyTreeNode = {
      data: {
        id: dist.reference_id,
        distId: dist.id,
        name: getNameForLevel(hierarchyOrder[0], dist.reference_id),
        planned: dist.amount,
        allocated,
        percentage: dist.percentage,
        level: hierarchyOrder[0],
        parentDistId: null,
      },
      children: buildLevel(dist, 1, pathRefIds),
    };

    return node;
  });
}

/**
 * Flatten hierarchy tree into rows for table display.
 * Each row represents a complete path through all levels.
 */
export interface FlatHierarchyRow {
  levels: HierarchyNodeData[];
  // Convenience getters for backwards compatibility
  level1: HierarchyNodeData;
  level2: HierarchyNodeData;
  level3: HierarchyNodeData;
}

export function flattenHierarchyTree(
  tree: HierarchyTreeNode[],
  hierarchyOrder: HierarchyLevel[]
): FlatHierarchyRow[] {
  const rows: FlatHierarchyRow[] = [];

  function traverse(node: HierarchyTreeNode, path: HierarchyNodeData[]) {
    const currentPath = [...path, node.data];

    if (node.children.length === 0) {
      // Leaf node - create a row
      // Pad with empty nodes if needed
      while (currentPath.length < hierarchyOrder.length) {
        const missingLevel = hierarchyOrder[currentPath.length];
        currentPath.push({
          id: null,
          distId: 'none',
          name: 'Geral',
          planned: node.data.planned,
          allocated: node.data.allocated,
          percentage: 100,
          level: missingLevel,
          parentDistId: node.data.distId,
        });
      }

      rows.push({
        levels: currentPath,
        level1: currentPath[0],
        level2: currentPath[1] || currentPath[0],
        level3: currentPath[2] || currentPath[1] || currentPath[0],
      });
    } else {
      // Traverse children
      for (const child of node.children) {
        traverse(child, currentPath);
      }
    }
  }

  for (const rootNode of tree) {
    traverse(rootNode, []);
  }

  return rows;
}

/**
 * Get column headers based on hierarchy order
 */
export function getHierarchyColumnHeaders(hierarchyOrder: HierarchyLevel[]): string[] {
  return hierarchyOrder.map(level => getLevelLabel(level));
}

/**
 * Count total rows for rowspan calculations
 */
export function countDescendantRows(node: HierarchyTreeNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((acc, child) => acc + countDescendantRows(child), 0);
}