import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, ArrowRight, Zap, AlertTriangle, Settings2, 
  Target, Layers, FileText, BarChart3, PieChart, Calendar, 
  Tag, CheckCircle2, Users, Building2, GraduationCap, Briefcase, 
  Network, Play, HelpCircle, ChevronDown, DollarSign, Shield,
  FileSpreadsheet, Link2, Megaphone
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "O que é o AdsPlanning Pro?",
    answer: "O AdsPlanning Pro é um sistema completo de planejamento de mídia que organiza todo o ciclo de vida de um plano — desde a definição estratégica, passando pela distribuição de orçamento, até a gestão de criativos, taxonomia UTM e controle financeiro. Diferente de planilhas, o sistema oferece estrutura, consistência e auditabilidade em todas as etapas."
  },
  {
    question: "Como funciona a estrutura de um plano de mídia?",
    answer: "Um plano de mídia no sistema é composto por informações gerais (nome, cliente, período, orçamento total), subdivisões opcionais (praças, produtos, campanhas), fases de funil (awareness, consideração, conversão, retenção) e linhas de mídia. Cada linha representa uma ação tática com meio, veículo, canal, formato, período, orçamento e métricas associadas."
  },
  {
    question: "Quais são as formas de criar um plano?",
    answer: "Existem duas abordagens: o planejamento estratégico (top-down), onde você define o orçamento total e vai distribuindo por subdivisões, fases e tempo; e o planejamento linha por linha (bottom-up), onde você adiciona ações táticas uma a uma. Em ambos os casos, o resultado é um plano unificado e totalmente editável."
  },
  {
    question: "O que são subdivisões de plano?",
    answer: "Subdivisões permitem segmentar o plano em partes lógicas como praças geográficas, produtos, marcas ou momentos de campanha. Cada subdivisão pode ter seu próprio orçamento e distribuição temporal, facilitando a gestão de planos complexos com múltiplas frentes de investimento."
  },
  {
    question: "Como funciona o detalhamento de linhas?",
    answer: "Algumas entregas de mídia precisam de detalhamento adicional, como programação semanal, inserções diárias ou ações pontuais. O sistema permite criar tipos de detalhamento personalizados com campos configuráveis, onde você pode aprofundar cada linha do plano em suas entregas pormenorizadas."
  },
  {
    question: "O que é a biblioteca de configuração?",
    answer: "A biblioteca contém todos os elementos configuráveis do sistema: meios (digital, TV, OOH), veículos (Google, Meta, Globo), formatos, tipos criativos, especificações técnicas, fases de funil, momentos de campanha, públicos-alvo e segmentações. Esses elementos são reutilizáveis em todos os planos e garantem padronização."
  },
  {
    question: "Como funciona a taxonomia UTM?",
    answer: "O sistema gera automaticamente parâmetros UTM para cada linha de mídia com base nas configurações definidas. Você pode personalizar source, medium, campaign, content e term, garantindo rastreabilidade completa no analytics. Os UTMs podem ser exportados e validados antes da implementação."
  },
  {
    question: "O que é o módulo de recursos de mídia?",
    answer: "Recursos de mídia são os criativos vinculados às linhas do plano. Cada recurso pode ter tipo, formato, especificação, copy, link da peça, datas de abertura, recebimento e aprovação, além do status de produção. Isso conecta a estratégia à execução criativa de forma rastreável."
  },
  {
    question: "Como funciona o módulo financeiro?",
    answer: "O módulo financeiro permite gestão completa de documentos (contratos, notas fiscais, propostas), pagamentos parcelados, fornecedores, forecast de gastos e acompanhamento de receitas. Inclui alertas configuráveis para vencimentos e desvios, além de relatórios de pacing para comparar planejado vs. realizado."
  },
  {
    question: "É possível ter múltiplos usuários trabalhando no mesmo plano?",
    answer: "Sim. O sistema suporta colaboração com diferentes papéis: proprietário (controle total), editor (pode modificar), visualizador (apenas leitura) e aprovador. Cada usuário pode ser convidado para planos específicos ou ter acesso ao ambiente completo através de convites por e-mail."
  },
  {
    question: "Como funciona o sistema de permissões?",
    answer: "O sistema possui dois níveis de permissão: por ambiente (acesso às seções do sistema como planos, biblioteca, finanças) e por plano (papel do usuário em cada plano específico). Administradores do sistema têm acesso irrestrito e podem configurar a visibilidade de menus e funcionalidades."
  },
  {
    question: "Posso exportar os dados do sistema?",
    answer: "Sim. Planos de mídia podem ser exportados para Excel com todas as linhas e detalhamentos. A taxonomia UTM pode ser exportada separadamente. O módulo financeiro permite exportar forecast, pacing e relatórios de pagamentos. A biblioteca também pode ser exportada e importada entre ambientes."
  },
  {
    question: "O que é o dashboard executivo?",
    answer: "O dashboard executivo oferece uma visão consolidada de todos os planos ativos, com indicadores de orçamento total, distribuição por fase do funil, status das linhas e alertas pendentes. É ideal para gestores que precisam de uma visão macro sem entrar em cada plano individualmente."
  },
  {
    question: "Como funcionam os relatórios?",
    answer: "O módulo de relatórios permite importar dados de performance (impressões, cliques, conversões, custos) e consolidá-los com os dados planejados. Isso possibilita análises de desvio entre planejado e realizado, identificação de oportunidades e ajustes táticos baseados em dados reais."
  },
  {
    question: "O sistema funciona para mídia offline também?",
    answer: "Sim. A estrutura é agnóstica ao tipo de mídia. Você pode cadastrar meios como TV, rádio, OOH, jornal, revista, eventos e criar linhas de mídia com formatos, inserções e orçamentos específicos para cada um. O sistema trata digital e offline de forma unificada."
  },
  {
    question: "É possível versionar os planos?",
    answer: "Sim. O sistema mantém histórico de versões com snapshots completos do plano. Você pode salvar versões manualmente com comentários explicativos, comparar versões e restaurar estados anteriores se necessário. Isso garante auditabilidade e rastreabilidade de mudanças."
  }
];

