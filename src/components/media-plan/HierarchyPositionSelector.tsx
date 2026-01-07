import { useState, useMemo } from 'react';
import { ChevronRight, Check, Layers, Clock, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface HierarchyOption {
  id: string | null;
  name: string;
}

interface HierarchyPositionSelectorProps {
  planSubdivisions: HierarchyOption[];
  planMoments: HierarchyOption[];
  planFunnelStages: HierarchyOption[];
  selectedSubdivision: string | null;
  selectedMoment: string | null;
  selectedFunnelStage: string | null;
  onSubdivisionChange: (id: string | null) => void;
  onMomentChange: (id: string | null) => void;
  onFunnelStageChange: (id: string | null) => void;
}

export function HierarchyPositionSelector({
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
  // Track which section is expanded
  const [expandedSection, setExpandedSection] = useState<'subdivision' | 'moment' | 'funnel' | null>(
    planSubdivisions.length > 1 ? 'subdivision' : planMoments.length > 1 ? 'moment' : planFunnelStages.length > 1 ? 'funnel' : null
  );

  const hasMultipleSubdivisions = planSubdivisions.length > 1;
  const hasMultipleMoments = planMoments.length > 1;
  const hasMultipleFunnelStages = planFunnelStages.length > 1;

  // Get selected names for display
  const selectedSubName = useMemo(() => {
    if (!hasMultipleSubdivisions && planSubdivisions.length === 1) return planSubdivisions[0].name;
    return planSubdivisions.find(s => s.id === selectedSubdivision)?.name || 'Selecione';
  }, [selectedSubdivision, planSubdivisions, hasMultipleSubdivisions]);

  const selectedMomName = useMemo(() => {
    if (!hasMultipleMoments && planMoments.length === 1) return planMoments[0].name;
    return planMoments.find(m => m.id === selectedMoment)?.name || 'Selecione';
  }, [selectedMoment, planMoments, hasMultipleMoments]);

  const selectedFunnelName = useMemo(() => {
    if (!hasMultipleFunnelStages && planFunnelStages.length === 1) return planFunnelStages[0].name;
    return planFunnelStages.find(f => f.id === selectedFunnelStage)?.name || 'Selecione';
  }, [selectedFunnelStage, planFunnelStages, hasMultipleFunnelStages]);

  // Check if selection is complete
  const isSubdivisionSelected = selectedSubdivision !== undefined;
  const isMomentSelected = selectedMoment !== undefined;
  const isFunnelSelected = selectedFunnelStage !== undefined;

  const handleSelect = (section: 'subdivision' | 'moment' | 'funnel', id: string | null) => {
    if (section === 'subdivision') {
      onSubdivisionChange(id);
      // Auto-advance to next section if there are options
      if (hasMultipleMoments) {
        setExpandedSection('moment');
      } else if (hasMultipleFunnelStages) {
        setExpandedSection('funnel');
      } else {
        setExpandedSection(null);
      }
    } else if (section === 'moment') {
      onMomentChange(id);
      if (hasMultipleFunnelStages) {
        setExpandedSection('funnel');
      } else {
        setExpandedSection(null);
      }
    } else {
      onFunnelStageChange(id);
      setExpandedSection(null);
    }
  };

  const renderSection = (
    section: 'subdivision' | 'moment' | 'funnel',
    icon: React.ReactNode,
    label: string,
    options: HierarchyOption[],
    selectedId: string | null,
    selectedName: string,
    isSelected: boolean,
    hasMultiple: boolean
  ) => {
    const isExpanded = expandedSection === section;
    const showSection = hasMultiple;

    if (!showSection) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
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
      <div className="rounded-lg border overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedSection(isExpanded ? null : section)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-3 transition-colors text-left",
            isExpanded ? "bg-primary/5" : "hover:bg-muted/50",
            isSelected && !isExpanded && "bg-success/5"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isSelected ? "bg-success/10" : "bg-muted"
          )}>
            {isSelected ? <Check className="w-4 h-4 text-success" /> : icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn(
              "text-sm font-medium truncate",
              !isSelected && "text-muted-foreground"
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
            {options.map((option) => {
              const optionId = option.id;
              const isOptionSelected = selectedId === optionId;
              
              return (
                <button
                  key={optionId || 'null'}
                  type="button"
                  onClick={() => handleSelect(section, optionId)}
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium text-primary">Posição no Plano</h3>
        <p className="text-xs text-muted-foreground">
          Selecione onde esta linha se encaixa na estrutura do plano
        </p>
      </div>

      {/* Breadcrumb summary */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4 overflow-x-auto pb-1">
        <span className={cn(isSubdivisionSelected && "text-foreground font-medium")}>
          {selectedSubName}
        </span>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <span className={cn(isMomentSelected && "text-foreground font-medium")}>
          {selectedMomName}
        </span>
        <ChevronRight className="w-3 h-3 flex-shrink-0" />
        <span className={cn(isFunnelSelected && "text-foreground font-medium")}>
          {selectedFunnelName}
        </span>
      </div>

      <div className="space-y-2">
        {renderSection(
          'subdivision',
          <Layers className="w-4 h-4 text-muted-foreground" />,
          'Subdivisão',
          planSubdivisions,
          selectedSubdivision,
          selectedSubName,
          isSubdivisionSelected,
          hasMultipleSubdivisions
        )}

        {renderSection(
          'moment',
          <Clock className="w-4 h-4 text-muted-foreground" />,
          'Momento',
          planMoments,
          selectedMoment,
          selectedMomName,
          isMomentSelected,
          hasMultipleMoments
        )}

        {renderSection(
          'funnel',
          <Filter className="w-4 h-4 text-muted-foreground" />,
          'Fase do Funil',
          planFunnelStages,
          selectedFunnelStage,
          selectedFunnelName,
          isFunnelSelected,
          hasMultipleFunnelStages
        )}
      </div>
    </div>
  );
}
