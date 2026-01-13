import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Clock, Filter } from 'lucide-react';
import { BudgetAllocation } from '@/hooks/useMediaPlanWizard';
import { HierarchyLevel, getLevelLabel, HIERARCHY_LEVEL_CONFIG } from '@/types/hierarchy';
import { BudgetAllocationTable } from './BudgetAllocationTable';
import { FunnelStageSelector } from './FunnelStageSelector';
import { SortableFunnelList } from './SortableFunnelList';
import { FunnelVisualization } from './FunnelVisualization';

// Icons for hierarchy levels
const LEVEL_ICONS: Record<HierarchyLevel, React.ElementType> = {
  subdivision: Layers,
  moment: Clock,
  funnel_stage: Filter,
};

interface NestedHierarchyLevelProps {
  hierarchyOrder: HierarchyLevel[];
  targetLevelIndex: number;
  parentPath: string;
  parentBreadcrumb: string;
  parentAmount: number;
  depth: number;
  getAllocations: (level: HierarchyLevel, path: string) => BudgetAllocation[];
  onAdd: (level: HierarchyLevel, path: string, item: BudgetAllocation) => void;
  onUpdate: (level: HierarchyLevel, path: string, id: string, percentage: number, dates?: { start_date?: string; end_date?: string }) => void;
  onRemove: (level: HierarchyLevel, path: string, id: string) => void;
  onReorder: (level: HierarchyLevel, path: string, items: BudgetAllocation[]) => void;
  onCreate: (level: HierarchyLevel, name: string) => Promise<any>;
  getLibraryItems: (level: HierarchyLevel) => { id: string; name: string }[];
  calculateAmount: (parentAmount: number, percentage: number) => number;
  maxItemsPerLevel: Record<HierarchyLevel, number>;
  planStartDate: string;
  planEndDate: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Get container styling based on depth
const getContainerClass = (depth: number): string => {
  switch (depth) {
    case 0:
      return 'rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-4';
    case 1:
      return 'rounded-lg border bg-background p-4 space-y-4';
    case 2:
      return 'rounded-md border-dashed border bg-muted/30 p-3 space-y-3';
    default:
      return 'rounded border-dashed border bg-muted/20 p-2 space-y-2';
  }
};

// Get header styling based on depth
const getHeaderClass = (depth: number): string => {
  switch (depth) {
    case 0:
      return 'flex items-center justify-between mb-3 pb-2 border-b border-primary/20';
    case 1:
      return 'flex items-center justify-between mb-2';
    default:
      return 'flex items-center justify-between mb-2';
  }
};

// Get title styling based on depth
const getTitleClass = (depth: number): string => {
  switch (depth) {
    case 0:
      return 'text-sm font-semibold text-primary flex items-center gap-2';
    case 1:
      return 'text-sm font-medium flex items-center gap-2';
    default:
      return 'text-xs font-medium text-muted-foreground flex items-center gap-2';
  }
};

// Get amount styling based on depth
const getAmountClass = (depth: number): string => {
  switch (depth) {
    case 0:
      return 'font-bold text-primary';
    case 1:
      return 'font-semibold text-sm';
    default:
      return 'font-medium text-xs text-muted-foreground';
  }
};

export const NestedHierarchyLevel: React.FC<NestedHierarchyLevelProps> = ({
  hierarchyOrder,
  targetLevelIndex,
  parentPath,
  parentBreadcrumb,
  parentAmount,
  depth,
  getAllocations,
  onAdd,
  onUpdate,
  onRemove,
  onReorder,
  onCreate,
  getLibraryItems,
  calculateAmount,
  maxItemsPerLevel,
  planStartDate,
  planEndDate,
}) => {
  const renderLevel = (
    currentLevelIndex: number,
    path: string,
    breadcrumb: string,
    amount: number,
    currentDepth: number
  ): React.ReactNode => {
    if (currentLevelIndex > targetLevelIndex) {
      return null;
    }

    const level = hierarchyOrder[currentLevelIndex];
    const allocations = getAllocations(level, path);
    const Icon = LEVEL_ICONS[level];
    const libraryItems = getLibraryItems(level);
    const maxItems = maxItemsPerLevel[level];
    const showDates = level === 'moment';

    // If this is the target level, render the editing UI
    if (currentLevelIndex === targetLevelIndex) {
      return (
        <div className="space-y-4">
          {level === 'funnel_stage' ? (
            <>
              {allocations.length < maxItems && (
                <FunnelStageSelector
                  existingItems={libraryItems}
                  selectedItems={allocations}
                  onAdd={(item) => onAdd(level, path, item)}
                  onCreate={(name) => onCreate(level, name)}
                  maxItems={maxItems}
                />
              )}
              
              {allocations.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-3">Arraste para reordenar as fases:</p>
                  <SortableFunnelList
                    items={allocations}
                    totalBudget={amount}
                    onUpdate={(id, percentage) => onUpdate(level, path, id, percentage)}
                    onRemove={(id) => onRemove(level, path, id)}
                    onReorder={(items) => onReorder(level, path, items)}
                  />
                </div>
              )}

              {allocations.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-4">Visualização do Funil:</p>
                  <FunnelVisualization
                    funnelStages={allocations}
                    parentBudget={amount}
                    parentName={breadcrumb}
                  />
                </div>
              )}
            </>
          ) : (
            <BudgetAllocationTable
              items={allocations}
              existingItems={libraryItems}
              totalBudget={amount}
              onAdd={(item) => onAdd(level, path, item)}
              onUpdate={(id, percentage, dates) => onUpdate(level, path, id, percentage, dates)}
              onRemove={(id) => onRemove(level, path, id)}
              onCreate={(name) => onCreate(level, name)}
              label={getLevelLabel(level)}
              createLabel={`Criar ${getLevelLabel(level).toLowerCase()}`}
              maxItems={maxItems}
              showDates={showDates}
              planStartDate={planStartDate}
              planEndDate={planEndDate}
            />
          )}
        </div>
      );
    }

