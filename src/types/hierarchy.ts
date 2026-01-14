// Hierarchy level types for dynamic budget organization

export type HierarchyLevel = 'subdivision' | 'moment' | 'funnel_stage';

// Configuration for each level in the hierarchy
export interface HierarchyLevelConfig {
  level: HierarchyLevel;
  allocate_budget: boolean; // true = divide budget at this level; false = aggregate from children
}

// Convert HierarchyLevelConfig array to simple HierarchyLevel array
export function getHierarchyOrder(config: HierarchyLevelConfig[]): HierarchyLevel[] {
  return config.map(c => c.level);
}

// Check if a level should allocate budget
export function shouldAllocateBudget(config: HierarchyLevelConfig[], level: HierarchyLevel): boolean {
  const levelConfig = config.find(c => c.level === level);
  return levelConfig?.allocate_budget ?? true; // Default to true for backward compatibility
}

// Create HierarchyLevelConfig array from simple HierarchyLevel array (backward compatibility)
export function createHierarchyConfig(levels: HierarchyLevel[], allAllocate: boolean = true): HierarchyLevelConfig[] {
  return levels.map(level => ({ level, allocate_budget: allAllocate }));
}

export const HIERARCHY_LEVEL_CONFIG: Record<HierarchyLevel, {
  label: string;
  labelPlural: string;
  description: string;
  icon: string;
  color: string;
}> = {
  subdivision: {
    label: 'Subdivisão',
    labelPlural: 'Subdivisões',
    description: 'Divida por região, produto ou segmento',
    icon: 'Layers',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  moment: {
    label: 'Momento',
    labelPlural: 'Momentos',
    description: 'Fases temporais como lançamento e sustentação',
    icon: 'Clock',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  funnel_stage: {
    label: 'Fase do Funil',
    labelPlural: 'Fases do Funil',
    description: 'Etapas: conhecimento, consideração, conversão',
    icon: 'Filter',
    color: 'bg-green-500/10 text-green-500 border-green-500/30',
  },
};

// Default order for backwards compatibility
export const DEFAULT_HIERARCHY_ORDER: HierarchyLevel[] = ['subdivision', 'moment', 'funnel_stage'];

// Get label for a level
export function getLevelLabel(level: HierarchyLevel): string {
  return HIERARCHY_LEVEL_CONFIG[level].label;
}

// Get plural label for a level
export function getLevelLabelPlural(level: HierarchyLevel): string {
  return HIERARCHY_LEVEL_CONFIG[level].labelPlural;
}

// Get description for a level
export function getLevelDescription(level: HierarchyLevel): string {
  return HIERARCHY_LEVEL_CONFIG[level].description;
}

// Get icon name for a level
export function getLevelIcon(level: HierarchyLevel): string {
  return HIERARCHY_LEVEL_CONFIG[level].icon;
}

// Get color classes for a level
export function getLevelColor(level: HierarchyLevel): string {
  return HIERARCHY_LEVEL_CONFIG[level].color;
}

// Get the distribution type for saving to database
export function getLevelDistributionType(level: HierarchyLevel): 'subdivision' | 'moment' | 'funnel_stage' {
  return level;
}

// Validate hierarchy order
export function validateHierarchyOrder(order: HierarchyLevel[]): boolean {
  if (order.length === 0 || order.length > 3) return false;
  const uniqueLevels = new Set(order);
  if (uniqueLevels.size !== order.length) return false;
  return order.every(level => ['subdivision', 'moment', 'funnel_stage'].includes(level));
}

// Generate path key for nested allocations
export function generateAllocationPath(parentPath: string, itemId: string): string {
  return parentPath === 'root' ? itemId : `${parentPath}_${itemId}`;
}

// Parse allocation path to get parent
export function getParentPath(path: string): string {
  const parts = path.split('_');
  if (parts.length <= 1) return 'root';
  return parts.slice(0, -1).join('_');
}
