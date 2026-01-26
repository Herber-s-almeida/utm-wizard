
# Plano de Correção: 11 Problemas nos Planos de Mídia

## Visão Geral

Este plano aborda 11 problemas identificados no sistema de planos de mídia, organizados por complexidade e interdependência.

---

## Problema 1: Cálculo das Divisões (Percentual vs Valor Absoluto)

### Diagnóstico
O sistema atualmente **sempre usa o percentual como fonte de verdade** e recalcula o valor absoluto. A solução anterior de aumentar a precisão para 4 casas decimais não foi suficiente porque o cálculo ainda parte do percentual para o valor.

### Solução
Mudar a lógica para que **quando o usuário edita o valor R$, o valor absoluto seja a fonte de verdade**, e o percentual seja calculado e armazenado com precisão adequada.

### Alterações

**`src/components/media-plan/BudgetAllocationTable.tsx`**:
1. Adicionar novo campo `absoluteAmount` ao `AllocationItem` para armazenar o valor absoluto quando editado diretamente
2. Modificar `handleAbsoluteChange` para armazenar o valor absoluto exato e calcular o percentual correspondente
3. Modificar a exibição para usar o valor absoluto armazenado quando no modo `absolute`
4. Atualizar `onUpdate` para passar tanto o percentual quanto o valor absoluto

**`src/hooks/useMediaPlanWizard.ts`** (se necessário):
- Atualizar tipos de `BudgetAllocation` para incluir `absoluteAmount?: number`

---

## Problema 2: Ordem de Exibição dos Níveis (Subdivisão, Momento, Fases do Funil)

### Diagnóstico
A tabela hierárquica exibe as fases do funil fora da ordem definida no wizard. A coluna `funnel_order` já existe mas não está sendo utilizada para ordenar a exibição.

### Solução
Implementar ordenação baseada em `funnel_order` do plano para fases do funil, e adicionar suporte para ordenação personalizada de subdivisões e momentos.

### Alterações

**`src/utils/hierarchyDataBuilder.ts`**:
1. Modificar `buildHierarchyTree` para aceitar um parâmetro opcional `levelOrder: Record<HierarchyLevel, string[]>` 
2. Ordenar os nodes de cada nível baseado na ordem definida

**`src/components/media-plan/HierarchicalMediaTable.tsx`**:
1. Passar a prop `plan.funnel_order` para a função `buildHierarchyTree`
2. Ordenar os nodes filhos baseado na ordem do plano

**`src/pages/MediaPlanDetail.tsx`**:
1. Passar `plan.funnel_order` para `HierarchicalMediaTable` e `EditableHierarchyCard`

**Banco de dados** (migração SQL):
1. Adicionar colunas `subdivision_order uuid[]` e `moment_order uuid[]` à tabela `media_plans`

**`src/pages/NewMediaPlanBudget.tsx`**:
1. Salvar a ordem das subdivisões e momentos quando o usuário arrastar/reordenar

---

## Problema 3: Largura das Colunas de Total Desalinhadas

### Diagnóstico
As colunas de total no rodapé da tabela não acompanham o redimensionamento das colunas de dados.

### Solução
Garantir que o rodapé use exatamente os mesmos valores de largura que as colunas do cabeçalho e corpo da tabela.

### Alterações

**`src/components/media-plan/HierarchicalMediaTable.tsx`**:
1. Localizar o componente de rodapé/total (aproximadamente linhas 2200-2400)
2. Aplicar `getWidth(columnKey)` a cada célula do rodapé, garantindo sincronização com o cabeçalho
3. Verificar se as colunas de orçamento mensal também usam `getWidth` consistentemente

---

## Problema 4: Vincular Targets a Cliente Específico

### Diagnóstico
Targets são exibidos globalmente sem filtragem por cliente. É necessário permitir vincular targets a clientes.

### Solução
Adicionar campo `client_id` à tabela `targets` e implementar filtragem no wizard de criação de linha.

### Alterações

**Banco de dados** (migração SQL):
```sql
ALTER TABLE public.targets 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
```

**`src/components/config/TargetDialog.tsx`**:
1. Adicionar combobox de seleção de cliente (opcional) ao final do formulário
2. Buscar clientes da biblioteca usando `useClients()`
3. Incluir `client_id` nos dados salvos

**`src/hooks/useConfigData.ts`** (função `useTargets`):
1. Adicionar `client_id` ao tipo `Target`

**`src/components/media-plan/MediaLineWizard.tsx`**:
1. Modificar `getItemsForStep()` no case `'target'`:
   - Filtrar para exibir apenas targets onde `client_id === plan.client_id` OU `client_id === null`

---

