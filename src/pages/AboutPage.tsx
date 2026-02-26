import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ArrowRight,
  Target,
  Layers,
  BarChart3,
  DollarSign,
  Link2,
  Shield,
  Users,
  CheckCircle2,
  Zap,
  ArrowLeft,
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Planejamento Estratégico Estruturado',
    description:
      'Crie planos de mídia completos com definição de orçamento, subdivisões por praça/produto, fases de funil e distribuição temporal — tudo em um fluxo guiado e consistente.',
  },
  {
    icon: Layers,
    title: 'Gestão de Linhas de Mídia',
    description:
      'Cada ação tática é registrada como uma linha de mídia com meio, veículo, canal, formato, período, orçamento e KPIs. Edite, duplique e reorganize sem perder rastreabilidade.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e Performance',
    description:
      'Importe dados de performance e compare com o planejado. Identifique desvios, oportunidades de otimização e tome decisões baseadas em dados reais.',
  },
  {
    icon: Link2,
    title: 'Taxonomia UTM Automatizada',
    description:
      'Gere parâmetros UTM padronizados automaticamente para cada linha de mídia. Garanta rastreabilidade completa no analytics sem inconsistências.',
  },
  {
    icon: DollarSign,
    title: 'Controle Financeiro Completo',
    description:
      'Gerencie documentos, pagamentos, fornecedores e forecast. Acompanhe o pacing de investimento e receba alertas de vencimentos e desvios orçamentários.',
  },
  {
    icon: Shield,
    title: 'Permissões e Colaboração',
    description:
      'Controle quem vê e edita cada parte do sistema. Convide membros com papéis específicos e garanta que cada profissional acesse apenas o que precisa.',
  },
];

const benefits = [
  'Elimine planilhas desconectadas e propensas a erro',
  'Padronize processos entre equipes e clientes',
  'Reduza retrabalho com estruturas reutilizáveis',
  'Tenha visão consolidada de todos os planos ativos',
  'Conecte estratégia, execução criativa e finanças',
  'Mantenha histórico auditável de todas as decisões',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-purple-500/20 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              AdsPlanning Pro
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" className="text-purple-200 hover:text-white gap-2">
                <ArrowLeft className="w-4 h-4" />
                Início
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-purple-500/30">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-6 backdrop-blur-sm">
              <Zap className="w-4 h-4 text-fuchsia-400" />
              Sobre o AdsPlanning Pro
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
              <span className="text-white">O sistema que transforma</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                planejamento de mídia em processo.
              </span>
            </h1>

            <p className="text-xl text-purple-100/80 mb-4 max-w-3xl mx-auto">
              O AdsPlanning Pro é uma plataforma completa para criar, gerenciar e acompanhar planos de mídia — 
              do briefing estratégico ao controle financeiro — com estrutura, consistência e rastreabilidade.
            </p>
            <p className="text-lg text-purple-200/50 max-w-2xl mx-auto">
              Desenvolvido para agências, equipes de marketing e profissionais de mídia que precisam 
              de organização sem sacrificar agilidade.
            </p>
          </motion.div>
        </div>
      </section>

      {/* O que é */}
      <section className="py-16 relative">
        <div className="container relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl font-bold mb-6 text-center text-white">
              O que é o AdsPlanning Pro?
            </h2>
            <div className="bg-[#12121a]/60 border border-purple-500/20 rounded-2xl p-8 text-lg text-purple-100/80 leading-relaxed space-y-4">
              <p>
                O <strong className="text-white">AdsPlanning Pro</strong> é um sistema de gestão de planejamento de mídia 
                que substitui planilhas, documentos dispersos e processos manuais por uma plataforma unificada e estruturada.
              </p>
              <p>
                Ele organiza todo o ciclo de vida de um plano de mídia: definição estratégica, distribuição de orçamento, 
                linhas táticas, gestão de criativos, taxonomia UTM, acompanhamento de performance e controle financeiro 
                — tudo conectado e auditável.
              </p>
              <p>
                O sistema é agnóstico ao tipo de mídia: funciona igualmente para campanhas digitais (Google, Meta, TikTok), 
                TV, rádio, OOH, impresso e eventos. Toda a estrutura é configurável e adaptável à realidade de cada equipe.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 relative">
        <div className="container relative z-10 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl font-bold mb-4 text-white">
              Como funciona?
            </h2>
            <p className="text-lg text-purple-200/60 max-w-3xl mx-auto">
              O AdsPlanning Pro oferece módulos integrados que cobrem cada etapa do planejamento de mídia.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="p-6 bg-[#12121a]/60 border border-purple-500/20 rounded-2xl hover:border-purple-400/40 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2 text-white">{feature.title}</h3>
                <p className="text-sm text-purple-200/60 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Por que escolher */}
      <section className="py-16 relative">
        <div className="container relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl font-bold mb-4 text-white">
                Por que escolher o AdsPlanning Pro?
              </h2>
              <p className="text-lg text-purple-200/60 max-w-2xl mx-auto">
                Profissionais de mídia que adotam o AdsPlanning Pro ganham controle, velocidade e credibilidade.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="flex items-center gap-3 p-4 bg-[#12121a]/60 border border-purple-500/20 rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0" />
                  <span className="text-purple-100">{benefit}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-12 text-center"
            >
              <div className="bg-gradient-to-r from-purple-900/40 to-fuchsia-900/40 border border-purple-500/30 rounded-2xl p-8">
                <Users className="w-10 h-10 text-fuchsia-400 mx-auto mb-4" />
                <h3 className="font-display text-2xl font-bold text-white mb-3">
                  Pronto para organizar seus planos de mídia?
                </h3>
                <p className="text-purple-200/60 mb-6 max-w-xl mx-auto">
                  Crie sua conta gratuita e comece a planejar com estrutura, consistência e controle total.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/auth/register">
                    <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-xl shadow-purple-500/30 px-8">
                      Criar conta gratuita
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="lg" variant="outline" className="gap-2 border-purple-500/40 text-purple-200 hover:bg-purple-500/10 hover:border-purple-400/60 hover:text-white">
                      Já tenho conta
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-purple-500/20 relative z-10">
        <div className="container text-center">
          <p className="text-sm text-purple-200/40">
            © 2026{' '}
            <span className="text-purple-300/60 font-medium">asplanning.pro</span>
            . Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