    // This is a container level - render allocations as visual containers
    // If no allocations, treat as implicit "Geral"
    if (allocations.length === 0) {
      const geralPath = path === 'root' ? 'geral' : `${path}_geral`;
      const geralBreadcrumb = breadcrumb ? `${breadcrumb} › Geral` : 'Geral';
      
      return (
        <div className={getContainerClass(currentDepth)}>
          <div className={getHeaderClass(currentDepth)}>
            <div className={getTitleClass(currentDepth)}>
              <Icon className="w-4 h-4" />
              <span>Geral</span>
            </div>
            <span className={getAmountClass(currentDepth)}>{formatCurrency(amount)}</span>
          </div>
          {renderLevel(currentLevelIndex + 1, geralPath, geralBreadcrumb, amount, currentDepth + 1)}
        </div>
      );
    }

    // Render each allocation as a container
    return (
      <div className="space-y-4">
        {allocations.map((alloc, index) => {
          const allocPath = path === 'root' ? alloc.id : `${path}_${alloc.id}`;
          const allocBreadcrumb = breadcrumb ? `${breadcrumb} › ${alloc.name}` : alloc.name;
          const allocAmount = calculateAmount(amount, alloc.percentage);

          return (
            <motion.div
              key={alloc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={getContainerClass(currentDepth)}
            >
              <div className={getHeaderClass(currentDepth)}>
                <div className={getTitleClass(currentDepth)}>
                  <Icon className="w-4 h-4" />
                  <span>{alloc.name}</span>
                </div>
                <span className={getAmountClass(currentDepth)}>{formatCurrency(allocAmount)}</span>
              </div>
              {renderLevel(currentLevelIndex + 1, allocPath, allocBreadcrumb, allocAmount, currentDepth + 1)}
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Start rendering from level 0 if we're on level 2+, otherwise just render the target level
  if (targetLevelIndex === 0) {
    // First level - no nesting needed, just render editing UI directly
    const level = hierarchyOrder[0];
    const allocations = getAllocations(level, 'root');
    const libraryItems = getLibraryItems(level);
    const maxItems = maxItemsPerLevel[level];
    const showDates = level === 'moment';

    return (
      <div className="space-y-4">
        {level === 'funnel_stage' ? (
          <>
            {allocations.length < maxItems && (
              <FunnelStageSelector
                existingItems={libraryItems}
                selectedItems={allocations}
                onAdd={(item) => onAdd(level, 'root', item)}
                onCreate={(name) => onCreate(level, name)}
                maxItems={maxItems}
              />
            )}
            
            {allocations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-3">Arraste para reordenar as fases:</p>
                <SortableFunnelList
                  items={allocations}
                  totalBudget={parentAmount}
                  onUpdate={(id, percentage) => onUpdate(level, 'root', id, percentage)}
                  onRemove={(id) => onRemove(level, 'root', id)}
                  onReorder={(items) => onReorder(level, 'root', items)}
                />
              </div>
            )}

            {allocations.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-4">Visualização do Funil:</p>
                <FunnelVisualization
                  funnelStages={allocations}
                  parentBudget={parentAmount}
                  parentName="Plano Completo"
                />
              </div>
            )}
          </>
        ) : (
          <BudgetAllocationTable
            items={allocations}
            existingItems={libraryItems}
            totalBudget={parentAmount}
            onAdd={(item) => onAdd(level, 'root', item)}
            onUpdate={(id, percentage, dates) => onUpdate(level, 'root', id, percentage, dates)}
            onRemove={(id) => onRemove(level, 'root', id)}
            onCreate={(name) => onCreate(level, name)}
            label={getLevelLabel(level)}
            createLabel={`Criar ${getLevelLabel(level).toLowerCase()}`}
            maxItems={maxItems}
            showDates={showDates}
            planStartDate={planStartDate}
            planEndDate={planEndDate}
          />
        )}
      </div>
    );
  }

  // For level 1+, start from level 0 and nest
  return renderLevel(0, 'root', '', parentAmount, 0);
};
