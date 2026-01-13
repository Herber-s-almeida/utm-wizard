import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, FileText, ArrowLeft, Sparkles, Wrench, Upload } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NewMediaPlanSelector() {
  const navigate = useNavigate();

  const planningModes = [
    {
      id: 'budget',
      title: 'Planejamento a partir do budget',
      description: 'Comece pelo orçamento total, defina objetivos, crie subdivisões (praças, produtos, campanhas), distribua por fases do funil e tempo, gerando linhas de mídia automaticamente.',
      icon: PieChart,
      badge: 'Estratégico',
      badgeVariant: 'default' as const,
      color: 'from-primary/20 to-primary/5',
      borderColor: 'border-primary/30 hover:border-primary/50',
      iconColor: 'text-primary',
      ideal: 'Ideal para planejamento estratégico e visão macro.',
      path: '/media-plans/new/budget',
    },
    {
      id: 'manual',
      title: 'Planejamento linha por linha',
      description: 'Construa o plano ação por ação, com total controle sobre cada decisão tática, adicionando linhas de mídia manualmente com todos os detalhes necessários.',
      icon: FileText,
      badge: 'Operacional',
      badgeVariant: 'secondary' as const,
      color: 'from-accent/20 to-accent/5',
      borderColor: 'border-accent/30 hover:border-accent/50',
      iconColor: 'text-accent',
      ideal: 'Ideal para planos mais operacionais ou incrementais.',
      path: '/media-plans/new/manual',
    },
    {
      id: 'import',
      title: 'Importar arquivo CSV/Excel',
      description: 'Faça upload de uma planilha com os dados do plano. O sistema guiará você para resolver entidades faltantes e criar o plano completo automaticamente.',
      icon: Upload,
      badge: 'Importação',
      badgeVariant: 'outline' as const,
      color: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/50',
      iconColor: 'text-emerald-600',
      ideal: 'Ideal para migrar planos de outras ferramentas.',
      path: '/media-plans/new/import',
    },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Novo Plano de Mídia</h1>
            <p className="text-muted-foreground">
              Escolha como você quer construir seu plano
            </p>
          </div>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {planningModes.map((mode, index) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 border-2 ${mode.borderColor} hover:shadow-lg hover:shadow-primary/5 group h-full`}
                onClick={() => navigate(mode.path)}
              >
                <CardHeader className={`bg-gradient-to-br ${mode.color} rounded-t-lg`}>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-background/80 backdrop-blur-sm ${mode.iconColor}`}>
                      <mode.icon className="w-8 h-8" />
                    </div>
                    <Badge variant={mode.badgeVariant} className="text-xs">
                      {mode.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-4 group-hover:text-primary transition-colors">
                    {mode.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <CardDescription className="text-sm leading-relaxed">
                    {mode.description}
                  </CardDescription>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {mode.id === 'budget' && <Sparkles className="w-4 h-4 text-primary shrink-0" />}
                    {mode.id === 'manual' && <Wrench className="w-4 h-4 text-accent shrink-0" />}
                    {mode.id === 'import' && <Upload className="w-4 h-4 text-emerald-600 shrink-0" />}
                    <span>{mode.ideal}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info Note */}
        <div className="text-center text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border border-border/50">
          <p>
            <strong>Dica:</strong> Independente do modo escolhido, você pode editar a estrutura hierárquica 
            do plano a qualquer momento após a criação. Todos os modos resultam na mesma visualização final.
          </p>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