export default function Index() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[180px]" />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 92, 246, 0.1) 2px, rgba(139, 92, 246, 0.1) 4px)'
          }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-purple-500/20 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">AdsPlanning Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-purple-500/30">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO — PROPOSTA DE VALOR */}
      <section className="pt-32 pb-20 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-6 backdrop-blur-sm"
            >
              <Zap className="w-4 h-4 text-fuchsia-400" />
              Sistema Completo de Planejamento de Mídia
            </motion.div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              <span className="text-white">Planejamento de mídia,</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                do jeito que a estratégia exige.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-purple-100 mb-4 max-w-3xl mx-auto font-medium">
              Crie planos de mídia estruturados, consistentes e editáveis — do orçamento ao criativo, da taxonomia UTM ao controle financeiro — em um único sistema.
            </p>
            
            <p className="text-lg text-purple-200/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              O AdsPlanning Pro organiza decisões táticas, distribuições de orçamento, estruturas criativas, rastreabilidade de campanhas e gestão financeira sem planilhas, improvisos ou retrabalho.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="xl" className="gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-xl shadow-purple-500/30 px-8">
                    Criar um plano
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </Link>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <a href="#faq">
                  <Button size="xl" variant="outline" className="gap-2 border-purple-500/40 text-purple-200 hover:bg-purple-500/10 hover:border-purple-400/60 hover:text-white backdrop-blur-sm">
                    <HelpCircle className="w-4 h-4" />
                    Saiba mais
                  </Button>
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. O PROBLEMA — POR QUE O AdsPlanning Pro EXISTE */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-transparent" />
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full text-red-300 text-sm font-medium mb-4">
                <AlertTriangle className="w-4 h-4" />
                O Problema
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
                Planejar mídia ficou complexo demais para planilhas.
              </h2>
              <p className="text-purple-200/60 text-lg max-w-3xl mx-auto">
                Hoje, um plano de mídia envolve múltiplos canais, fases de funil, formatos criativos, subdivisões por praça, produto e momento de campanha, além de rastreabilidade UTM e controle financeiro. Planilhas não foram feitas para sustentar essa complexidade — e a falta de estrutura cobra seu preço.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                'Regras implícitas difíceis de manter e explicar',
                'Orçamentos pouco auditáveis e sem forecast',
                'Criativos desconectados da estratégia',
                'UTMs inconsistentes e sem padronização',
                'Ajustes manuais que geram erro e retrabalho',
                'Falta de visão consolidada para gestores',
              ].map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-[#12121a]/60 border border-red-500/20 rounded-xl"
                >
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-purple-100">{point}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. COMO FUNCIONA — O MODELO DO PRODUTO */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-4">
              <Settings2 className="w-4 h-4" />
              Como Funciona
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
              Um sistema pensado para organizar decisões, não apenas registrar dados.
            </h2>
            <p className="text-purple-200/60 text-lg max-w-3xl mx-auto">
              O AdsPlanning Pro transforma o planejamento de mídia em um processo lógico, estruturado e reutilizável — da definição estratégica até as linhas táticas do plano, passando por criativos, UTMs e controle financeiro.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { icon: Target, text: 'Planejamento guiado por lógica, não por fórmulas' },
              { icon: Layers, text: 'Estrutura única para mídia digital e offline' },
              { icon: Network, text: 'Tudo conectado: plano, linhas, criativos, UTMs e finanças' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 bg-[#12121a]/60 border border-purple-500/20 rounded-2xl hover:border-purple-400/40 transition-colors"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-purple-100 font-medium">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FORMAS DE PLANEJAR — FLEXIBILIDADE COM CONSISTÊNCIA */}
      <section className="py-20 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full text-fuchsia-300 text-sm font-medium mb-4">
              <Layers className="w-4 h-4" />
              Formas de Planejar
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
              Planeje como você prefere. O resultado é o mesmo.
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-6 bg-[#12121a]/80 border border-purple-500/20 rounded-2xl hover:border-purple-400/40 transition-colors"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3 text-white">Planejamento a partir do budget</h3>
              <p className="text-purple-200/60 mb-4">
                Comece pelo orçamento total, defina objetivos, crie subdivisões (praças, produtos, campanhas), distribua por fases do funil e tempo, gerando linhas de mídia automaticamente.
              </p>
              <span className="text-sm text-purple-400 font-medium">Ideal para planejamento estratégico e visão macro.</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-6 bg-[#12121a]/80 border border-fuchsia-500/20 rounded-2xl hover:border-fuchsia-400/40 transition-colors"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-fuchsia-500/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3 text-white">Planejamento linha por linha</h3>
              <p className="text-purple-200/60 mb-4">
                Construa o plano ação por ação, com total controle sobre cada decisão tática, adicionando linhas de mídia manualmente com todos os detalhes necessários.
              </p>
              <span className="text-sm text-fuchsia-400 font-medium">Ideal para planos mais operacionais ou incrementais.</span>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center text-purple-200/60 max-w-2xl mx-auto"
          >
            Independentemente do caminho, o resultado é um plano único, consolidado, versionado e totalmente editável.
          </motion.p>
        </div>
      </section>

      {/* 5. MÓDULOS DO SISTEMA */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-900/5 to-transparent" />
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-300 text-sm font-medium mb-4">
                <Layers className="w-4 h-4" />
                Módulos do Sistema
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
                Tudo o que você precisa em um só lugar.
              </h2>
              <p className="text-purple-200/60 text-lg max-w-3xl mx-auto">
                O AdsPlanning Pro integra planejamento, execução criativa, rastreabilidade e gestão financeira em módulos conectados.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                { 
                  icon: FileText, 
                  title: 'Planos de Mídia', 
                  text: 'Crie planos estruturados com subdivisões, fases de funil, distribuição temporal e linhas de mídia detalhadas.' 
                },
                { 
                  icon: Megaphone, 
                  title: 'Recursos de Mídia', 
                  text: 'Gerencie criativos vinculados às linhas do plano, com tipos, formatos, especificações e status de produção.' 
                },
                { 
                  icon: Link2, 
                  title: 'Taxonomia UTM', 
                  text: 'Gere e valide parâmetros UTM automaticamente para rastreabilidade completa no analytics.' 
                },
                { 
                  icon: DollarSign, 
                  title: 'Módulo Financeiro', 
                  text: 'Controle documentos, pagamentos, fornecedores, forecast e pacing com alertas configuráveis.' 
                },
                { 
                  icon: BarChart3, 
                  title: 'Relatórios', 
                  text: 'Importe dados de performance e compare planejado vs. realizado para ajustes táticos.' 
                },
                { 
                  icon: PieChart, 
                  title: 'Dashboard Executivo', 
                  text: 'Visão consolidada de todos os planos com indicadores, distribuições e alertas pendentes.' 
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="p-5 bg-[#12121a]/60 border border-violet-500/20 rounded-xl hover:border-violet-400/40 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-white mb-2">{item.title}</h3>
                  <p className="text-purple-200/60 text-sm">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. CONTROLE — O QUE VOCÊ GERENCIA NO AdsPlanning Pro */}
      <section className="py-20 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full text-green-300 text-sm font-medium mb-4">
                <CheckCircle2 className="w-4 h-4" />
                Controle
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
                Controle total sobre o que importa.
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: BarChart3, text: 'Orçamento total e percentual por linha' },
                { icon: Target, text: 'Distribuição por fase do funil' },
                { icon: Calendar, text: 'Planejamento por momentos de campanha' },
                { icon: Layers, text: 'Estrutura criativa padronizada' },
                { icon: Tag, text: 'Identificadores únicos por linha' },
                { icon: Link2, text: 'Taxonomia UTM automática e validável' },
                { icon: DollarSign, text: 'Forecast financeiro e pacing' },
                { icon: Shield, text: 'Versionamento e auditabilidade' },
                { icon: Users, text: 'Colaboração com papéis definidos' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center gap-3 p-4 bg-[#12121a]/60 border border-green-500/20 rounded-xl hover:border-green-400/40 transition-colors"
                >
                  <item.icon className="w-5 h-5 text-green-400" />
                  <span className="text-purple-100 text-sm">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 7. PARA QUEM É — PERFIL DE USO */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                Para Quem É
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
                Feito para quem leva planejamento a sério.
              </h2>
              <p className="text-purple-200/60 text-lg max-w-3xl mx-auto">
                O AdsPlanning Pro foi criado para estruturas que precisam transformar estratégia em plano executável, com clareza, método e consistência.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Users, text: 'Times de marketing e mídia' },
                { icon: Building2, text: 'Agências de publicidade e mídia' },
                { icon: GraduationCap, text: 'Universidades e instituições de ensino' },
                { icon: Briefcase, text: 'Profissionais que precisam justificar decisões' },
                { icon: Network, text: 'Estruturas com múltiplos canais e produtos' },
                { icon: FileSpreadsheet, text: 'Quem quer sair do caos das planilhas' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-[#12121a]/60 border border-purple-500/20 rounded-xl hover:border-purple-400/40 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-purple-100">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq" className="py-20 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full text-fuchsia-300 text-sm font-medium mb-4">
                <HelpCircle className="w-4 h-4" />
                Perguntas Frequentes
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
                Tire suas dúvidas sobre o sistema.
              </h2>
              <p className="text-purple-200/60 text-lg max-w-3xl mx-auto">
                Entenda como o AdsPlanning Pro funciona e como ele pode transformar seu planejamento de mídia.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-[#12121a]/60 border border-purple-500/20 rounded-xl px-6 data-[state=open]:border-purple-400/40 transition-colors"
                >
                  <AccordionTrigger className="text-left text-purple-100 hover:text-white hover:no-underline py-5">
                    <span className="pr-4">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-purple-200/70 pb-5 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* 9. ENCERRAMENTO — CHAMADA FINAL */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent" />
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-fuchsia-600/20 to-purple-600/20 blur-3xl" />
              <div className="relative bg-[#12121a]/60 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-10">
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
                  Planejar mídia não precisa ser confuso.
                </h2>
                <p className="text-purple-200/60 text-lg mb-8">
                  O AdsPlanning Pro organiza a complexidade do planejamento de mídia em um sistema claro, consistente e pronto para evoluir com sua estratégia — do orçamento ao criativo, do UTM ao financeiro.
                </p>
                <Link to="/auth">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button size="xl" className="gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-xl shadow-purple-500/30 px-8">
                      Criar meu primeiro plano
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-purple-500/20 relative z-10">
        <div className="container text-center text-sm text-purple-200/40">
          <p>© 2025 AdsPlanning Pro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