## Problema 5: Criar Nova Segmentação Abre Wizard Completo

### Diagnóstico
Ao criar nova segmentação no wizard da linha, apenas o nome é salvo. Deveria abrir o `TargetDialog` completo.

### Solução
Modificar a criação de target no wizard para abrir o dialog completo de criação.

### Alterações

**`src/components/media-plan/MediaLineWizard.tsx`**:
1. Adicionar estado `targetDialogOpen` e `pendingTargetName`
2. Modificar `handleCreate` no case `'target'` para:
   - Em vez de criar direto, abrir `TargetDialog` com o nome pré-preenchido
3. Importar e renderizar `TargetDialog` dentro do wizard
4. Após salvar no TargetDialog, selecionar automaticamente o novo target

---

## Problema 6: Ocultar Botões "Nova Linha"

### Diagnóstico
Não existe opção para ocultar os botões "Criar nova linha" dentro da tabela hierárquica.

### Solução
Adicionar novo elemento de visibilidade `'new-line-buttons'` ao sistema de visibilidade do plano.

### Alterações

**`src/hooks/usePlanElementsVisibility.ts`**:
1. Adicionar `'new-line-buttons'` ao tipo `PlanElementKey`
2. Adicionar à lista `DEFAULT_ELEMENTS`:
   ```typescript
   { key: 'new-line-buttons', label: 'Botões Nova Linha', visible: true }
   ```

**`src/components/media-plan/HierarchicalMediaTable.tsx`**:
1. Receber nova prop `showNewLineButtons?: boolean`
2. Usar essa prop para controlar a exibição do componente `AddLineButton`

**`src/pages/MediaPlanDetail.tsx`**:
1. Passar `showNewLineButtons={isVisible('new-line-buttons') && canEdit}` para `HierarchicalMediaTable`

---

## Problema 7: Mostrar Coluna "Observações" no Plano

### Diagnóstico
O campo `notes` (observações) preenchido no wizard não aparece na tabela do plano.

### Solução
Adicionar coluna "Obs." à tabela hierárquica, posicionada antes de "Status".

### Alterações

**`src/components/media-plan/HierarchicalMediaTable.tsx`**:
1. Adicionar `'notes'` à lista de colunas toggleáveis
2. Adicionar `notes` ao tipo `ToggleableColumn`
3. Adicionar header e células para a coluna de observações com tooltip para texto longo
4. Posicionar antes da coluna Status na ordem de renderização
5. Adicionar largura mínima para a coluna no hook `useResizableColumns`

---

## Problema 8: Salvar Edições sem Navegar para Próxima Página

### Diagnóstico
O botão "Salvar" no wizard de edição de linha não persiste as alterações até clicar em "Próximo" e "Concluir".

### Solução
Modificar o comportamento do botão "Salvar" para persistir imediatamente.

### Alterações

**`src/components/media-plan/MediaLineWizard.tsx`**:
1. Localizar o botão "Salvar" (aproximadamente linha 950-980)
2. Modificar o handler para chamar `handleSave(false)` que:
   - Salva os dados no banco
   - Exibe toast de sucesso
   - **Não** fecha o wizard nem avança para próximo passo
   - Apenas atualiza o estado local com os dados persistidos

---

## Problema 9: Alerta de Orçamento Alocado vs Orçamento da Linha

### Diagnóstico
Não há alerta quando o orçamento alocado mensalmente difere do orçamento total da linha.

### Solução
Adicionar alerta crítico no sistema de alertas e indicador visual na coluna "Orc. Alocado".

### Alterações

**`src/hooks/usePlanAlerts.ts`**:
1. Adicionar verificação para cada linha:
   ```typescript
   const lineBudget = Number(line.budget) || 0;
   const allocatedBudget = monthlyBudgets[line.id]?.reduce((sum, b) => sum + b.amount, 0) || 0;
   
   if (Math.abs(lineBudget - allocatedBudget) > 0.01) {
     alerts.push({
       type: 'error',
       message: `Linha ${line.line_code}: Orçamento (${lineBudget}) ≠ Alocado (${allocatedBudget})`,
       lineId: line.id,
     });
   }
   ```

**`src/components/media-plan/HierarchicalMediaTable.tsx`**:
1. Na célula "Orc. Alocado", adicionar indicador visual (ícone vermelho de alerta) quando:
   - `getLineAllocatedBudget(line.id) !== Number(line.budget)`
2. Adicionar tooltip explicando a discrepância

---

## Problema 10: Botão para Ocultar "Fases do Funil (Total do Plano)"

### Diagnóstico
A visualização do funil não pode ser ocultada através do menu de visibilidade.

