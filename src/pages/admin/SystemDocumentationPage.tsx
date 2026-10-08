import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Info, Library, PlusCircle, Layers, ListTree, Grid3x3, Image, Link2,
  ShieldCheck, BarChart3, Wallet, LayoutDashboard, Workflow, BookA, type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface Section {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  content: ReactNode;
}

const H = ({ children }: { children: ReactNode }) => (
  <h4 className="font-semibold text-foreground mt-5 mb-2">{children}</h4>
);
const UL = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-5 space-y-1.5">{children}</ul>
);
const Note = ({ children }: { children: ReactNode }) => (
  <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">{children}</div>
);

function ResourceTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-md border mt-2">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2 font-semibold">Recurso</th>
            <th className="text-left p-2 font-semibold">Para que serve</th>
            <th className="text-left p-2 font-semibold">Como é usado no plano</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b, c]) => (
            <tr key={a} className="border-t align-top">
              <td className="p-2 font-medium whitespace-nowrap">{a}</td>
              <td className="p-2 text-muted-foreground">{b}</td>
              <td className="p-2 text-muted-foreground">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sections: Section[] = [
  {
    id: 'visao-geral',
    title: '1. Visão geral',
    description: 'O que é o AdsPlanning Pro e como ele está organizado',
    icon: Info,
    content: (
      <>
        <p>
          O <strong>AdsPlanning Pro</strong> é uma plataforma de planejamento, execução e controle de mídia.
          Ele conecta a estratégia (orçamento, momentos, funil) à operação (linhas, detalhamentos, criativos,
          UTMs) e ao acompanhamento (relatórios e financeiro), mantendo tudo em uma única fonte de verdade.
        </p>
        <H>Ambientes (multiempresa)</H>
        <p>
          Todos os dados pertencem a um <strong>ambiente</strong> (uma agência, empresa ou cliente). Um usuário pode
          participar de vários ambientes e alternar entre eles pelo seletor no menu lateral; ao trocar, todas as
          listas são recarregadas e nada de um ambiente aparece em outro.
        </p>
        <H>Módulos</H>
        <UL>
          <li><strong>Biblioteca</strong> — cadastros reutilizáveis que alimentam os planos.</li>
          <li><strong>Planos de Mídia</strong> — criação, hierarquia de orçamento, linhas e detalhamentos.</li>
          <li><strong>Recursos de Mídia</strong> — criativos em lista e Kanban, com notificações.</li>
          <li><strong>Taxonomia</strong> — UTMs geradas automaticamente e exportáveis.</li>
          <li><strong>Relatórios</strong> — importação de resultados e painel de performance.</li>
          <li><strong>Financeiro</strong> — documentos, pagamentos, previsões e realizado.</li>
          <li><strong>Dashboard Executivo</strong> — visão consolidada de todos os planos.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'biblioteca',
    title: '2. Biblioteca de recursos',
    description: 'Os cadastros que compõem um plano de mídia',
    icon: Library,
    content: (
      <>
        <p>
          A Biblioteca guarda as peças reutilizáveis do ambiente. Os planos nunca digitam esses valores livremente:
          eles <strong>referenciam</strong> itens da Biblioteca, o que garante padronização de nomes, relatórios
          comparáveis e UTMs consistentes.
        </p>
        <ResourceTable
          rows={[
            ['Clientes', 'Anunciantes atendidos.', 'Vinculado ao plano; filtra as segmentações disponíveis para aquele cliente.'],
            ['Subdivisões', 'Recortes como região, produto, unidade ou curso.', 'Nível opcional da hierarquia; recebe parte do orçamento e entra na UTM de campanha.'],
            ['Momentos', 'Fases temporais (lançamento, sustentação, captação...).', 'Nível opcional da hierarquia com datas próprias; se não houver, usa-se o momento "geral".'],
            ['Fases do Funil', 'Etapas como Topo, Meio e Fundo (personalizáveis e ordenáveis).', 'Nível da hierarquia; a ordem definida no plano é respeitada no agrupamento.'],
            ['Meios', 'Tipo de mídia: Digital, OOH, Rádio, TV, Impresso...', 'Classifica a linha e define se ela terá detalhamento.'],
            ['Veículos', 'Onde a mídia roda (Google, Meta, Globo, Eletromidia...).', 'Escolhido na linha; seu slug alimenta o utm_source.'],
            ['Canais', 'Subdivisão do veículo (Search, Feed, Stories...).', 'Escolhido na linha; seu slug alimenta o utm_medium.'],
            ['Segmentações', 'Públicos/targets, com idade, gênero, localização e comportamento.', 'Escolhida na linha; seu slug alimenta o utm_term.'],
            ['Objetivos', 'Objetivos de mídia (alcance, tráfego, conversão).', 'Classificação estratégica da linha e dos relatórios.'],
            ['Formatos → Tipos de Criativo → Especificações', 'Estrutura técnica das peças: dimensões, extensões, campos de texto.', 'Usada nos criativos e preenchida automaticamente no detalhamento.'],
            ['Status', 'Situações de linhas e recursos (rascunho, aprovado, no ar...).', 'Controla o andamento das linhas e as colunas do Kanban.'],
            ['KPIs personalizados', 'Métricas próprias além das padrão.', 'Até 10 por plano, com metas acompanhadas nos relatórios.'],
            ['Tipos de Detalhamento', 'Moldes de campos para OOH, Rádio, TV ou personalizados.', 'Definem as colunas do detalhamento de uma linha.'],
          ]}
        />
        <H>Regras comuns</H>
        <UL>
          <li>Cada item recebe um <strong>slug</strong> automático (editável) usado em URLs e UTMs.</li>
          <li>Itens em uso por algum plano não podem ser excluídos; podem ser <strong>arquivados</strong>.</li>
          <li>Itens excluídos vão para a <strong>Lixeira</strong> e podem ser restaurados.</li>
          <li>A Biblioteca pode ser exportada e importada por planilha.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'criacao',
    title: '3. Criação do plano',
    description: 'Os caminhos para iniciar um plano de mídia',
    icon: PlusCircle,
    content: (
      <>
        <H>Três formas de criar</H>
        <UL>
          <li><strong>Assistente com orçamento</strong> — passo a passo: dados básicos → escolha e ordem da hierarquia → distribuição de verba em cada nível → revisão. É o caminho recomendado.</li>
          <li><strong>Manual</strong> — cria o plano só com os dados básicos; a estrutura e as linhas são montadas depois.</li>
          <li><strong>Importação de planilha</strong> — envia um arquivo, mapeia as colunas e o sistema identifica (ou cria) os itens da Biblioteca correspondentes antes de gerar plano e linhas.</li>
        </UL>
        <H>Dados básicos</H>
        <UL>
          <li>Nome, cliente, campanha, datas de início e fim, orçamento total, objetivos, URL padrão e KPIs.</li>
          <li><strong>Slug UTM da campanha</strong> — gerado a partir do nome e editável; é a base do utm_campaign.</li>
          <li>O rascunho do assistente é salvo automaticamente e pode ser retomado.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'hierarquia',
    title: '4. Hierarquia e orçamento',
    description: 'Como a verba é dividida em cascata',
    icon: Layers,
    content: (
      <>
        <p>
          Cada plano escolhe até três níveis — <strong>Subdivisão</strong>, <strong>Momento</strong> e{' '}
          <strong>Fase do Funil</strong> — e em qual <strong>ordem</strong> eles aparecem. Ex.: Subdivisão → Momento → Funil,
          ou Momento → Funil.
        </p>
        <H>Distribuir ou agregar</H>
        <UL>
          <li><strong>Distribuir orçamento</strong>: o nível recebe uma fatia da verba do nível acima (em % ou R$).</li>
          <li><strong>Agregar</strong>: o nível apenas organiza; seu valor é a soma das linhas abaixo.</li>
        </UL>
        <H>Regras de cálculo</H>
        <UL>
          <li>O valor absoluto em R$ é a referência; a porcentagem é derivada dele.</li>
          <li>Precisão de 4 casas decimais para evitar diferenças de arredondamento.</li>
          <li>Os filhos de um nó não podem somar mais que o próprio nó; o sistema alerta excessos.</li>
          <li>A ordem das fases do funil definida no plano é salva e usada em todas as visões agrupadas.</li>
          <li>Os momentos aparecem numa linha do tempo com várias faixas, mostrando sobreposições.</li>
        </UL>
        <Note>A hierarquia pode ser alterada depois em "Editar plano"; as distribuições são recalculadas mantendo os valores existentes sempre que possível.</Note>
      </>
    ),
  },
  {
    id: 'linhas',
    title: '5. Linhas de mídia',
    description: 'O item operacional do plano',
    icon: ListTree,
    content: (
      <>
        <p>
          A <strong>linha</strong> é cada compra de mídia: une um ponto da hierarquia (subdivisão/momento/fase) a
          veículo, canal, formato, segmentação, objetivo, período e verba.
        </p>
        <H>Principais campos</H>
        <UL>
          <li><strong>Código da linha</strong> — identificador curto usado na taxonomia e nos relatórios. Pode repetir entre momentos diferentes (fluxo de código duplicado confirma a intenção).</li>
          <li><strong>Datas</strong> — obrigatoriamente dentro do período do plano.</li>
          <li><strong>Orçamento</strong> — editável direto na tabela; pode ser dividido mês a mês.</li>
          <li><strong>Fee e impostos</strong> — percentual de honorários e coluna de taxas calculada.</li>
          <li><strong>Métricas planejadas</strong> — impressões, cliques, CTR, CPC, CPM, conversões.</li>
          <li><strong>URL de destino</strong> e UTMs geradas automaticamente.</li>
        </UL>
        <H>Visualização</H>
        <UL>
          <li>Tabela plana ou agrupada pela hierarquia, com colunas redimensionáveis e totais por grupo.</li>
          <li>Linhas sem classificação ficam no grupo "Sem Classificação".</li>
          <li>Filtros por veículo, canal, status, entre outros (sem filtro de datas por decisão de produto).</li>
          <li>Exportação para Excel.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'detalhamento',
    title: '6. Detalhamento',
    description: 'Do plano ao pedido de inserção',
    icon: Grid3x3,
    content: (
      <>
        <p>
          O detalhamento é a camada abaixo da linha, usada principalmente em mídia offline (OOH, Rádio, TV) para
          descrever exatamente o que foi comprado — o equivalente a um PI.
        </p>
        <H>Estrutura</H>
        <UL>
          <li><strong>Detalhamento</strong> — instância ligada a uma linha e a um tipo.</li>
          <li><strong>Itens</strong> — cada painel, programa ou praça, com seus campos próprios.</li>
          <li><strong>Inserções</strong> — grade diária com quantidade de inserções por dia.</li>
        </UL>
        <H>Tipos de detalhamento</H>
        <p>Moldes predefinidos (OOH, Rádio, TV) ou personalizados, com campos de texto, número, moeda, percentual, data, hora, seleção e fórmulas.</p>
        <H>Motor financeiro</H>
        <UL>
          <li>Valor de tabela × quantidade → total de tabela.</li>
          <li>Desconto negociado → bruto negociado unitário e total.</li>
          <li>Honorário de mídia (%) → total líquido.</li>
          <li>Produção bruta, honorário de produção e produção líquida.</li>
          <li>Total geral = mídia líquida + produção líquida; tudo com 4 casas decimais.</li>
        </UL>
        <H>Automação</H>
        <UL>
          <li>IDs sequenciais por linha (ex.: CIA2_001, CIA2_002).</li>
          <li>Pintura automática da grade pelos dias da semana escolhidos.</li>
          <li>Formatos e criativos preenchidos a partir da Biblioteca.</li>
          <li>Um detalhamento pode ser vinculado a várias linhas; a visão consolidada mostra itens das linhas irmãs.</li>
          <li>Tela dividida: tabela de itens e grade lado a lado.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'criativos',
    title: '7. Criativos e recursos de mídia',
    description: 'Peças vinculadas às linhas',
    icon: Image,
    content: (
      <UL>
        <li>Cada criativo recebe um ID automático e fica ligado a uma linha, a um formato e a um tipo de criativo.</li>
        <li>As especificações técnicas (dimensões, extensões, limites de texto) vêm da Biblioteca.</li>
        <li>Toda alteração é registrada em histórico (quem, quando, o que mudou).</li>
        <li>A tela de Recursos de Mídia mostra os criativos em lista ou Kanban por status.</li>
        <li>Usuários podem seguir um plano e receber e-mails quando seus recursos mudam.</li>
        <li>Cada criativo gera seu utm_content na taxonomia.</li>
      </UL>
    ),
  },
  {
    id: 'utm',
    title: '8. Taxonomia e UTMs',
    description: 'Rastreamento padronizado e automático',
    icon: Link2,
    content: (
      <>
        <H>Como cada parâmetro é montado</H>
        <UL>
          <li><strong>utm_source</strong> — slug do veículo.</li>
          <li><strong>utm_medium</strong> — slug do canal.</li>
          <li><strong>utm_campaign</strong> — código da linha + slug da campanha + subdivisão + momento + fase do funil.</li>
          <li><strong>utm_content</strong> — identificação do criativo/formato.</li>
          <li><strong>utm_term</strong> — slug da segmentação.</li>
        </UL>
        <H>Regras de slug</H>
        <UL>
          <li>Permitidos: letras maiúsculas e minúsculas, números, hífen (-), sublinhado (_) e ponto (.).</li>
          <li>Acentos são removidos; espaços e demais símbolos viram hífen.</li>
          <li>A mesma regra vale para todos os campos de slug do sistema.</li>
        </UL>
        <p className="mt-2">A tela de Taxonomia lista todas as URLs finais por plano e permite exportá-las para Excel.</p>
      </>
    ),
  },
  {
    id: 'governanca',
    title: '9. Governança do plano',
    description: 'Status, versões, alertas e lixeira',
    icon: ShieldCheck,
    content: (
      <UL>
        <li><strong>Status</strong>: Rascunho, Ativo, Pausado, Finalizado — com transições configuráveis e histórico.</li>
        <li><strong>Versões</strong>: manuais (salvas pelo usuário) e automáticas (em mudanças de status e alterações relevantes). Podem ser comparadas e restauradas, incluindo dados de detalhamento.</li>
        <li><strong>Alerta de versão não salva</strong>: avisa ao sair com mudanças sem versão; a opção "Não exibir mais hoje" silencia até o dia seguinte.</li>
        <li><strong>Alertas inteligentes</strong>: verba excedida, linhas sem criativo, datas fora do período, entre outros.</li>
        <li><strong>Duplicação</strong>: copia plano, hierarquia, linhas e criativos.</li>
        <li><strong>Lixeira</strong>: exclusão é reversível; a exclusão definitiva (com todos os dados ligados) é restrita a administradores.</li>
        <li><strong>Permissões</strong>: cada membro tem nível de acesso por módulo (sem acesso, visualizar, editar); quem só visualiza vê tudo bloqueado para edição.</li>
      </UL>
    ),
  },
  {
    id: 'relatorios',
    title: '10. Relatórios e performance',
    description: 'Comparação entre planejado e realizado',
    icon: BarChart3,
    content: (
      <UL>
        <li>Importação de resultados por planilha ou fonte de dados, com mapeamento de colunas salvo para reuso.</li>
        <li>Os dados são categorizados (mídia, conversão, analytics) e métricas calculadas (CTR, CPC, CPM, CPA) são geradas automaticamente.</li>
        <li>O cruzamento com o plano é feito pelos parâmetros UTM e pelo código da linha.</li>
        <li>Painel com KPIs, linha do tempo, quebra pela hierarquia e alertas de performance.</li>
        <li>Grandes volumes são carregados de forma paginada.</li>
      </UL>
    ),
  },
  {
    id: 'financeiro',
    title: '11. Financeiro',
    description: 'Controle financeiro dos planos',
    icon: Wallet,
    content: (
      <UL>
        <li><strong>Documentos</strong>: notas e faturas com fornecedor, centro de custo, classificação e fluxo de aprovação.</li>
        <li><strong>Pagamentos</strong>: registro de pagamentos parciais ou totais por documento.</li>
        <li><strong>Previsão (forecast)</strong>: gerada a partir do orçamento das linhas, mês a mês.</li>
        <li><strong>Realizado e receitas</strong>: lançamentos efetivos para cálculo de pacing.</li>
        <li><strong>Biblioteca financeira</strong>: contas, centros de custo, fornecedores, pacotes, equipes, status etc.</li>
        <li>Alertas configuráveis, auditoria de alterações e exportações para Excel.</li>
        <li>Usuários do financeiro têm leitura dos planos para vincular documentos às linhas.</li>
      </UL>
    ),
  },
  {
    id: 'executivo',
    title: '12. Dashboard executivo e ambiente',
    description: 'Visão consolidada e configurações',
    icon: LayoutDashboard,
    content: (
      <UL>
        <li>Dashboard executivo com investimento total, distribuição por cliente, veículo e status, e evolução temporal.</li>
        <li>Configurações do ambiente: dados da empresa, logotipo, tema visual e membros.</li>
        <li>Administradores podem esconder itens de menu e convidar membros por e-mail (com link manual de reserva).</li>
      </UL>
    ),
  },
  {
    id: 'fluxo',
    title: '13. Fluxo ponta a ponta',
    description: 'Como as partes se conectam',
    icon: Workflow,
    content: (
      <>
        <pre className="text-xs bg-muted/50 rounded-md p-4 overflow-x-auto leading-relaxed">{`Biblioteca (clientes, subdivisões, momentos, funil, veículos, canais, segmentações, formatos)
   │
   ▼
Plano de Mídia (dados básicos + slug + orçamento total)
   │
   ▼
Hierarquia (ordem dos níveis + distribuição da verba em cascata)
   │
   ▼
Linhas de Mídia (veículo, canal, segmentação, período, verba, código)
   │                         │
   ▼                         ▼
Detalhamento (itens,     Criativos (formatos, especificações, Kanban)
grade, financeiro)           │
   │                         ▼
   │                 Taxonomia (UTMs automáticas)
   ▼                         │
Financeiro ◄─────────────────┴──► Relatórios (planejado x realizado)
   │                                    │
   └──────────► Dashboard Executivo ◄───┘`}</pre>
        <ol className="list-decimal pl-5 space-y-1.5 mt-4">
          <li>Cadastre os recursos na Biblioteca.</li>
          <li>Crie o plano pelo assistente e defina a hierarquia e a verba.</li>
          <li>Adicione as linhas em cada ponto da hierarquia.</li>
          <li>Detalhe as linhas offline e cadastre os criativos.</li>
          <li>Exporte as UTMs e coloque as campanhas no ar.</li>
          <li>Salve versões, acompanhe alertas e mude o status.</li>
          <li>Importe resultados e lance os documentos financeiros.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'glossario',
    title: '14. Glossário',
    description: 'Termos usados no sistema',
    icon: BookA,
    content: (
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
        {[
          ['Ambiente', 'Espaço isolado de dados de uma empresa.'],
          ['Slug', 'Versão do nome própria para URLs e UTMs.'],
          ['Hierarquia', 'Ordem dos níveis que dividem a verba.'],
          ['Distribuição', 'Fatia de verba atribuída a um nível.'],
          ['Linha', 'Uma compra de mídia dentro do plano.'],
          ['Código da linha', 'Identificador curto da linha.'],
          ['Detalhamento', 'Descrição item a item de uma linha (PI).'],
          ['Inserção', 'Veiculação em um dia específico.'],
          ['Bruto / Líquido', 'Valor antes e depois do honorário.'],
          ['Fee / Honorário', 'Percentual de remuneração da agência.'],
          ['Versão', 'Fotografia do plano em um momento.'],
          ['Pacing', 'Ritmo de gasto real contra o previsto.'],
        ].map(([t, d]) => (
          <div key={t}>
            <dt className="font-medium text-foreground">{t}</dt>
            <dd className="text-muted-foreground">{d}</dd>
          </div>
        ))}
      </dl>
    ),
  },
];

export default function SystemDocumentationPage() {
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documentação do Sistema</h1>
            <p className="text-muted-foreground">Como o AdsPlanning Pro cria, gerencia e utiliza os planos de mídia</p>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="space-y-6 pr-4 pb-10">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Índice</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {sections.map((s) => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted py-1"
                    onClick={() => goTo(s.id)}
                  >
                    {s.title}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            {sections.map((s) => (
              <Card key={s.id} id={s.id} className="scroll-mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <s.icon className="h-5 w-5 text-primary" />
                    {s.title}
                  </CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground">
                  {s.content}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
}
