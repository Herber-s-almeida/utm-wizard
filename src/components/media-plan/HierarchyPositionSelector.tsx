import { useState, useMemo } from 'react';
import { ChevronRight, Check, Layers, Clock, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { HierarchyLevel, getLevelLabel, HIERARCHY_LEVEL_CONFIG, DEFAULT_HIERARCHY_ORDER } from '@/types/hierarchy';

interface HierarchyOption {
  id: string | null;
  name: string;
}

interface HierarchyLevelConfig {
  type: HierarchyLevel;
  options: HierarchyOption[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

interface HierarchyPositionSelectorProps {
  // Dynamic levels configuration
  levels?: HierarchyLevelConfig[];
  hierarchyOrder?: HierarchyLevel[];
  // Legacy props for backwards compatibility
  planSubdivisions?: HierarchyOption[];
  planMoments?: HierarchyOption[];
  planFunnelStages?: HierarchyOption[];
  selectedSubdivision?: string | null;
  selectedMoment?: string | null;
  selectedFunnelStage?: string | null;
  onSubdivisionChange?: (id: string | null) => void;
  onMomentChange?: (id: string | null) => void;
  onFunnelStageChange?: (id: string | null) => void;
}

const LEVEL_ICONS: Record<HierarchyLevel, React.ReactNode> = {
  subdivision: <Layers className="w-4 h-4 text-muted-foreground" />,
  moment: <Clock className="w-4 h-4 text-muted-foreground" />,
  funnel_stage: <Filter className="w-4 h-4 text-muted-foreground" />,
};

export function HierarchyPositionSelector({
  levels: propLevels,
  hierarchyOrder = DEFAULT_HIERARCHY_ORDER,
  // Legacy props
  planSubdivisions,
  planMoments,
  planFunnelStages,
  selectedSubdivision,
  selectedMoment,
  selectedFunnelStage,
  onSubdivisionChange,
  onMomentChange,
  onFunnelStageChange,
}: HierarchyPositionSelectorProps) {
  // Build levels from either new or legacy props
  const levels: HierarchyLevelConfig[] = useMemo(() => {
    if (propLevels) return propLevels;
    
    // Build from legacy props based on hierarchyOrder
    return hierarchyOrder.map(levelType => {
      switch (levelType) {
        case 'subdivision':
          return {
            type: 'subdivision' as HierarchyLevel,
            options: planSubdivisions || [],
            selectedId: selectedSubdivision ?? null,
            onChange: onSubdivisionChange || (() => {}),
          };
        case 'moment':
          return {
            type: 'moment' as HierarchyLevel,
            options: planMoments || [],
            selectedId: selectedMoment ?? null,
            onChange: onMomentChange || (() => {}),
          };
        case 'funnel_stage':
          return {
            type: 'funnel_stage' as HierarchyLevel,
            options: planFunnelStages || [],
            selectedId: selectedFunnelStage ?? null,
            onChange: onFunnelStageChange || (() => {}),
          };
        default:
          return null;
      }
    }).filter(Boolean) as HierarchyLevelConfig[];
  }, [
    propLevels,
    hierarchyOrder,
    planSubdivisions,
    planMoments,
    planFunnelStages,
    selectedSubdivision,
    selectedMoment,
    selectedFunnelStage,
    onSubdivisionChange,
    onMomentChange,
    onFunnelStageChange,
  ]);

  // Find first level with multiple options to expand by default
  const getInitialExpandedLevel = () => {
    for (const level of levels) {
      if (level.options.length > 1) return level.type;
    }
    return null;
  };

  const [expandedSection, setExpandedSection] = useState<HierarchyLevel | null>(getInitialExpandedLevel);

  // Get selected name for a level
  const getSelectedName = (level: HierarchyLevelConfig): string => {
    const hasMultiple = level.options.length > 1;
    if (!hasMultiple && level.options.length === 1) return level.options[0].name;
    return level.options.find(o => o.id === level.selectedId)?.name || 'Selecione';
  };

  // Check if selection is complete
  const isSelected = (level: HierarchyLevelConfig): boolean => {
    return level.selectedId !== undefined;
  };

  const handleSelect = (levelIndex: number, id: string | null) => {
    const level = levels[levelIndex];
    level.onChange(id);
    
    // Auto-advance to next level with multiple options
    for (let i = levelIndex + 1; i < levels.length; i++) {
      if (levels[i].options.length > 1) {
        setExpandedSection(levels[i].type);
        return;
      }
    }
    setExpandedSection(null);
  };

  const renderSection = (level: HierarchyLevelConfig, levelIndex: number) => {
    const isExpanded = expandedSection === level.type;
    const hasMultiple = level.options.length > 1;
    const selectedName = getSelectedName(level);
    const hasSelection = isSelected(level);
    const label = getLevelLabel(level.type);
    const icon = LEVEL_ICONS[level.type];

    if (!hasMultiple) {
      return (
        <div key={level.type} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium truncate">{selectedName}</p>
          </div>
          <Badge variant="secondary" className="text-xs">Único</Badge>
        </div>
      );
    }

    return (
      <div key={level.type} className="rounded-lg border overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedSection(isExpanded ? null : level.type)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 transition-colors text-left",
            isExpanded ? "bg-primary/5" : "hover:bg-muted/50",
            hasSelection && !isExpanded && "bg-success/5"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            hasSelection ? "bg-success/10" : "bg-muted"
          )}>
            {hasSelection ? <Check className="w-4 h-4 text-success" /> : icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn(
              "text-sm font-medium truncate",
              !hasSelection && "text-muted-foreground"
            )}>
              {selectedName}
            </p>
          </div>
          <ChevronRight className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )} />
        </button>

        {isExpanded && (
          <div className="px-3 py-2 bg-muted/30 border-t grid grid-cols-2 sm:grid-cols-3 gap-2">
            {level.options.map((option) => {
              const optionId = option.id;
              const isOptionSelected = level.selectedId === optionId;
              
              return (
                <button
                  key={optionId || 'null'}
                  type="button"
                  onClick={() => handleSelect(levelIndex, optionId)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                    isOptionSelected 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "bg-background border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Build breadcrumb from levels in order
  const breadcrumbItems = levels.map(level => ({
    name: getSelectedName(level),
    isSelected: isSelected(level),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium text-primary">Posição no Plano</h3>
        <p className="text-xs text-muted-foreground">
          Selecione onde esta linha se encaixa na estrutura do plano
        </p>
      </div>

      {/* Breadcrumb summary - dynamic based on levels */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4 overflow-x-auto pb-1">
        {breadcrumbItems.map((item, idx) => (
          <span key={idx} className="contents">
            <span className={cn(item.isSelected && "text-foreground font-medium")}>
              {item.name}
            </span>
            {idx < breadcrumbItems.length - 1 && (
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
            )}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {levels.map((level, idx) => renderSection(level, idx))}
      </div>
    </div>
  );
}