
# Correcao do Loop Infinito de Renderizacao na Pagina do Plano de Midia

## Diagnostico

O problema raiz foi identificado: existem **5 componentes React definidos DENTRO** da funcao `HierarchicalMediaTable`. Isso faz com que, a cada re-render do componente pai, React trate cada componente interno como um **tipo novo**, causando unmount/remount completo de toda a arvore de componentes.

O ciclo de loop funciona assim:
1. `HierarchicalMediaTable` renderiza e cria novos tipos para `DynamicHierarchyRenderer`, `MonthBudgetCell`, `BudgetCard`, `AddLineButton` e `EditableCell`
2. React desmonta toda a arvore anterior e monta uma nova
3. Cada `LineDetailButton` (que esta dentro das linhas) remonta e dispara queries `useLineDetails` e `useLineLinksForLine`
4. As queries completam, causam state updates no react-query, que disparam um novo render
5. Volta ao passo 1 -- loop infinito

Os logs de rede confirmam: as mesmas queries `line_detail_line_links` repetem-se para os mesmos IDs de linha a cada ~2 segundos.

## Solucao

### 1. Extrair componentes internos para fora de `HierarchicalMediaTable`

Mover os 5 componentes definidos dentro do corpo da funcao para o escopo do modulo (fora da funcao), recebendo os dados necessarios via props:

- **`MonthBudgetCell`** (linha ~901): usa `useAuth()`, `supabase`, `formatCurrency`. Extrair como componente externo com props para `lineId`, `month`, `value`, `onUpdate`, `isEditable`, `formatCurrency`
- **`EditableCell`** (linha ~1026): usa `isEditingField`, `saveFieldEdit`, `cancelFieldEdit`, `startEditingField`, `setEditValue`, `editValue`. Extrair com props
- **`BudgetCard`** (linha ~1128): componente puro de apresentacao. Extrair com props `label`, `planned`, `allocated`, `percentageLabel`
- **`AddLineButton`** (linha ~1206): usa `showNewLineButtons`, `onAddLine`. Extrair com props
- **`DynamicHierarchyRenderer`** (linha ~1494): componente recursivo. Extrair com props para todas as dependencias (ja recebe via props interface)

### 2. Adicionar `staleTime` aos hooks de detalhamento

Para evitar refetches desnecessarios quando os componentes re-renderizam:

- `useLineDetails` (queryKey `line-details`): adicionar `staleTime: 30000` (30s)
- `useLineLinksForLine` (queryKey `line-links-for-line`): adicionar `staleTime: 30000` (30s)

### 3. Estabilizar referencia de `linesWithAlerts` em `usePlanAlerts`

O `Set` criado na linha 341 do `usePlanAlerts.ts` e recriado a cada chamada sem `useMemo`. Envolver com `useMemo` dependendo de `alerts`.

## Detalhes Tecnicos

### Arquivos a serem editados:
- `src/components/media-plan/HierarchicalMediaTable.tsx` -- extrair 5 componentes para fora da funcao principal
- `src/hooks/useLineDetails.ts` -- adicionar `staleTime: 30000` na query
- `src/hooks/useLineDetailLinks.ts` -- adicionar `staleTime: 30000` na query `useLineLinksForLine`
- `src/hooks/usePlanAlerts.ts` -- envolver `linesWithAlerts` com `useMemo`

### Impacto:
- Os componentes extraidos manterao exatamente o mesmo comportamento visual
- As queries de detalhamento continuarao funcionando, mas sem refetches desnecessarios
- O loop infinito sera eliminado porque React reconhecera os componentes como o mesmo tipo entre renders