### Solução
Adicionar novo elemento de visibilidade para o funil.

### Alterações

**`src/hooks/usePlanElementsVisibility.ts`**:
1. Adicionar `'funnel-visualization'` ao tipo `PlanElementKey`
2. Adicionar à lista `DEFAULT_ELEMENTS`:
   ```typescript
   { key: 'funnel-visualization', label: 'Fases do Funil (Total do Plano)', visible: true }
   ```

**`src/pages/MediaPlanDetail.tsx`**:
1. Envolver o bloco de `FunnelVisualization` (linhas 928-978) com verificação:
   ```typescript
   {isVisible('funnel-visualization') && (() => { ... })()}
   ```

---

## Problema 11: Gráfico de Distribuição Temporal Incorreto

### Diagnóstico
O gráfico de distribuição temporal não está plotando os valores corretos dos orçamentos mensais.

### Solução
Revisar a lógica de cálculo do gráfico para garantir que usa os dados corretos de `media_line_monthly_budgets`.

### Alterações

**`src/pages/MediaPlanDetail.tsx`** (linhas 1042-1070):
1. Verificar se `monthlyBudgets` está sendo populado corretamente
2. Ajustar a lógica para usar **todas as linhas** (não apenas `filteredLines`) quando o filtro não estiver ativo
3. Verificar o formato da data (`yyyy-MM-01`) está consistente entre o banco e o cálculo
4. Adicionar log de debug temporário para verificar os dados

```typescript
// Usar lines em vez de filteredLines quando não há filtro ativo
const linesToUse = filterByAlerts ? filteredLines : lines;

linesToUse.forEach(line => {
  const lineBudgets = monthlyBudgets[line.id] || [];
  // ... resto da lógica
});
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Problemas |
|---------|-----------|
| `src/components/media-plan/BudgetAllocationTable.tsx` | 1 |
| `src/utils/hierarchyDataBuilder.ts` | 2 |
| `src/components/media-plan/HierarchicalMediaTable.tsx` | 2, 3, 6, 7, 9 |
| `src/pages/MediaPlanDetail.tsx` | 2, 6, 10, 11 |
| `src/components/config/TargetDialog.tsx` | 4 |
| `src/hooks/useConfigData.ts` | 4 |
| `src/components/media-plan/MediaLineWizard.tsx` | 4, 5, 8 |
| `src/hooks/usePlanElementsVisibility.ts` | 6, 10 |
| `src/hooks/usePlanAlerts.ts` | 9 |
| `supabase/migrations/` (nova migração) | 2, 4 |
| `src/pages/NewMediaPlanBudget.tsx` | 2 |

---

## Ordem de Implementação Sugerida

1. **Problema 1** (Cálculo das divisões) - Crítico para entrada de dados
2. **Problema 8** (Salvar edições) - UX crítica
3. **Problema 9** (Alerta de orçamento) - Integridade de dados
4. **Problema 11** (Gráfico temporal) - Visualização incorreta
5. **Problema 2** (Ordem de exibição) - Requer migração de banco
6. **Problema 4** (Targets por cliente) - Requer migração de banco
7. **Problema 3** (Largura colunas) - Correção visual
8. **Problema 7** (Coluna observações) - Nova funcionalidade
9. **Problemas 6, 10** (Ocultar elementos) - Funcionalidades de configuração
10. **Problema 5** (Wizard de segmentação) - Melhoria de UX

---

## Seção Técnica

### Migração SQL Necessária

```sql
-- Problema 2: Adicionar colunas de ordem para subdivisões e momentos
ALTER TABLE public.media_plans 
ADD COLUMN subdivision_order uuid[] DEFAULT '{}'::uuid[],
ADD COLUMN moment_order uuid[] DEFAULT '{}'::uuid[];

-- Problema 4: Adicionar client_id aos targets
ALTER TABLE public.targets 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Índice para performance de busca por cliente
CREATE INDEX IF NOT EXISTS idx_targets_client_id ON public.targets(client_id);
```

### Tipos a Atualizar

```typescript
// Target type em useConfigData.ts
interface Target {
  // ... campos existentes
  client_id?: string | null;
}

// BudgetAllocation em useMediaPlanWizard.ts  
interface BudgetAllocation {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  absoluteAmount?: number; // Novo: valor absoluto quando editado diretamente
}

// PlanElementKey em usePlanElementsVisibility.ts
type PlanElementKey = 
  | 'plan-summary' 
  | 'moments-timeline' 
  | 'budget-hierarchy' 
  | 'temporal-distribution' 
  | 'line-details'
  | 'funnel-visualization'  // Novo
  | 'new-line-buttons';     // Novo
```
