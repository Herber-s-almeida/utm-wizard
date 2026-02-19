# Plano: Redesign do Sistema de Detalhamentos de Mídia

## Status: Fase 5 Concluída ✅ (Todas as fases concluídas)

## Resumo
Substituir o sistema atual de detalhamentos (baseado em `field_schema` dinâmico) por um sistema de **blocos estruturados** com 3 tipos pré-definidos: **OOH**, **Rádio** e **TV**.

## Decisões
- ✅ Substituir os 3 tipos existentes pelos novos
- ✅ Campos herdados: somente leitura
- ✅ Implementar com e sem grade simultaneamente
- ✅ Começar com OOH, Rádio e TV

## Análise Comparativa dos 3 Tipos

### Blocos Compartilhados (idênticos nos 3 tipos)

#### Bloco Campanha
| Coluna | Tipo | Comportamento |
|--------|------|---------------|
| Subdivisão | readonly | Herdado do plano (ordem configurável) |
| Momento | readonly | Herdado do plano (ordem configurável) |
| Fase | readonly | Herdado do plano (ordem configurável) |
| Status | select | Da biblioteca de status |
| COD | readonly | Herdado da linha de mídia |
| Veículo | readonly | Herdado da linha de mídia |
| Meio | readonly | Herdado da linha de mídia |

#### Bloco Financeiro (colapsável, quando recolhido mostra: Total Inserções + $ Total Líquido)
| Coluna | Tipo | Fórmula |
|--------|------|---------|
| Tipo de contratação | text | — |
| Total de inserções (qtd) | number/calc | Sem grade: input manual. Com grade: soma da grade |
| $ Unitário (tabela) | currency | Input |
| $ Total (tabela) | calc | unitário_tabela × total_inserções |
| % Desconto Negociado | percentage | Input (pode ser vazio/zero) |
| $ Unitário (bruto) | calc | unitário_tabela × (1 - desconto%) |
| $ Total Negociado (bruto) | calc | unitário_bruto × total_inserções |
| % Fee de Mídia | percentage | Input (pode ser vazio/zero) |
| $ Fee de Mídia | calc | total_negociado_bruto × fee_midia% |
| $ Total (Líquido) | calc | total_negociado_bruto + fee_midia |
| Produção Estimada (qtd) | number | Input |
| $ Produção Unitária Estimada | currency | Input |
| $ Produção Total Estimada | calc | prod_unitária × prod_qtd |
| % Fee de Produção | percentage | Input (pode ser vazio/zero) |
| $ Fee de Produção | calc | prod_total × fee_prod% |
| $ Total de Produção (líquido) | calc | prod_total + fee_prod |
| $ Total Mídia + Produção | calc | total_líquido + total_prod_líquido |

#### Bloco Período (fixo, sempre visível)
| Coluna | Tipo | Regra |
|--------|------|-------|
| Início | date | Dentro do período do plano |
| Fim | date | Dentro do período do plano, > Início |
| Dias | calc | Fim - Início + 1 |

#### Bloco Grade (quando habilitada) - Meses do Período
- Cada mês é um bloco colapsável (+/-)
- Colunas: dias do mês com dia da semana no header (SEG, TER, QUA...)
- Células: input de inserções por dia
- Dias da semana do item pintam as células correspondentes
- Totais por dia na linha de rodapé

### Campos Específicos no Bloco "Formato e Mensagem" (colapsável, recolhido mostra só Criativo)

#### Campos Compartilhados (todos os tipos)
| Coluna | Tipo | Comportamento |
|--------|------|---------------|
| Formato | select+wizard | Dropdown da biblioteca + wizard de criação |
| Tipo de Criativo | readonly | Herdado do Formato selecionado |
| Dimensão | readonly | Herdado do Formato |
| Tempo de Duração | readonly | Herdado do Formato |
| Criativo – ID | select+wizard | Escolher existente ou criar novo |
| Mensagem | readonly | Herdado do Criativo selecionado |
| Obs. Mensagem | text | Input livre |
| Dias da semana | multi-select | SEG,TER,QUA,QUI,SEX,SAB,DOM |

#### Campos Exclusivos por Tipo
| Campo | OOH | Rádio | TV |
|-------|-----|-------|-----|
| Ponto de OOH | ✅ text | — | — |
| Tipo de ponto OOH | ✅ text | — | — |
| Localização (link) | ✅ url | — | — |
| Programa | — | ✅ text | ✅ text |
| Faixa Horária | — | ✅ text | ✅ text |

### Rodapé de Totais (ambos com/sem grade)
Colunas somadas: Total inserções, $ Total (tabela), $ Total Negociado (bruto), $ Fee Mídia, $ Prod Estimada, $ Fee Produção, $ Total Produção (líq), $ Total Mídia+Produção
Datas: Início = menor data, Fim = maior data, Dias = Fim - Início + 1
Com grade: + Inserções do dia por coluna

## Arquitetura Técnica

### Banco de Dados
- Manter tabelas existentes (`line_detail_types`, `line_details`, `line_detail_items`, `line_detail_insertions`, `line_detail_line_links`)
- Adicionar coluna `detail_category` em `line_detail_types` ('ooh' | 'radio' | 'tv' | 'custom')
- O `field_schema` passa a ser gerado pelo código (não mais configurável pelo usuário para tipos pré-definidos)
- `line_detail_items.data` continua JSONB, mas agora segue o schema do tipo

### Componentes Novos
1. **`src/utils/detailSchemas.ts`** - Definição dos schemas de blocos por tipo
2. **`src/utils/financialCalculations.ts`** - Engine de cálculos financeiros
3. **`src/components/media-plan/detail-blocks/CampaignBlock.tsx`** - Bloco Campanha
4. **`src/components/media-plan/detail-blocks/FormatMessageBlock.tsx`** - Bloco Formato e Mensagem
5. **`src/components/media-plan/detail-blocks/FinancialBlock.tsx`** - Bloco Financeiro
6. **`src/components/media-plan/detail-blocks/PeriodBlock.tsx`** - Bloco Período
7. **`src/components/media-plan/detail-blocks/GridBlock.tsx`** - Grade mensal inline
8. **`src/components/media-plan/DetailBlockTable.tsx`** - Tabela principal com blocos

### Fases de Implementação
1. **Fase 1**: Migration DB + schemas + engine de cálculos
2. **Fase 2**: Componentes de bloco sem grade
3. **Fase 3**: Grade inline com meses colapsáveis
4. **Fase 4**: Integração wizards (formatos/criativos)
5. **Fase 5**: Página de configuração atualizada
