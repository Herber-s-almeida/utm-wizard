import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, ArrowRight, Zap, AlertTriangle, Settings2, 
  Target, Layers, FileText, BarChart3, PieChart, Calendar, 
  Tag, CheckCircle2, Users, Building2, GraduationCap, Briefcase, 
  Network, Play
} from 'lucide-react';

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
              Sistema de Planejamento de Mídia
            </motion.div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              <span className="text-white">Planejamento de mídia,</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                do jeito que a estratégia exige.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-purple-100 mb-4 max-w-3xl mx-auto font-medium">
              Crie planos de mídia estruturados, consistentes e editáveis — do orçamento ao criativo — em um único sistema.
            </p>
            
            <p className="text-lg text-purple-200/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              O AdsPlanning Pro organiza decisões táticas, distribuições de orçamento e estruturas criativas sem planilhas, improvisos ou retrabalho.
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
                <Button size="xl" variant="outline" className="gap-2 border-purple-500/40 text-purple-200 hover:bg-purple-500/10 hover:border-purple-400/60 hover:text-white backdrop-blur-sm">
                  <Play className="w-4 h-4" />
                  Ver como funciona
                </Button>
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
                Hoje, um plano de mídia envolve múltiplos canais, fases de funil, formatos criativos, subdivisões por praça, produto e momento de campanha. Planilhas não foram feitas para sustentar essa complexidade — e a falta de estrutura cobra seu preço.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                'Regras implícitas difíceis de manter e explicar',
                'Orçamentos pouco auditáveis',
                'Criativos desconectados da estratégia',
                'Ajustes manuais que geram erro e retrabalho',
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
              O AdsPlanning Pro transforma o planejamento de mídia em um processo lógico, estruturado e reutilizável — da definição estratégica até as linhas táticas do plano.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { icon: Target, text: 'Planejamento guiado por lógica, não por fórmulas' },
              { icon: Layers, text: 'Estrutura única para mídia digital e offline' },
              { icon: Network, text: 'Tudo conectado: plano, linhas, formatos e criativos' },
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
                Comece pelo orçamento total, defina objetivos, subdivida o plano, distribua por fases do funil, tempo e estrutura tática.
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
                Construa o plano ação por ação, com total controle sobre cada decisão tática.
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
            Independentemente do caminho, o resultado é um plano único, consolidado e totalmente editável.
          </motion.p>
        </div>
      </section>

      {/* 5. ESTRUTURA TÁTICA E CRIATIVA — DO PLANO À EXECUÇÃO */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-900/5 to-transparent" />
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-300 text-sm font-medium mb-4">
                <Layers className="w-4 h-4" />
                Estrutura Tática e Criativa
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
                Do plano à execução, sem perder estrutura.
              </h2>
              <p className="text-purple-200/60 text-lg max-w-3xl mx-auto">
                Cada linha do plano conecta fases do funil, meios, veículos, segmentações e criativos. Os formatos e especificações são padronizados e reutilizáveis, enquanto os criativos são criados no contexto certo de cada linha.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: FileText, text: 'Biblioteca de formatos e especificações' },
                { icon: Network, text: 'Criativos vinculados diretamente às linhas do plano' },
                { icon: Layers, text: 'Variações criativas organizadas e rastreáveis' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-[#12121a]/60 border border-violet-500/20 rounded-xl"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-purple-100">{item.text}</span>
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
                { icon: CheckCircle2, text: 'Planos claros, auditáveis e fáceis de ajustar' },
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
                { icon: Building2, text: 'Agências' },
                { icon: GraduationCap, text: 'Universidades e grandes anunciantes' },
                { icon: Briefcase, text: 'Profissionais que precisam justificar decisões' },
                { icon: Network, text: 'Estruturas com múltiplos canais, produtos e intakes' },
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

      {/* 8. ENCERRAMENTO — CHAMADA FINAL */}
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
                  O AdsPlanning Pro organiza a complexidade do planejamento de mídia em um sistema claro, consistente e pronto para evoluir com sua estratégia.
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
