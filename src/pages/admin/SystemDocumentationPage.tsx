import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Database, 
  Shield, 
  Users, 
  FileText, 
  Settings, 
  Layers,
  Target,
  Tv,
  Clock,
  Filter,
  Image,
  Link2,
  Palette,
  Wallet,
  BarChart3,
  TrendingUp,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function SystemDocumentationPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documentação do Sistema</h1>
            <p className="text-muted-foreground">
              Guia completo de funcionamento, regras e estrutura do AdsPlanning Pro
            </p>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="space-y-8 pr-4">
            {/* Visão Geral */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Visão Geral do Sistema
                </CardTitle>
                <CardDescription>
                  O que é o AdsPlanning Pro e para que serve
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <p>
                  O <strong>AdsPlanning Pro</strong> é uma plataforma completa para gestão de planos de mídia, 
                  desenvolvida para agências de publicidade, equipes de marketing e profissionais de mídia. 
                  O sistema permite criar, gerenciar e acompanhar campanhas publicitárias de forma organizada 
                  e eficiente.
                </p>
                <p>
                  A plataforma oferece funcionalidades que vão desde o planejamento estratégico até o 
                  controle financeiro, passando pela gestão de criativos, taxonomia UTM e relatórios 
                  gerenciais.
                </p>
                
                <h4 className="font-semibold mt-4">Principais Características:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Criação e gestão de planos de mídia com hierarquia personalizável</li>
                  <li>Controle orçamentário com distribuição temporal</li>
                  <li>Gestão de recursos de mídia (criativos)</li>
                  <li>Taxonomia UTM automatizada</li>
                  <li>Módulo financeiro completo (Finance Manager)</li>
                  <li>Dashboard gerencial com visão executiva</li>
                  <li>Sistema de permissões por ambiente</li>
                  <li>Suporte a múltiplos usuários e colaboração</li>
                </ul>
              </CardContent>
            </Card>

            {/* Arquitetura e Tecnologias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Arquitetura e Tecnologias
                </CardTitle>
                <CardDescription>
                  Stack tecnológica e estrutura do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <h4 className="font-semibold">Frontend</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">React 18</Badge>
                  <Badge variant="outline">TypeScript</Badge>
                  <Badge variant="outline">Vite</Badge>
                  <Badge variant="outline">Tailwind CSS</Badge>
                  <Badge variant="outline">shadcn/ui</Badge>
                  <Badge variant="outline">TanStack Query</Badge>
                  <Badge variant="outline">React Router</Badge>
                  <Badge variant="outline">Framer Motion</Badge>
                </div>

                <h4 className="font-semibold">Backend</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">Supabase (PostgreSQL)</Badge>
                  <Badge variant="outline">Row Level Security (RLS)</Badge>
                  <Badge variant="outline">Edge Functions</Badge>
                  <Badge variant="outline">Autenticação JWT</Badge>
                </div>

                <h4 className="font-semibold">Estrutura de Dados</h4>
                <p>
                  O sistema utiliza um banco de dados relacional PostgreSQL gerenciado pelo Supabase, 
                  com políticas de segurança em nível de linha (RLS) para garantir isolamento de dados 
                  entre usuários. Cada usuário só pode acessar seus próprios dados ou dados de ambientes 
                  aos quais foi convidado.
                </p>
              </CardContent>
            </Card>

            {/* Módulos do Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Módulos do Sistema
                </CardTitle>
                <CardDescription>
                  Descrição detalhada de cada módulo disponível
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Planos de Mídia */}
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Planos de Mídia
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Módulo central do sistema. Permite criar e gerenciar planos de mídia com:
                  </p>
                  <ul className="text-sm mt-2 space-y-1 list-disc pl-5">
                    <li><strong>Hierarquia personalizável:</strong> Organize linhas por subdivisão, momento, estágio do funil, meio, veículo, canal, target e formato</li>
                    <li><strong>Linhas de mídia:</strong> Cada linha representa uma ação de mídia com orçamento, datas, KPIs e métricas</li>
                    <li><strong>Distribuição temporal:</strong> Aloque orçamentos por mês com o equalizador temporal</li>
                    <li><strong>Detalhamentos:</strong> Aprofunde linhas específicas com grades de inserção (diária/mensal)</li>
                    <li><strong>Versionamento:</strong> Salve versões do plano para histórico e comparação</li>
                    <li><strong>Status:</strong> Acompanhe o ciclo de vida (rascunho, ativo, finalizado)</li>
                    <li><strong>Colaboração:</strong> Convide membros com diferentes papéis (visualizador, editor, aprovador, admin)</li>
                  </ul>
                </div>

                <Separator />

                {/* Recursos de Mídia */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Recursos de Mídia
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gestão de criativos vinculados às linhas de mídia:
                  </p>
                  <ul className="text-sm mt-2 space-y-1 list-disc pl-5">
                    <li><strong>Criativos:</strong> Cadastre peças publicitárias com nome, tipo, formato e status de produção</li>
                    <li><strong>Datas de controle:</strong> Acompanhe abertura, recebimento e aprovação</li>
                    <li><strong>Links de peças:</strong> Armazene referências para assets e materiais</li>
                    <li><strong>Histórico de alterações:</strong> Log de mudanças nos criativos</li>
                  </ul>
                </div>

                <Separator />

                {/* Taxonomia UTM */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Taxonomia UTM
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Geração automática de parâmetros UTM para rastreamento:
                  </p>
                  <ul className="text-sm mt-2 space-y-1 list-disc pl-5">
                    <li><strong>utm_source:</strong> Gerado a partir do veículo/canal</li>
                    <li><strong>utm_medium:</strong> Baseado no meio de comunicação</li>
                    <li><strong>utm_campaign:</strong> Identificador único do plano</li>
                    <li><strong>utm_content:</strong> Identificação do criativo</li>
                    <li><strong>utm_term:</strong> Termos de segmentação/target</li>
                    <li><strong>Validação:</strong> Sistema de validação de UTMs por linha</li>
                  </ul>
                </div>

                <Separator />

                {/* Finance Manager */}
                <div className="border-l-4 border-emerald-500 pl-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Finance Manager
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Módulo completo de gestão financeira:
                  </p>
                  <ul className="text-sm mt-2 space-y-1 list-disc pl-5">
                    <li><strong>Dashboard:</strong> Visão consolidada de receitas, despesas e indicadores</li>
                    <li><strong>Documentos:</strong> Cadastro de notas fiscais, contratos e comprovantes</li>
                    <li><strong>Pagamentos:</strong> Controle de parcelas e baixas</li>
                    <li><strong>Forecast:</strong> Projeções financeiras por período</li>
                    <li><strong>Realized:</strong> Registro de valores realizados vs. planejados</li>
                    <li><strong>Receitas:</strong> Entrada de receitas por produto/plano</li>
                    <li><strong>Auditoria:</strong> Log completo de alterações financeiras</li>
                    <li><strong>Alertas:</strong> Notificações de vencimentos e desvios</li>
                    <li><strong>Biblioteca:</strong> Cadastros auxiliares (centros de custo, equipes, contas, fornecedores, etc.)</li>
                  </ul>
                </div>

                <Separator />

                {/* Relatórios */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Relatórios
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importação e visualização de dados de performance:
                  </p>
                  <ul className="text-sm mt-2 space-y-1 list-disc pl-5">
                    <li><strong>Importação:</strong> Upload de planilhas com dados de plataformas</li>
                    <li><strong>Mapeamento:</strong> Configuração de colunas para métricas do sistema</li>
                    <li><strong>Visualização:</strong> Tabelas e gráficos de performance</li>
                  </ul>
                </div>

                <Separator />

                {/* Dashboard Gerencial */}
                <div className="border-l-4 border-amber-500 pl-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Dashboard Gerencial
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visão executiva consolidada:
                  </p>
                  <ul className="text-sm mt-2 space-y-1 list-disc pl-5">
                    <li><strong>KPIs globais:</strong> Orçamento total, investimento, planos ativos</li>
                    <li><strong>Distribuição:</strong> Gráficos por meio, veículo, estágio do funil</li>
                    <li><strong>Timeline:</strong> Visão temporal de campanhas</li>
                    <li><strong>Alertas:</strong> Indicadores de atenção do portfólio</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Biblioteca (Configurações) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Biblioteca (Configurações)
                </CardTitle>
                <CardDescription>
                  Cadastros base que alimentam o sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Clientes</p>
                      <p className="text-xs text-muted-foreground">
                        Cadastro de clientes com controle de visibilidade para Planos de Mídia e Finance
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Layers className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Subdivisões de Plano</p>
                      <p className="text-xs text-muted-foreground">
                        Agrupamentos de linhas por região, produto, marca ou objetivo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Momentos de Campanha</p>
                      <p className="text-xs text-muted-foreground">
                        Fases temporais como lançamento, sustentação, promoção
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Filter className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Fases do Funil</p>
                      <p className="text-xs text-muted-foreground">
                        Estágios de conversão: awareness, consideração, conversão, retenção
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Tv className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Meios</p>
                      <p className="text-xs text-muted-foreground">
                        Categorias de mídia: digital, TV, rádio, OOH, impresso
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Tv className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Veículos e Canais</p>
                      <p className="text-xs text-muted-foreground">
                        Plataformas (Google, Meta) e seus canais específicos (Search, Display)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Target className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Segmentação e Target</p>
                      <p className="text-xs text-muted-foreground">
                        Segmentos comportamentais e públicos-alvo específicos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Image className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Formatos e Especificações</p>
                      <p className="text-xs text-muted-foreground">
                        Tipos de peças criativas com dimensões, durações e pesos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Status de Linha</p>
                      <p className="text-xs text-muted-foreground">
                        Estados personalizáveis para linhas de mídia com cores
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Settings className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Configurar Linhas de Mídia</p>
                      <p className="text-xs text-muted-foreground">
                        Tipos de detalhamento com campos personalizáveis e grades de inserção
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sistema de Permissões */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Sistema de Permissões e Segurança
                </CardTitle>
                <CardDescription>
                  Regras de acesso e isolamento de dados
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <h4 className="font-semibold">Níveis de Acesso</h4>
                
                <div className="space-y-4 not-prose">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-red-500">Administrador do Sistema</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Acesso total ao sistema. Pode gerenciar todos os usuários, visualizar qualquer 
                      ambiente (modo "visualizar como"), configurar visibilidade de menus e acessar 
                      esta documentação. Definido na tabela <code>system_admins</code>.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-500">Proprietário do Ambiente</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Usuário que criou a conta. Possui todos os dados e pode convidar membros 
                      para seu ambiente com diferentes níveis de permissão por seção.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">Membro do Ambiente</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Usuário convidado para um ambiente. Permissões configuráveis por seção:
                    </p>
                    <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted-foreground">
                      <li><strong>none:</strong> Sem acesso à seção</li>
                      <li><strong>view:</strong> Apenas visualização</li>
                      <li><strong>edit:</strong> Pode criar e editar</li>
                      <li><strong>full:</strong> Acesso completo incluindo exclusão</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Colaborador de Plano</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Usuário convidado para um plano específico. Papéis disponíveis:
                    </p>
                    <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted-foreground">
                      <li><strong>viewer:</strong> Apenas visualização do plano</li>
                      <li><strong>editor:</strong> Pode editar linhas e dados</li>
                      <li><strong>approver:</strong> Pode aprovar versões</li>
                      <li><strong>admin:</strong> Controle total do plano</li>
                    </ul>
                  </div>
                </div>

                <h4 className="font-semibold mt-6">Seções com Controle de Permissão</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>media_plans:</strong> Planos de Mídia</li>
                  <li><strong>media_resources:</strong> Recursos de Mídia (Criativos)</li>
                  <li><strong>taxonomy:</strong> Taxonomia UTM</li>
                  <li><strong>reports:</strong> Relatórios</li>
                  <li><strong>library:</strong> Biblioteca (Configurações)</li>
                  <li><strong>finance:</strong> Finance Manager</li>
                  <li><strong>executive_dashboard:</strong> Dashboard Gerencial</li>
                </ul>

                <h4 className="font-semibold mt-6">Row Level Security (RLS)</h4>
                <p>
                  Todas as tabelas possuem políticas RLS que garantem que cada usuário só acesse 
                  seus próprios dados ou dados de ambientes aos quais foi convidado. As políticas 
                  verificam o <code>user_id</code> do registro contra o usuário autenticado ou 
                  a existência de um convite válido na tabela <code>environment_members</code>.
                </p>
              </CardContent>
            </Card>

            {/* Fluxo de Trabalho */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Fluxo de Trabalho Típico
                </CardTitle>
                <CardDescription>
                  Como utilizar o sistema do início ao fim
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Configuração Inicial</h4>
                    <p className="text-sm text-muted-foreground">
                      Cadastre clientes, configure meios, veículos, canais, targets e formatos 
                      na Biblioteca. Estes cadastros serão usados em todos os planos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Criação do Plano</h4>
                    <p className="text-sm text-muted-foreground">
                      Use o assistente (wizard) para criar um novo plano informando cliente, 
                      campanha, período, orçamento e KPIs. Ou crie manualmente para mais controle.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">Adição de Linhas</h4>
                    <p className="text-sm text-muted-foreground">
                      Adicione linhas de mídia ao plano, definindo veículo, canal, formato, 
                      target, datas e orçamento. Use o equalizador para distribuição mensal.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold">Detalhamento (Opcional)</h4>
                    <p className="text-sm text-muted-foreground">
                      Para linhas que precisam de controle granular, adicione detalhamentos 
                      com grades de inserção diária ou mensal.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    5
                  </div>
                  <div>
                    <h4 className="font-semibold">Recursos de Mídia</h4>
                    <p className="text-sm text-muted-foreground">
                      Cadastre os criativos vinculados às linhas, acompanhando o status 
                      de produção e aprovação.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    6
                  </div>
                  <div>
                    <h4 className="font-semibold">Taxonomia UTM</h4>
                    <p className="text-sm text-muted-foreground">
                      Gere e valide as UTMs para cada linha/criativo. Exporte para uso 
                      nas plataformas de mídia.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    7
                  </div>
                  <div>
                    <h4 className="font-semibold">Gestão Financeira</h4>
                    <p className="text-sm text-muted-foreground">
                      No Finance Manager, cadastre documentos (NFs), controle pagamentos, 
                      registre valores realizados e acompanhe o forecast.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    8
                  </div>
                  <div>
                    <h4 className="font-semibold">Acompanhamento</h4>
                    <p className="text-sm text-muted-foreground">
                      Use o Dashboard Gerencial para visão executiva e os Relatórios 
                      para análise de performance importando dados das plataformas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regras de Negócio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Regras de Negócio Importantes
                </CardTitle>
                <CardDescription>
                  Comportamentos e validações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded-r-lg">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200">Soft Delete</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    A maioria dos registros não é excluída permanentemente. Ao deletar, eles vão 
                    para a lixeira (campo <code>deleted_at</code>) e podem ser restaurados. 
                    A exclusão permanente só ocorre na lixeira.
                  </p>
                </div>

                <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 rounded-r-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Slugs</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Planos de mídia possuem slugs únicos para URLs amigáveis. O slug é gerado 
                    automaticamente a partir do nome, mas pode ser editado. Planos também podem 
                    ser acessados por ID como fallback.
                  </p>
                </div>

                <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded-r-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Itens de Sistema</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Alguns registros são marcados como <code>is_system = true</code>. Estes são 
                    padrões do sistema e não podem ser editados ou excluídos pelo usuário.
                  </p>
                </div>

                <div className="p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/20 rounded-r-lg">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200">Visibilidade de Clientes</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Clientes podem ter visibilidade configurada. Se <code>visible_for_media_plans = false</code>, 
                    o cliente não aparece na seleção ao criar planos, mas continua disponível no Finance.
                  </p>
                </div>

                <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 rounded-r-lg">
                  <h4 className="font-semibold text-red-800 dark:text-red-200">Dependências</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Canais dependem de Veículos. Ao excluir um veículo, seus canais ficam órfãos. 
                    Linhas de mídia com referências a itens excluídos mantêm o vínculo, mas 
                    novos registros não podem usar esses itens.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Requisitos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Requisitos para Utilização
                </CardTitle>
                <CardDescription>
                  O que é necessário para usar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <h4 className="font-semibold">Requisitos Técnicos</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Navegador moderno (Chrome, Firefox, Safari, Edge - versões recentes)</li>
                  <li>Conexão com a internet</li>
                  <li>JavaScript habilitado</li>
                  <li>Resolução mínima recomendada: 1280x720</li>
                </ul>

                <h4 className="font-semibold mt-4">Requisitos Funcionais</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Conta de usuário válida (email + senha)</li>
                  <li>Permissões adequadas para a seção desejada</li>
                  <li>Para Finance Manager: papel financeiro atribuído</li>
                  <li>Para administração: registro em <code>system_admins</code></li>
                </ul>

                <h4 className="font-semibold mt-4">Boas Práticas Recomendadas</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Configure a Biblioteca antes de criar planos</li>
                  <li>Use nomes descritivos e consistentes</li>
                  <li>Salve versões antes de grandes alterações</li>
                  <li>Valide UTMs antes de usar nas campanhas</li>
                  <li>Mantenha documentos financeiros atualizados</li>
                  <li>Revise permissões de membros periodicamente</li>
                </ul>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pb-8">
              <p>AdsPlanning Pro - Documentação do Sistema</p>
              <p>Última atualização: Janeiro 2026</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
}
