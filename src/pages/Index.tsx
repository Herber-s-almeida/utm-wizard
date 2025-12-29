import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ArrowRight, BarChart3, Link as LinkIcon, FileText, Zap } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
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
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[180px]" />
        
        {/* Scanlines effect */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 92, 246, 0.1) 2px, rgba(139, 92, 246, 0.1) 4px)'
          }}
        />
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-purple-500/20 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">MediaPlan</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-purple-200 hover:text-white hover:bg-purple-500/20">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-purple-500/30">
                Começar grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-6 backdrop-blur-sm"
            >
              <Zap className="w-4 h-4 text-fuchsia-400" />
              Gestão de Mídia Simplificada
            </motion.div>
            
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Crie planos de mídia</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                profissionais
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-purple-200/70 mb-8 max-w-2xl mx-auto leading-relaxed">
              Organize suas campanhas, gerencie investimentos e gere parâmetros UTM automaticamente. 
              Tudo em um só lugar, de forma simples e eficiente.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="xl" className="gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-xl shadow-purple-500/30 px-8">
                    Criar minha conta
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/auth">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="xl" variant="outline" className="border-purple-500/40 text-purple-200 hover:bg-purple-500/10 hover:border-purple-400/60 hover:text-white backdrop-blur-sm">
                    Já tenho conta
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
          
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
          <div className="absolute bottom-20 right-20 w-2 h-2 bg-fuchsia-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-40 right-10 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
              Tudo que você precisa
            </h2>
            <p className="text-purple-200/60 text-lg max-w-2xl mx-auto">
              Ferramentas completas para criar e gerenciar seus planos de mídia
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: FileText,
                title: 'Planos Organizados',
                description: 'Crie e organize seus planos de mídia por cliente, campanha e período.',
                color: 'from-purple-500 to-violet-500',
                shadow: 'shadow-purple-500/20'
              },
              {
                icon: BarChart3,
                title: 'Linhas Detalhadas',
                description: 'Defina plataformas, formatos, objetivos e investimentos para cada linha.',
                color: 'from-fuchsia-500 to-pink-500',
                shadow: 'shadow-fuchsia-500/20'
              },
              {
                icon: LinkIcon,
                title: 'UTM Automático',
                description: 'Gere parâmetros UTM automaticamente e copie URLs parametrizadas.',
                color: 'from-violet-500 to-purple-500',
                shadow: 'shadow-violet-500/20'
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative p-6 bg-[#12121a]/80 backdrop-blur-sm rounded-2xl border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg ${feature.shadow} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-white">{feature.title}</h3>
                  <p className="text-purple-200/60">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
                  Pronto para começar?
                </h2>
                <p className="text-purple-200/60 text-lg mb-8">
                  Crie sua conta gratuita e comece a organizar seus planos de mídia agora.
                </p>
                <Link to="/auth">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button size="xl" className="gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-xl shadow-purple-500/30 px-8">
                      Criar conta grátis
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
          <p>© 2025 MediaPlan. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
