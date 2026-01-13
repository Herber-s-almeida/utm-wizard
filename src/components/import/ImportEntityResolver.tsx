import { useState } from 'react';
import { Check, AlertTriangle, X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnresolvedEntity, EntityType } from '@/hooks/useImportPlan';
import { cn } from '@/lib/utils';

interface ImportEntityResolverProps {
  unresolvedEntities: UnresolvedEntity[];
  onResolve: (entityId: string, resolvedId: string) => void;
  onIgnore: (entityId: string) => void;
  onCreateEntity: (entity: UnresolvedEntity) => void;
  existingEntities: Record<EntityType, Array<{ id: string; name: string }>>;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  client: 'Clientes',
  vehicle: 'Veículos',
  channel: 'Canais',
  subdivision: 'Subdivisões',
  moment: 'Momentos',
  funnel_stage: 'Fases do Funil',
  target: 'Segmentações',
  medium: 'Meios',
  format: 'Formatos',
};

const ENTITY_SINGULAR: Record<EntityType, string> = {
  client: 'Cliente',
  vehicle: 'Veículo',
  channel: 'Canal',
  subdivision: 'Subdivisão',
  moment: 'Momento',
  funnel_stage: 'Fase do Funil',
  target: 'Segmentação',
  medium: 'Meio',
  format: 'Formato',
};

export function ImportEntityResolver({
  unresolvedEntities,
  onResolve,
  onIgnore,
  onCreateEntity,
  existingEntities,
}: ImportEntityResolverProps) {
  const [expandedTypes, setExpandedTypes] = useState<Set<EntityType>>(new Set(['vehicle', 'channel']));

  const groupedEntities = unresolvedEntities.reduce((acc, entity) => {
    if (!acc[entity.type]) acc[entity.type] = [];
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<EntityType, UnresolvedEntity[]>);

  const resolvedCount = unresolvedEntities.filter(e => e.status !== 'pending').length;
  const totalCount = unresolvedEntities.length;
  const progress = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 100;

  const toggleExpanded = (type: EntityType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  if (totalCount === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <Check className="w-16 h-16 mx-auto text-green-500" />
        <h2 className="text-xl font-semibold">Todas as entidades encontradas!</h2>
        <p className="text-muted-foreground">
          Todos os veículos, canais e demais itens do arquivo já existem na sua biblioteca.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Resolução de Entidades</h2>
        <p className="text-muted-foreground text-sm">
          Encontramos itens que não existem na sua biblioteca. Resolva cada um para continuar.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{resolvedCount}/{totalCount} resolvido(s)</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Entity Groups */}
      <div className="space-y-3">
        {(Object.entries(groupedEntities) as [EntityType, UnresolvedEntity[]][]).map(([type, entities]) => {
          const isExpanded = expandedTypes.has(type);
          const pendingCount = entities.filter(e => e.status === 'pending').length;
          
          return (
            <Collapsible key={type} open={isExpanded} onOpenChange={() => toggleExpanded(type)}>
              <CollapsibleTrigger asChild>
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                  "border hover:bg-muted/50",
                  pendingCount > 0 ? "border-amber-300 bg-amber-50/50" : "border-green-300 bg-green-50/50"
                )}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium">{ENTITY_LABELS[type]}</span>
                    <Badge variant={pendingCount > 0 ? "secondary" : "outline"} className="text-xs">
                      {pendingCount > 0 ? `${pendingCount} pendente(s)` : 'Resolvido'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{entities.length} item(s)</span>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-2 space-y-2">
                {entities.map(entity => (
                  <EntityRow
                    key={entity.id}
                    entity={entity}
                    existingOptions={existingEntities[type] || []}
                    onResolve={onResolve}
                    onIgnore={onIgnore}
                    onCreateEntity={onCreateEntity}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

function EntityRow({
  entity,
  existingOptions,
  onResolve,
  onIgnore,
  onCreateEntity,
}: {
  entity: UnresolvedEntity;
  existingOptions: Array<{ id: string; name: string }>;
  onResolve: (entityId: string, resolvedId: string) => void;
  onIgnore: (entityId: string) => void;
  onCreateEntity: (entity: UnresolvedEntity) => void;
}) {
  const isResolved = entity.status === 'resolved';
  const isIgnored = entity.status === 'ignored';
  const isCreating = entity.status === 'creating';

  return (
    <div className={cn(
      "p-3 rounded-lg border ml-4",
      isResolved && "bg-green-50/50 border-green-200",
      isIgnored && "bg-muted/50 border-muted",
      !isResolved && !isIgnored && "bg-background"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isResolved && <Check className="w-4 h-4 text-green-500" />}
            {isIgnored && <X className="w-4 h-4 text-muted-foreground" />}
            {!isResolved && !isIgnored && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            <span className="font-medium">"{entity.originalName}"</span>
            {isResolved && <Badge variant="outline" className="text-xs text-green-600">Resolvido</Badge>}
            {isIgnored && <Badge variant="outline" className="text-xs">Ignorado</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            Afeta {entity.affectedLines.length} linha(s): {entity.affectedLines.slice(0, 5).join(', ')}
            {entity.affectedLines.length > 5 && `... e mais ${entity.affectedLines.length - 5}`}
          </p>
          {entity.parentContext && (
            <p className="text-xs text-muted-foreground">
              {ENTITY_SINGULAR[entity.parentContext.type as EntityType]}: {entity.parentContext.name}
            </p>
          )}
        </div>

        {!isResolved && !isIgnored && (
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="default" onClick={() => onCreateEntity(entity)} disabled={isCreating}>
              <Plus className="w-3 h-3 mr-1" />
              Criar
            </Button>
            {existingOptions.length > 0 && (
              <Select onValueChange={(id) => onResolve(entity.id, id)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Usar existente" />
                </SelectTrigger>
                <SelectContent>
                  {existingOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="ghost" onClick={() => onIgnore(entity.id)}>
              Ignorar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
