
# Ativar o Sistema de Detalhamento por Blocos (OOH, Radio, TV)

## Problema Identificado

Toda a infraestrutura de detalhamento por blocos ja esta construida no codigo (schemas, motor financeiro, grade de insercoes, renderizadores de celula). Porem, os tipos de detalhamento no banco de dados estao com `detail_category = 'custom'` em vez de `'ooh'`, `'radio'`, `'tv'`. Isso faz com que o sistema ignore a tabela de blocos e use a tabela antiga (generica).

Alem disso, o hook `useLineDetailTypes` nao envia o campo `detail_category` ao criar/atualizar tipos, impedindo que novos tipos sejam criados com a categoria correta.

## Solucao

### Passo 1 - Corrigir dados existentes no banco

Atualizar os 3 tipos de detalhamento existentes para usar as categorias corretas:

- "OOH / Midia Exterior" (id: c681d3ef...) -> `detail_category = 'ooh'`
- "Radio" (id: 4f37a7cc...) -> `detail_category = 'radio'`
- "TV Aberta" (id: fc318b33...) -> `detail_category = 'tv'`

### Passo 2 - Corrigir o hook useLineDetailTypes

Incluir o campo `detail_category` nas operacoes de insert e update, para que futuros tipos possam ser criados com a categoria correta.

### Passo 3 - Corrigir o BlockHeader para blocos nao collapsiveis

O componente `BlockHeader` retorna `null` quando o bloco nao e collapsible (ex: Campanha, Periodo). Isso faz com que esses blocos nao exibam seu titulo na linha de cabecalho. Precisa renderizar um `<th>` simples com o label mesmo quando nao e collapsible.

### Passo 4 - Validar fluxo de criacao no LineDetailDialog

Garantir que ao criar um novo detalhamento com tipo OOH/Radio/TV, o campo `has_insertion_grid` do detalhamento seja salvo corretamente (ja existe o toggle de grade no formulario de criacao, que precisa ser persistido no `metadata` ou diretamente no campo do banco).

## Detalhes Tecnicos

### Arquivos a serem editados:

1. **`src/hooks/useLineDetailTypes.ts`** - Adicionar `detail_category` ao payload de `createMutation` e `updateMutation`
2. **`src/components/media-plan/detail-blocks/BlockHeader.tsx`** - Renderizar cabecalho para blocos nao collapsiveis (Campanha, Periodo)
3. **`src/components/media-plan/LineDetailDialog.tsx`** - Persistir `has_insertion_grid` do toggle na criacao do detalhamento (passar para `createDetail`)

### Dados a serem atualizados no banco:

- UPDATE em 3 registros da tabela `line_detail_types` para corrigir `detail_category`

### Impacto:

- Ao abrir o dialog de detalhamento de uma linha, os tipos OOH/Radio/TV passarao a usar o `DetailBlockTable` com:
  - Blocos collapsiveis (Formato e Mensagem, Financeiro)
  - Campos herdados automaticamente (subdivisao, momento, fase, veiculo, meio, COD)
  - Motor financeiro com calculos automaticos (bruto, liquido, fees, producao)
  - Grade de insercoes mensal com auto-paint por dias da semana
  - Rodape com totalizadores
- Tipos personalizados continuarao usando a tabela generica existente
