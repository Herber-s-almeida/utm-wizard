

# Correcao: Taxa refletida no total alocado das hierarquias

## Problema

A coluna "Orc. Alocado" na linha individual ja calcula corretamente com a taxa (`soma meses * (1 + taxa/100)`), mas os totais nos cards de hierarquia (ex: "Awareness") usam o campo estatico `line.budget` -- ignorando completamente a taxa e os orcamentos mensais.

## Causa Raiz

Dois pontos:

1. **`hierarchyDataBuilder.ts` linha 85**: `calculateAllocatedBudget` soma `line.budget` (valor estatico) em vez de usar um valor calculado com taxas.
2. **`HierarchicalMediaTable.tsx` linha 983**: O array `lineRefs` passado ao builder nao inclui o valor calculado com taxa -- apenas o `budget` estatico.

## Alteracoes

### 1. `src/utils/hierarchyDataBuilder.ts`

- Adicionar campo opcional `allocatedBudget?: number` ao `MediaLineRef`
- Na funcao `calculateAllocatedBudget` (linha 85), trocar:
  ```
  .reduce((acc, line) => acc + (Number(line.budget) || 0), 0)
  ```
  por:
  ```
  .reduce((acc, line) => acc + (line.allocatedBudget ?? (Number(line.budget) || 0)), 0)
  ```
  Isso usa o valor pre-calculado com taxa quando disponivel, e faz fallback para `budget` quando nao.

### 2. `src/components/media-plan/HierarchicalMediaTable.tsx`

- Na construcao do `lineRefs` (~linha 983), calcular o `allocatedBudget` para cada linha:
  ```typescript
  const lineRefs: MediaLineRef[] = lines.map(l => {
    const lineBudgets = monthlyBudgets[l.id] || [];
    const sumMonths = lineBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const fee = Number(l.fee_percentage) || 0;
    const allocated = sumMonths > 0 ? sumMonths * (1 + fee / 100) : (Number(l.budget) || 0);
    return {
      id: l.id,
      budget: Number(l.budget) || 0,
      allocatedBudget: allocated,
      subdivision_id: l.subdivision_id,
      moment_id: l.moment_id,
      funnel_stage_id: l.funnel_stage_id,
    };
  });
  ```

## Resultado

- Os cards de hierarquia (Awareness, etc.) passam a somar os valores reais alocados incluindo taxas
- A coluna "Orc. Alocado" individual continua funcionando como antes
- O rodape da tabela ja usa `getLineAllocatedBudget` e nao precisa de mudanca
- Sem alteracoes no banco de dados

