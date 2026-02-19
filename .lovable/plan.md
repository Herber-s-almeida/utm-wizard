
# Correcao da Nomenclatura Sequencial: do Detalhamento para o Item

## Problema Atual

O codigo sequencial (ex: `CIA2_001`) esta sendo atribuido ao **detalhamento** (template/container) no momento da criacao. Isso esta errado. O detalhamento e apenas um agrupador/template -- o que precisa de identificacao unica sao os **itens** (linhas) dentro dele.

## Conceito Correto

```text
Linha do Plano (line_code: CIA2)
  └── Detalhamento "Radio" (template, sem codigo proprio)
        ├── Item CIA2_001
        ├── Item CIA2_002
        └── Item CIA2_003
  └── Detalhamento "TV" (template, sem codigo proprio)
        ├── Item CIA2_004
        └── Item CIA2_005
```

- O detalhamento nao tem codigo sequencial. Seu nome e simplesmente o nome do tipo (ex: "Radio", "TV").
- Cada **item** dentro do detalhamento recebe um codigo sequencial global por linha: `{line_code}_{seq}`. A sequencia e continua entre todos os detalhamentos da mesma linha.
- Esse codigo e armazenado em `item.data.detail_code`.
- A grade de insercoes usa esse codigo como label de cada linha.

## Mudancas Planejadas

### 1. `LineDetailPage.tsx` -- Remover codigo do detalhamento

- Na funcao `handleCreateDetail`: remover a logica que gera `detailCode` e salva em `metadata.detail_code`.
- O nome do detalhamento passa a ser apenas o nome do tipo (ex: `selectedType.name`).
- Remover o bloco de preview que mostra "Codigo do detalhamento: CIA2_001" no formulario de criacao.

### 2. `useLineDetails.ts` -- Gerar codigo sequencial no item

- Na mutacao `createItemMutation`: antes de inserir o item, contar quantos itens ja existem para a mesma linha (todos os detalhamentos vinculados a esta `mediaLineId`) e gerar o proximo codigo sequencial.
- Buscar o `line_code` da linha pai (pode vir do contexto ja disponivel ou de uma query rapida).
- Calcular: `detail_code = {line_code}_{String(existingCount + 1).padStart(3, '0')}`.
- Salvar esse codigo dentro do campo `data` do item: `{ ...jsonData, detail_code }`.

### 3. `DetailBlockTable.tsx` -- Exibir o codigo do item na grade

- Na construcao dos `items` passados ao `GridBlock`, usar `i.data.detail_code` como label (ja e o comportamento atual, so precisa garantir que o valor existe no item e nao no detail).
- Nenhuma mudanca estrutural necessaria aqui, apenas garantir que o fallback `#1, #2...` funcione quando nao houver codigo.

### 4. Abas do detalhamento

- O `TabsTrigger` no `LineDetailPage` passa a exibir apenas o nome do tipo + a quantidade de itens, sem codigo sequencial. Exemplo: "Radio (3)" em vez de "Radio - CIA2_001".

## Secao Tecnica

**Arquivos modificados:**
- `src/pages/LineDetailPage.tsx` -- simplificar `handleCreateDetail` e tabs
- `src/hooks/useLineDetails.ts` -- adicionar geracao de `detail_code` em `createItemMutation`
- `src/components/media-plan/detail-blocks/DetailBlockTable.tsx` -- confirmar que o label do grid item usa `data.detail_code`

**Logica de sequencia global:**
- A contagem sera feita com uma query rapida: total de items ativos em todos os `line_details` vinculados a esta `mediaLineId` via `line_detail_line_links`.
- Isso garante que mesmo com multiplos detalhamentos (Radio, TV, OOH), a numeracao e continua: CIA2_001, CIA2_002, ..., CIA2_00N.

**Nenhuma mudanca de schema no banco** e necessaria -- o `detail_code` ja vive dentro do campo JSONB `data` dos items.
