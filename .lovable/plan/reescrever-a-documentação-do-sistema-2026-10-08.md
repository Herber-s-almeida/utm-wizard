# Reescrever a Documentação do Sistema

Atualizar a página "Documentação do Sistema" (Admin) com conteúdo completo e atual, focado em como o plano de mídia é criado, gerenciado e usado. Detalhes de acessos ficam resumidos.

## Nova estrutura (com índice clicável no topo)

1. **Visão geral** — o que é o AdsPlanning Pro, ambientes (multi-empresa), módulos.
2. **Biblioteca de recursos** — Clientes, Subdivisões, Momentos, Fases do Funil, Meios, Veículos, Canais, Segmentações, Objetivos, Formatos > Tipos de Criativo > Especificações, Status, KPIs personalizados. Para cada um: para que serve, onde aparece no plano, slug/UTM, arquivamento e bloqueio de exclusão quando em uso.
3. **Criação do plano** — caminhos (manual, assistente de orçamento, importação de planilha); dados básicos, slug UTM, datas, orçamento total.
4. **Hierarquia e orçamento** — ordem configurável (subdivisão/momento/fase), "distribuir orçamento" vs "agregar", ordem do funil respeitada no agrupamento, cascata de valores, 4 casas decimais, valor em R$ como referência, momento "geral" padrão.
5. **Linhas de mídia** — campos, código da linha, limites de data, orçamento mensal, taxas e fee, linhas "Sem Classificação", códigos duplicados entre momentos.
6. **Detalhamento** — tipos (OOH, Rádio, TV, personalizado), itens, grade de inserções e auto-pintura, motor financeiro (Bruto, Líquido, Honorários, Produção), IDs sequenciais, linhas vinculadas e visão consolidada.
7. **Criativos e recursos de mídia** — ID automático, especificações, histórico de alterações, Kanban, seguidores e notificações por e-mail.
8. **Taxonomia e UTMs** — regras de slug atualizadas (letras maiúsculas/minúsculas, números, `-`, `_`, `.`), montagem de utm_source/medium/campaign/content/term, exportação.
9. **Governança do plano** — status e transições, versões manuais/automáticas, alerta de versão não salva com "não exibir hoje", alertas inteligentes, lixeira e exclusão definitiva, duplicação.
10. **Relatórios e performance** — importação, mapeamento de colunas, métricas, dashboard e cruzamento com linhas.
11. **Financeiro** — documentos, pagamentos, previsões, realizados, receitas, biblioteca financeira e ligação com planos.
12. **Dashboard executivo e configurações do ambiente** — temas, logo, membros (resumo).
13. **Fluxo ponta a ponta** — diagrama do caminho Biblioteca → Plano → Hierarquia → Linhas → Detalhamento/Criativos → UTMs → Relatórios/Financeiro.
14. **Glossário**.

## Detalhes técnicos
- Arquivo: `src/pages/admin/SystemDocumentationPage.tsx`, reescrito integralmente mantendo o layout em cards e cores do tema.
- Conteúdo baseado na leitura dos hooks/páginas atuais (wizard, distribuição de orçamento, detalhamento, utmGenerator, finance) para garantir exatidão.
- Seções divididas em componentes menores no mesmo arquivo para facilitar manutenção.
